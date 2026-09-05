/**
 * NAWI Sahayak — Web Serial Scale Hook
 *
 * Direct communication hook with digital weighing scales over RS-232 / USB
 * using the W3C Web Serial API (navigator.serial).
 *
 * Features:
 * - Configurable baud rate, data bits, parity, stop bits
 * - Auto-decoding of ASCII stream (Mettler Toledo, Ohaus, Essae, Sartorius, standard protocols)
 * - Extraction of stable numeric weight readings and units
 * - Virtual simulation mode for development/demonstrations without serial hardware
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface SerialPortConfig {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
}

export interface ScaleReading {
  raw: string;
  weight: number | null;
  unit: string;
  isStable: boolean;
  timestamp: number;
}

export type SerialStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected' | 'listening' | 'error';

export function useSerialScale() {
  const [status, setStatus] = useState<SerialStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestReading, setLatestReading] = useState<ScaleReading | null>(null);
  const [rawLogs, setRawLogs] = useState<string[]>([]);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const keepReadingRef = useRef<boolean>(false);
  const simIntervalRef = useRef<any>(null);

  // Check browser Web Serial support
  const isSupported = typeof window !== 'undefined' && 'serial' in navigator;

  useEffect(() => {
    if (!isSupported) {
      setStatus('unsupported');
    }
  }, [isSupported]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  /**
   * Parse continuous ASCII stream from weighing indicators:
   * Examples:
   * - "ST,GS,+  12.500 kg" -> 12.500, kg, isStable: true
   * - "US,GS,+  12.510 kg" -> 12.510, kg, isStable: false
   * - "  1500.00 g "        -> 1500.00, g, isStable: true
   * - "WT: 3000.01g OK"    -> 3000.01, g, isStable: true
   */
  const parseScaleLine = useCallback((line: string): ScaleReading => {
    const clean = line.trim();
    const isStable = !clean.startsWith('US') && !clean.includes('UNSTABLE');

    // Extract unit (kg, g, mg, lb)
    let unit = 'g';
    if (/kg/i.test(clean)) unit = 'kg';
    else if (/mg/i.test(clean)) unit = 'mg';
    else if (/lb/i.test(clean)) unit = 'lb';

    // Extract first valid floating point number
    const match = clean.match(/[-+]?\s*(\d+(\.\d+)?)/);
    let weight: number | null = null;
    if (match) {
      weight = parseFloat(match[1]);
      if (clean.includes('-')) weight = -weight;
    }

    return {
      raw: clean,
      weight,
      unit,
      isStable,
      timestamp: Date.now(),
    };
  }, []);

  /**
   * Connect to physical serial port via user prompt
   */
  const connect = useCallback(async (config: SerialPortConfig = { baudRate: 9600 }) => {
    if (!isSupported) {
      setErrorMessage('Web Serial API is not supported in this browser. Use Chrome, Edge, or enable Simulation Mode.');
      setStatus('unsupported');
      return false;
    }

    try {
      setStatus('connecting');
      setErrorMessage(null);

      // Prompt user to select port
      const nav: any = navigator;
      const port = await nav.serial.requestPort();
      await port.open({
        baudRate: config.baudRate,
        dataBits: config.dataBits || 8,
        stopBits: config.stopBits || 1,
        parity: config.parity || 'none',
      });

      portRef.current = port;
      setStatus('connected');
      setIsSimulated(false);

      // Start continuous stream reading
      startReadingStream(port);
      return true;
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        setStatus('disconnected');
        return false;
      }
      console.error('[WebSerial] Connection failed:', err);
      setErrorMessage(err.message || 'Failed to open serial port. Ensure port is not in use.');
      setStatus('error');
      return false;
    }
  }, [isSupported]);

  /**
   * Continuous stream reader
   */
  const startReadingStream = async (port: any) => {
    keepReadingRef.current = true;
    setStatus('listening');

    try {
      const textDecoder = new (window as any).TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      let buffer = '';

      while (keepReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split(/[\r\n]+/);
          // Keep incomplete trailing slice in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              const parsed = parseScaleLine(line);
              setLatestReading(parsed);
              setRawLogs(prev => [line.trim(), ...prev.slice(0, 49)]);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('[WebSerial] Stream read error:', err);
      setErrorMessage(err.message || 'Serial stream interrupted.');
      setStatus('error');
    }
  };

  /**
   * Start simulated scale stream (for offline testing or presentation without hardware)
   */
  const startSimulation = useCallback((baseWeight = 1500.00, unit = 'g') => {
    disconnect();
    setIsSimulated(true);
    setStatus('listening');
    setErrorMessage(null);

    let counter = 0;
    simIntervalRef.current = setInterval(() => {
      counter++;
      // Jitter weight slightly by ±0.002 to simulate real load cell micro-drift
      const jitter = (Math.random() - 0.5) * 0.004;
      const val = (baseWeight + jitter).toFixed(3);
      const isStable = counter % 6 !== 0;
      const raw = `${isStable ? 'ST' : 'US'},GS,+  ${val} ${unit}`;

      const reading: ScaleReading = {
        raw,
        weight: parseFloat(val),
        unit,
        isStable,
        timestamp: Date.now(),
      };

      setLatestReading(reading);
      setRawLogs(prev => [raw, ...prev.slice(0, 49)]);
    }, 450);
  }, []);

  /**
   * Disconnect port and stop stream
   */
  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;

    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch {}
      readerRef.current = null;
    }

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch {}
      portRef.current = null;
    }

    setIsSimulated(false);
    setStatus('disconnected');
  }, []);

  return {
    status,
    isSupported,
    isSimulated,
    errorMessage,
    latestReading,
    rawLogs,
    connect,
    disconnect,
    startSimulation,
    clearLogs: () => setRawLogs([]),
  };
}
