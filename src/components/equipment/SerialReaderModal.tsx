/**
 * NAWI TestFlow — Serial Reader Modal
 *
 * Direct interface for capturing real-time digital scale readings
 * over Web Serial (RS-232 / USB) into NAWI test observation forms.
 */

'use client';

import React, { useState } from 'react';
import { useSerialScale } from '@/lib/hooks/useSerialScale';
import { Button } from '@/components/ui/Button';

interface SerialReaderModalProps {
  open: boolean;
  onClose: () => void;
  onCaptureWeight: (value: string, unit: string) => void;
  targetFieldLabel?: string;
  expectedCapacity?: string;
}

export function SerialReaderModal({
  open,
  onClose,
  onCaptureWeight,
  targetFieldLabel = 'Active Observation Reading',
  expectedCapacity = '3000',
}: SerialReaderModalProps) {
  const [baudRate, setBaudRate] = useState<number>(9600);
  const {
    status,
    isSupported,
    isSimulated,
    errorMessage,
    latestReading,
    rawLogs,
    connect,
    disconnect,
    startSimulation,
    clearLogs,
  } = useSerialScale();

  if (!open) return null;

  const handleCapture = () => {
    if (latestReading && latestReading.weight !== null) {
      onCaptureWeight(latestReading.weight.toString(), latestReading.unit);
      disconnect();
      onClose();
    }
  };

  const isListening = status === 'listening';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-gray-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-md shadow-2xl border border-gray-200 overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e3a5f] text-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
                <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
              </svg>
            </div>
            <div>
              <h2 className="text-[14px] font-bold">Direct Scale Ingestion (Web Serial API)</h2>
              <p className="text-[11px] text-blue-100">Capture digital weighing observations without manual transcription errors</p>
            </div>
          </div>
          <button
            onClick={() => {
              disconnect();
              onClose();
            }}
            className="w-7 h-7 rounded flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-[13px]">
          {/* Target field indicator */}
          <div className="flex items-center justify-between p-2.5 bg-blue-50/60 border border-blue-200 rounded-sm">
            <span className="text-gray-600 font-medium">Target Field:</span>
            <span className="font-semibold text-[#1e3a5f]">{targetFieldLabel}</span>
          </div>

          {/* Browser compatibility banner if not supported */}
          {!isSupported && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-sm text-amber-800 text-[12px] flex items-start gap-1.5">
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <path d="M9 2l7 13H2z" />
                <path d="M9 7v3.5" />
                <circle cx="9" cy="13" r="0.5" fill="currentColor" />
              </svg>
              <span><strong>Web Serial API not supported by this browser.</strong> Physical COM ports require Google Chrome, MS Edge, or Brave. You can still use <strong>Simulation Mode</strong> below for testing.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-[12px]">
              {errorMessage}
            </div>
          )}

          {/* Scale LED Digital Display */}
          <div className="bg-gray-950 p-4 rounded-md border-2 border-gray-800 text-center shadow-inner relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono mb-1">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  isListening ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
                }`} />
                {isListening ? (isSimulated ? 'VIRTUAL SCALE STREAM' : 'RS-232 CONNECTED') : 'DISCONNECTED'}
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                latestReading?.isStable ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                {latestReading?.isStable ? 'STABLE [ST]' : 'MOTION [US]'}
              </span>
            </div>

            {/* Big 7-Segment style display */}
            <div className="py-2">
              <div className="text-[38px] sm:text-[46px] font-mono font-bold tracking-wider text-emerald-400 select-none">
                {latestReading?.weight !== null && latestReading?.weight !== undefined
                  ? latestReading.weight.toFixed(3)
                  : '0.000'}
                <span className="text-[20px] ml-2 text-emerald-500 font-normal">
                  {latestReading?.unit || 'g'}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-gray-500 font-mono">
              RAW ASCII: {latestReading?.raw || 'Awaiting continuous data packets...'}
            </div>
          </div>

          {/* Connection Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-[12px] font-medium text-gray-700">Baud Rate:</label>
              <select
                value={baudRate}
                onChange={e => setBaudRate(Number(e.target.value))}
                disabled={isListening}
                className="flex-1 h-[32px] px-2 border border-gray-300 rounded text-[12px] bg-white text-gray-900 disabled:bg-gray-100"
              >
                <option value={4800}>4800 bps</option>
                <option value={9600}>9600 bps (Standard)</option>
                <option value={19200}>19200 bps</option>
                <option value={38400}>38400 bps</option>
                <option value={115200}>115200 bps</option>
              </select>
            </div>

            <div className="flex items-center gap-2 justify-end">
              {!isListening ? (
                <>
                  <button
                    onClick={() => connect({ baudRate })}
                    disabled={!isSupported}
                    className="px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-40 text-white text-[12px] font-medium rounded transition-colors cursor-pointer"
                  >
                    Select COM Port
                  </button>
                  <button
                    onClick={() => startSimulation(parseFloat(expectedCapacity) || 1500.0, 'g')}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[12px] font-medium rounded transition-colors cursor-pointer"
                  >
                    Simulate Scale
                  </button>
                </>
              ) : (
                <button
                  onClick={disconnect}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[12px] font-medium rounded transition-colors cursor-pointer"
                >
                  Disconnect Port
                </button>
              )}
            </div>
          </div>

          {/* Raw stream telemetry log */}
          <div className="border border-gray-200 rounded-sm p-2 bg-gray-50">
            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600 mb-1">
              <span>Serial Telemetry Log (Last 50 packets):</span>
              <button onClick={clearLogs} className="text-[10px] text-gray-400 hover:underline">Clear</button>
            </div>
            <div className="h-[75px] overflow-y-auto font-mono text-[10px] text-gray-600 space-y-0.5 bg-white p-1.5 border border-gray-200 rounded">
              {rawLogs.length === 0 ? (
                <span className="text-gray-400 italic">No packet data received yet</span>
              ) : (
                rawLogs.map((l, i) => (
                  <div key={i} className="truncate">{l}</div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <span className="text-[11px] text-gray-500">
            Supports Mettler, Ohaus, Essae, Sartorius ASCII formats
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                disconnect();
                onClose();
              }}
            >
              Cancel
            </Button>
            <button
              onClick={handleCapture}
              disabled={!latestReading || latestReading.weight === null}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[13px] font-semibold rounded transition-colors cursor-pointer shadow-xs"
            >
              Capture Weight ({latestReading?.weight !== null && latestReading?.weight !== undefined ? `${latestReading.weight} ${latestReading.unit}` : '—'})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
