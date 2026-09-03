/**
 * NAWI TestFlow — Workflow & Notification Store
 *
 * Client-side persistent store for test reports, generated reports,
 * and role-targeted notifications across the application lifecycle.
 */

'use client';

import type { TestStatus, ComplianceVerdict, UserRole } from '@/types';

export interface WorkflowNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'submission' | 'approval' | 'rejection' | 'alert';
  targetRole: UserRole | 'all';
  testId?: string;
  testNumber?: string;
  senderName?: string;
}

export interface StoredTest {
  id: string;
  testNumber: string;
  instrumentSerial: string;
  instrumentModel: string;
  instrumentManufacturer?: string;
  instrumentClass: string;
  maxCapacity: string;
  maxCapacityUnit: string;
  scaleInterval: string;
  scaleIntervalUnit: string;
  verificationScaleInterval?: string;
  softwareVersion?: string;
  laboratory: string;
  verificationType: string;
  status: TestStatus;
  complianceResult: ComplianceVerdict;
  complianceNotes?: string;
  technician: string;
  reviewer?: string;
  temperature?: string;
  humidity?: string;
  airPressure?: string;
  testLocation?: string;
  testDate: string;
  observations: {
    testName: string;
    testCode: string;
    readings: string[];
    mean: string;
    stddev: string;
    verdict: 'PASS' | 'FAIL';
    unit: string;
    notes?: string;
  }[];
  createdAt: string;
  lastUpdated: string;
  reviewNotes?: string;
}

export interface StoredReport {
  id: string;
  reportNumber: string;
  testId: string;
  testNumber: string;
  instrumentSerial: string;
  laboratory: string;
  format: 'PDF' | 'DOCX' | 'BOTH';
  generatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  version: number;
}

const STORAGE_KEYS = {
  TESTS: 'nawi_workflow_tests_v1',
  REPORTS: 'nawi_workflow_reports_v1',
  NOTIFICATIONS: 'nawi_workflow_notifications_v1',
};

const SEED_TESTS: StoredTest[] = [
  {
    id: 'TR-001',
    testNumber: 'TR-2026-001',
    instrumentSerial: 'ABC-2026-EL-00412',
    instrumentModel: 'ABC-3000 Electronic Balance',
    instrumentManufacturer: 'ABC Instruments Pvt. Ltd.',
    instrumentClass: 'III',
    maxCapacity: '3000',
    maxCapacityUnit: 'g',
    scaleInterval: '0.01',
    scaleIntervalUnit: 'g',
    verificationScaleInterval: '0.1',
    softwareVersion: 'v2.4.1',
    laboratory: 'CMTL-PY-01',
    verificationType: 'Initial',
    status: 'pending-review',
    complianceResult: 'compliant',
    technician: 'Priya Mehta',
    temperature: '22.5',
    humidity: '48',
    airPressure: '1013',
    testLocation: 'Room 204, Precision Measurement Wing',
    testDate: '2026-09-02',
    observations: [
      {
        testName: 'Repeatability',
        testCode: 'RPT',
        readings: ['3000.002', '3000.001', '3000.003', '3000.002', '3000.001'],
        mean: '3000.0018',
        stddev: '0.0008',
        verdict: 'PASS',
        unit: 'g',
        notes: 'Max capacity test point',
      },
      {
        testName: 'Eccentricity',
        testCode: 'ECC',
        readings: ['3000.001', '3000.005', '3000.003', '3000.008', '3000.002'],
        mean: '3000.0038',
        stddev: '0.0028',
        verdict: 'PASS',
        unit: 'g',
        notes: 'Center, Front, Back, Left, Right',
      },
    ],
    createdAt: '2026-09-01T08:00:00Z',
    lastUpdated: '2026-09-02T14:30:00Z',
  },
  {
    id: 'TR-002',
    testNumber: 'TR-2026-002',
    instrumentSerial: 'PWS-2025-PR-00089',
    instrumentModel: 'PWS Precision Scale 220',
    instrumentManufacturer: 'Precision Weighing Systems Ltd.',
    instrumentClass: 'II',
    maxCapacity: '220',
    maxCapacityUnit: 'g',
    scaleInterval: '0.001',
    scaleIntervalUnit: 'g',
    verificationScaleInterval: '0.01',
    laboratory: 'CMTL-PY-01',
    verificationType: 'Subsequent',
    status: 'in-testing',
    complianceResult: 'pending',
    technician: 'Priya Mehta',
    temperature: '21.8',
    humidity: '45',
    airPressure: '1015',
    testLocation: 'Cleanroom Lab 2',
    testDate: '2026-09-01',
    observations: [],
    createdAt: '2026-09-01T10:15:00Z',
    lastUpdated: '2026-09-02T11:15:00Z',
  },
  {
    id: 'TR-003',
    testNumber: 'TR-2026-003',
    instrumentSerial: 'ABC-2025-EL-00589',
    instrumentModel: 'ABC-220 Analytical Balance',
    instrumentManufacturer: 'ABC Instruments Pvt. Ltd.',
    instrumentClass: 'II',
    maxCapacity: '220',
    maxCapacityUnit: 'g',
    scaleInterval: '0.0001',
    scaleIntervalUnit: 'g',
    verificationScaleInterval: '0.001',
    softwareVersion: 'v1.9.0',
    laboratory: 'CMTL-PY-01',
    verificationType: 'Initial',
    status: 'completed',
    complianceResult: 'compliant',
    technician: 'Rajesh Nair',
    reviewer: 'Dr. K. Sharma',
    temperature: '20.5',
    humidity: '46',
    airPressure: '1012',
    testLocation: 'Room 101, Metrology Division',
    testDate: '2026-08-28',
    observations: [
      {
        testName: 'Repeatability',
        testCode: 'RPT',
        readings: ['200.0001', '200.0002', '200.0001', '200.0000', '200.0001'],
        mean: '200.0001',
        stddev: '0.00007',
        verdict: 'PASS',
        unit: 'g',
      },
    ],
    createdAt: '2026-08-28T09:00:00Z',
    lastUpdated: '2026-09-01T10:00:00Z',
    reviewNotes: 'All readings are within OIML R-76 MPE limits. Verified and approved.',
  },
  {
    id: 'TR-004',
    testNumber: 'TR-2026-004',
    instrumentSerial: 'MST-2024-EL-00247',
    instrumentModel: 'MetroScale 2000 Industrial',
    instrumentManufacturer: 'Metro Industrial Scales Co.',
    instrumentClass: 'III',
    maxCapacity: '2000',
    maxCapacityUnit: 'kg',
    scaleInterval: '0.5',
    scaleIntervalUnit: 'kg',
    verificationScaleInterval: '0.5',
    laboratory: 'PITL-PR-02',
    verificationType: 'Initial',
    status: 'completed',
    complianceResult: 'non-compliant',
    technician: 'Rajesh Nair',
    reviewer: 'Dr. K. Sharma',
    temperature: '25.0',
    humidity: '55',
    airPressure: '1010',
    testLocation: 'Bay 4, Heavy Testing Area',
    testDate: '2026-08-27',
    observations: [
      {
        testName: 'Eccentricity',
        testCode: 'ECC',
        readings: ['1000.5', '1002.5', '1001.0', '1003.5', '1000.5'],
        mean: '1001.6',
        stddev: '1.34',
        verdict: 'FAIL',
        unit: 'kg',
        notes: 'Exceeded maximum permissible error of 1.0 kg at position 4',
      },
    ],
    createdAt: '2026-08-27T14:00:00Z',
    lastUpdated: '2026-08-31T15:30:00Z',
    reviewNotes: 'Failed eccentricity test on corner point 4. Re-calibration recommended.',
  },
];

const SEED_REPORTS: StoredReport[] = [
  {
    id: 'RPT-1',
    reportNumber: 'RPT-2026-001230',
    testId: 'TR-003',
    testNumber: 'TR-2026-003',
    instrumentSerial: 'ABC-2025-EL-00589',
    laboratory: 'CMTL-PY-01',
    format: 'PDF',
    generatedAt: '2026-09-01T10:30:00Z',
    approvedAt: '2026-09-01T11:00:00Z',
    approvedBy: 'Dr. K. Sharma',
    version: 1,
  },
  {
    id: 'RPT-2',
    reportNumber: 'RPT-2026-001229',
    testId: 'TR-004',
    testNumber: 'TR-2026-004',
    instrumentSerial: 'MST-2024-EL-00247',
    laboratory: 'PITL-PR-02',
    format: 'PDF',
    generatedAt: '2026-08-31T16:00:00Z',
    approvedAt: '2026-08-31T16:45:00Z',
    approvedBy: 'Dr. K. Sharma',
    version: 1,
  },
];

const SEED_NOTIFICATIONS: WorkflowNotification[] = [
  {
    id: 'notif-1',
    title: 'New Test Report Submitted',
    message: 'Tester Priya Mehta submitted TR-2026-001 (ABC-3000) for review.',
    timestamp: '2026-09-02T14:30:00Z',
    read: false,
    type: 'submission',
    targetRole: 'reviewer',
    testId: 'TR-001',
    testNumber: 'TR-2026-001',
    senderName: 'Priya Mehta',
  },
  {
    id: 'notif-2',
    title: 'Report Approved & Finalized',
    message: 'Dr. K. Sharma approved TR-2026-003. Report RPT-2026-001230 is ready to download.',
    timestamp: '2026-09-01T11:00:00Z',
    read: true,
    type: 'approval',
    targetRole: 'tester',
    testId: 'TR-003',
    testNumber: 'TR-2026-003',
    senderName: 'Dr. K. Sharma',
  },
];

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function loadData<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[WorkflowStore] Error loading ${key}:`, err);
    return fallback;
  }
}

function saveData<T>(key: string, data: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('nawi_workflow_updated', { detail: { key } }));
  } catch (err) {
    console.warn(`[WorkflowStore] Error saving ${key}:`, err);
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC WORKFLOW STORE API
// ═══════════════════════════════════════════════════════════════

export const workflowStore = {
  // Tests
  getTests(): StoredTest[] {
    return loadData<StoredTest[]>(STORAGE_KEYS.TESTS, SEED_TESTS);
  },

  getTest(id: string): StoredTest | undefined {
    const tests = this.getTests();
    return tests.find(t => t.id === id || t.testNumber === id);
  },

  submitNewTest(input: {
    instrument: {
      manufacturer: string;
      model: string;
      serialNumber: string;
      instrumentClass: string;
      maxCapacity: string;
      maxCapacityUnit: string;
      scaleInterval: string;
      scaleIntervalUnit: string;
      verificationScaleInterval?: string;
      softwareVersion?: string;
    };
    conditions: {
      temperature: string;
      humidity: string;
      airPressure: string;
      testLocation: string;
      testDate: string;
      laboratoryName: string;
    };
    observations: {
      testName: string;
      testCode: string;
      readings: string[];
      mean: string;
      stddev: string;
      verdict: 'PASS' | 'FAIL';
      unit: string;
      notes?: string;
    }[];
    technicianName?: string;
  }): StoredTest {
    const tests = this.getTests();
    const testCount = tests.length + 1;
    const padded = String(testCount).padStart(3, '0');
    const testNumber = `TR-2026-${padded}`;
    const testId = `TR-${padded}`;

    const hasFailure = input.observations.some(o => o.verdict === 'FAIL');
    const complianceResult: ComplianceVerdict = hasFailure ? 'non-compliant' : 'compliant';

    const newTest: StoredTest = {
      id: testId,
      testNumber,
      instrumentSerial: input.instrument.serialNumber || `SN-2026-${padded}`,
      instrumentModel: input.instrument.model || 'Standard Digital Balance',
      instrumentManufacturer: input.instrument.manufacturer || 'Metrology Standards Corp',
      instrumentClass: input.instrument.instrumentClass || 'III',
      maxCapacity: input.instrument.maxCapacity || '3000',
      maxCapacityUnit: input.instrument.maxCapacityUnit || 'g',
      scaleInterval: input.instrument.scaleInterval || '0.01',
      scaleIntervalUnit: input.instrument.scaleIntervalUnit || 'g',
      verificationScaleInterval: input.instrument.verificationScaleInterval || '0.1',
      softwareVersion: input.instrument.softwareVersion || 'v1.0.0',
      laboratory: input.conditions.laboratoryName || 'CMTL-PY-01',
      verificationType: 'Initial',
      status: 'pending-review',
      complianceResult,
      technician: input.technicianName || 'Priya Mehta',
      temperature: input.conditions.temperature || '22.0',
      humidity: input.conditions.humidity || '50',
      airPressure: input.conditions.airPressure || '1013',
      testLocation: input.conditions.testLocation || 'Main Laboratory',
      testDate: input.conditions.testDate || new Date().toISOString().slice(0, 10),
      observations: input.observations,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    tests.unshift(newTest);
    saveData(STORAGE_KEYS.TESTS, tests);

    // Notify Reviewer role
    this.addNotification({
      title: 'New Test Awaiting Approval',
      message: `${newTest.technician} submitted ${newTest.testNumber} (${newTest.instrumentModel}) for verification & approval.`,
      type: 'submission',
      targetRole: 'reviewer',
      testId: newTest.id,
      testNumber: newTest.testNumber,
      senderName: newTest.technician,
    });

    return newTest;
  },

  approveTest(testId: string, reviewerName = 'Dr. K. Sharma', notes = 'Verified per OIML R-76. Compliant and approved.'): StoredTest | undefined {
    const tests = this.getTests();
    const index = tests.findIndex(t => t.id === testId || t.testNumber === testId);
    if (index === -1) return undefined;

    const test = tests[index];
    test.status = 'completed';
    test.reviewer = reviewerName;
    test.reviewNotes = notes;
    test.lastUpdated = new Date().toISOString();
    tests[index] = test;
    saveData(STORAGE_KEYS.TESTS, tests);

    // Create generated report entry
    const reports = this.getReports();
    const reportNumber = `RPT-2026-00${String(reports.length + 1231).padStart(4, '0')}`;
    const newReport: StoredReport = {
      id: `RPT-${reports.length + 1}`,
      reportNumber,
      testId: test.id,
      testNumber: test.testNumber,
      instrumentSerial: test.instrumentSerial,
      laboratory: test.laboratory,
      format: 'PDF',
      generatedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: reviewerName,
      version: 1,
    };
    reports.unshift(newReport);
    saveData(STORAGE_KEYS.REPORTS, reports);

    // Notify Tester
    this.addNotification({
      title: 'Test Approved by Reviewer',
      message: `${reviewerName} approved ${test.testNumber}. Finalized report ${reportNumber} is now ready to view & download.`,
      type: 'approval',
      targetRole: 'tester',
      testId: test.id,
      testNumber: test.testNumber,
      senderName: reviewerName,
    });

    return test;
  },

  rejectTest(testId: string, reviewerName = 'Dr. K. Sharma', reason = 'Discrepancy observed in test readings.'): StoredTest | undefined {
    const tests = this.getTests();
    const index = tests.findIndex(t => t.id === testId || t.testNumber === testId);
    if (index === -1) return undefined;

    const test = tests[index];
    test.status = 'revision-requested';
    test.reviewer = reviewerName;
    test.reviewNotes = reason;
    test.lastUpdated = new Date().toISOString();
    tests[index] = test;
    saveData(STORAGE_KEYS.TESTS, tests);

    // Notify Tester
    this.addNotification({
      title: 'Revision Requested by Reviewer',
      message: `${reviewerName} requested revision for ${test.testNumber}: "${reason}".`,
      type: 'rejection',
      targetRole: 'tester',
      testId: test.id,
      testNumber: test.testNumber,
      senderName: reviewerName,
    });

    return test;
  },

  // Reports
  getReports(): StoredReport[] {
    return loadData<StoredReport[]>(STORAGE_KEYS.REPORTS, SEED_REPORTS);
  },

  getReportByTestId(testId: string): StoredReport | undefined {
    const reports = this.getReports();
    return reports.find(r => r.testId === testId || r.testNumber === testId);
  },

  // Notifications
  getNotifications(role?: UserRole): WorkflowNotification[] {
    const all = loadData<WorkflowNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    if (!role || role === 'admin') return all;
    return all.filter(n => n.targetRole === role || n.targetRole === 'all');
  },

  addNotification(n: Omit<WorkflowNotification, 'id' | 'timestamp' | 'read'>): WorkflowNotification {
    const notifs = loadData<WorkflowNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    const newNotif: WorkflowNotification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    notifs.unshift(newNotif);
    saveData(STORAGE_KEYS.NOTIFICATIONS, notifs);
    return newNotif;
  },

  markNotificationAsRead(id: string): void {
    const notifs = loadData<WorkflowNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    const item = notifs.find(n => n.id === id);
    if (item) {
      item.read = true;
      saveData(STORAGE_KEYS.NOTIFICATIONS, notifs);
    }
  },

  markAllAsRead(role?: UserRole): void {
    const notifs = loadData<WorkflowNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    notifs.forEach(n => {
      if (!role || role === 'admin' || n.targetRole === role || n.targetRole === 'all') {
        n.read = true;
      }
    });
    saveData(STORAGE_KEYS.NOTIFICATIONS, notifs);
  },

  subscribe(callback: () => void): () => void {
    if (!isBrowser()) return () => {};
    const listener = () => callback();
    window.addEventListener('nawi_workflow_updated', listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener('nawi_workflow_updated', listener);
      window.removeEventListener('storage', listener);
    };
  },
};
