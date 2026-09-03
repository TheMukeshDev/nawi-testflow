/**
 * NAWI TestFlow — Core Domain Types
 *
 * Based on OIML R-76 requirements for Non-Automatic Weighing Instruments.
 * These types define the domain model and are the source of truth
 * for the entire application's data layer.
 */

// ═══════════════════════════════════════════════════════════════
// ENUMERATIONS
// ═══════════════════════════════════════════════════════════════

/** Test lifecycle states — matches laboratory workflow exactly */
export type TestStatus =
  | 'draft'
  | 'in-testing'
  | 'observations-complete'
  | 'calculations-pending'
  | 'calculations-complete'
  | 'pending-review'
  | 'revision-requested'
  | 'approved'
  | 'rejected'
  | 'completed';

/** Compliance verdict per OIML R-76 */
export type ComplianceVerdict =
  | 'compliant'
  | 'non-compliant'
  | 'conditional'
  | 'pending'
  | 'not-applicable';

/** Test result categories */
export type TestResult = 'pass' | 'fail' | 'conditional' | 'pending';

/** Weighing instrument categories per OIML R-76 */
export type InstrumentClass =
  | 'I'
  | 'II'
  | 'III'
  | 'IIII'
  | 'IIIIL';

/** Verification types */
export type VerificationType =
  | 'initial'
  | 'subsequent'
  | 'type-approval';

/** Mass unit standard in weighing */
export type MassUnit = 'mg' | 'g' | 'kg' | 't';

/** Environmental condition status */
export type ConditionStatus = 'normal' | 'out-of-range' | 'not-recorded';

/**
 * User roles in the system.
 *
 * NOTE: These are PROPOSED application roles for our implementation.
 * They are NOT specified by the SIH Problem Statement 26035.
 * The PS requires "secure user access with role-based permissions"
 * but does not prescribe specific role names.
 */
export type UserRole = 'admin' | 'tester' | 'reviewer' | 'viewer';

/** Audit action types */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'comment'
  | 'status-change'
  | 'export'
  | 'login'
  | 'logout';

/** Report format types */
export type ReportFormat = 'pdf' | 'xlsx' | 'both';

// ═══════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════

/**
 * Manufacturer information.
 * Captures identification and contact details for instrument manufacturers.
 */
export interface Manufacturer {
  id: string;
  name: string;
  country: string;
  address?: string;
  website?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Instrument model specifications.
 * Technical parameters defining an instrument model.
 */
export interface InstrumentModel {
  id: string;
  manufacturerId: string;
  manufacturer?: Manufacturer;
  modelName: string;
  modelNumber: string;
  instrumentType: 'mechanical' | 'electronic' | 'electromechanical';
  instrumentClass?: InstrumentClass;
  accuracyClass?: string;
  maxCapacity: number;
  maxCapacityUnit: MassUnit;
  minCapacity: number;
  minCapacityUnit: MassUnit;
  scaleInterval: number;              // Scale interval (d)
  scaleIntervalUnit: MassUnit;
  verificationScaleInterval?: number; // Verification scale interval (e)
  verificationScaleIntervalUnit?: MassUnit;
  numberOfVerificationIntervals?: number; // n = Max/e
  softwareVersion?: string;
  firmwareVersion?: string;
  powerSupply?: string;
  operatingTempMin?: number;
  operatingTempMax?: number;
  technicalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Physical instrument in a laboratory.
 * Links a specific instrument (with serial number) to its model and laboratory.
 */
export interface Instrument {
  id: string;
  modelId: string;
  model?: InstrumentModel;
  serialNumber: string;
  laboratoryId: string;
  laboratory?: Laboratory;
  dateReceived: string;
  lastCalibration?: string;
  nextCalibration?: string;
  condition: 'good' | 'needs-repair' | 'out-of-service';
  assetTag?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/**
 * Laboratory facility.
 * Represents a testing laboratory with accreditation details.
 */
export interface Laboratory {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  accreditationBody?: string;
  accreditationNumber?: string;
  accreditationValidUntil?: string;
  contactPerson: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Equipment used during testing.
 * Calibration weights, standards, and test accessories.
 */
export interface Equipment {
  id: string;
  equipmentId: string;
  name: string;
  type: 'standard-weight' | 'calibrated-weight' | 'accessory' | 'tool' | 'measurement-device';
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  calibrationDate?: string;
  calibrationValidUntil?: string;
  calibrationCertificateRef?: string;
  calibrationStatus: 'valid' | 'expired' | 'due-soon' | 'not-calibrated';
  laboratoryId: string;
  laboratory?: Laboratory;
  nominalValue?: number;
  nominalValueUnit?: MassUnit;
  tolerance?: number;
  toleranceUnit?: MassUnit;
  condition: 'good' | 'needs-repair' | 'out-of-service';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Test conditions recorded during testing.
 * Stores observed conditions separately from calculated results.
 */
export interface TestConditions {
  id: string;
  testReportId: string;
  
  // Environmental conditions
  temperature: number;
  temperatureUnit: '°C';
  humidity: number;
  humidityUnit: '%RH';
  airPressure?: number;
  airPressureUnit?: 'hPa';
  
  // Status indicators (observed vs acceptable)
  temperatureStatus: ConditionStatus;
  humidityStatus: ConditionStatus;
  airPressureStatus: ConditionStatus;
  
  // Test location
  testLocation: string;
  testLocationDetail?: string;
  
  // Laboratory identification
  laboratoryId: string;
  laboratory?: Laboratory;
  
  // Test date/time
  testDate: string;
  testStartTime: string;
  testEndTime?: string;
  
  // Recording metadata
  recordedAt: string;
  recordedById: string;
  recordedByName: string;
  
  // Notes
  notes?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/** Individual test observation */
export interface TestObservation {
  id: string;
  testId: string;
  observationType: string;   // e.g., 'repeatability', 'eccentricity', 'linearity'
  testPointLabel: string;    // e.g., '0.1e', '0.5e', '1e', 'Max'
  testPointValue: number;    // Theoretical/marked value
  unit: MassUnit;
  measuredValues: number[];  // Raw measured values
  calculatedMean?: number;
  calculatedStdDev?: number;
  calculatedDeviation?: number;
  calculatedError?: number;
  maxPermissibleError?: number;
  verdict?: TestResult;
  notes?: string;
}

/** A complete test record */
export interface Test {
  id: string;
  testNumber: string;        // Generated: e.g., "TST-2026-001234"
  status: TestStatus;
  instrumentId: string;
  instrument?: Instrument;
  laboratoryId: string;
  laboratory?: Laboratory;
  verificationType: VerificationType;
  testStandard: string;      // e.g., "OIML R-76"
  testStandardEdition: string; // e.g., "2009 (EN)"
  testConditions?: TestConditions;
  observations: TestObservation[];
  complianceResult?: ComplianceVerdict;
  complianceNotes?: string;
  assignedTechnicianId: string;
  assignedReviewerId?: string;
  attachments: Attachment[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  submittedAt?: string;
  reviewedAt?: string;
  completedAt?: string;
}

/** File attachment */
export interface Attachment {
  id: string;
  testId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: 'photo' | 'certificate' | 'calibration' | 'observation' | 'report' | 'other';
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
}

/** Audit log entry */
export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: 'test' | 'instrument' | 'laboratory' | 'equipment' | 'report' | 'user';
  entityId: string;
  entityLabel: string;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  ipAddress?: string;
  notes?: string;
}

/** Generated report */
export interface Report {
  id: string;
  testId: string;
  test?: Test;
  reportNumber: string;      // Generated: e.g., "RPT-2026-001234"
  format: ReportFormat;
  generatedAt: string;
  generatedBy: string;
  approvedAt?: string;
  approvedBy?: string;
  filePath: string;
  checksum: string;
  version: number;
}

/** User account */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  laboratoryId?: string;
  laboratory?: Laboratory;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// UI-SPECIFIC TYPES
// ═══════════════════════════════════════════════════════════════

/** Status badge configuration */
export interface StatusConfig {
  label: string;
  color: 'gray' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  variant: 'solid' | 'outline' | 'subtle';
  dot?: boolean;
}

/** Table column definition */
export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: number | string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => React.ReactNode;
  accessor?: (row: T) => unknown;
}

/** Breadcrumb item */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

/** Page header configuration */
export interface PageHeaderConfig {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

/** Filter option for dropdowns */
export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

/** Pagination state */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

/** Sort state */
export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

/** Alert/notification type */
export type AlertType = 'info' | 'success' | 'warning' | 'error';
