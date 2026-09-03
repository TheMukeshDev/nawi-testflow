/**
 * NAWI TestFlow — Visual Constants
 *
 * Maps domain types to their visual representations.
 * Single source of truth for status colors, labels, and configurations.
 */

import type {
  TestStatus,
  ComplianceVerdict,
  TestResult,
  InstrumentClass,
  VerificationType,
  UserRole,
  AlertType,
  StatusConfig,
  FilterOption,
} from '@/types';

// ═══════════════════════════════════════════════════════════════
// STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

export const TEST_STATUS_CONFIG: Record<TestStatus, StatusConfig> = {
  'draft': {
    label: 'Draft',
    color: 'gray',
    variant: 'subtle',
  },
  'in-testing': {
    label: 'In Testing',
    color: 'primary',
    variant: 'solid',
    dot: true,
  },
  'observations-complete': {
    label: 'Observations Complete',
    color: 'info',
    variant: 'subtle',
    dot: true,
  },
  'calculations-pending': {
    label: 'Calculations Pending',
    color: 'warning',
    variant: 'subtle',
    dot: true,
  },
  'calculations-complete': {
    label: 'Calculations Complete',
    color: 'success',
    variant: 'subtle',
    dot: true,
  },
  'pending-review': {
    label: 'Pending Review',
    color: 'warning',
    variant: 'solid',
    dot: true,
  },
  'revision-requested': {
    label: 'Revision Requested',
    color: 'danger',
    variant: 'solid',
    dot: true,
  },
  'approved': {
    label: 'Approved',
    color: 'success',
    variant: 'solid',
  },
  'rejected': {
    label: 'Rejected',
    color: 'danger',
    variant: 'solid',
  },
  'completed': {
    label: 'Completed',
    color: 'gray',
    variant: 'outline',
  },
};

export const COMPLIANCE_CONFIG: Record<ComplianceVerdict, StatusConfig> = {
  'compliant': {
    label: 'Compliant',
    color: 'success',
    variant: 'solid',
  },
  'non-compliant': {
    label: 'Non-Compliant',
    color: 'danger',
    variant: 'solid',
  },
  'conditional': {
    label: 'Conditional',
    color: 'warning',
    variant: 'solid',
  },
  'pending': {
    label: 'Pending',
    color: 'gray',
    variant: 'subtle',
  },
  'not-applicable': {
    label: 'N/A',
    color: 'gray',
    variant: 'outline',
  },
};

export const TEST_RESULT_CONFIG: Record<TestResult, StatusConfig> = {
  'pass': {
    label: 'Pass',
    color: 'success',
    variant: 'solid',
  },
  'fail': {
    label: 'Fail',
    color: 'danger',
    variant: 'solid',
  },
  'conditional': {
    label: 'Conditional',
    color: 'warning',
    variant: 'solid',
  },
  'pending': {
    label: 'Pending',
    color: 'gray',
    variant: 'subtle',
  },
};

// ═══════════════════════════════════════════════════════════════
// INSTRUMENT CLASS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

export const INSTRUMENT_CLASS_LABELS: Record<InstrumentClass, string> = {
  'I': 'Class I — Precision',
  'II': 'Class II — High Precision',
  'III': 'Class III — General',
  'IIII': 'Class IIII — Coarse',
  'IIIIL': 'Class III L — Large Capacity',
};

export const VERIFICATION_TYPE_LABELS: Record<VerificationType, string> = {
  'initial': 'Initial Verification',
  'subsequent': 'Subsequent Verification',
  'type-approval': 'Type Approval',
};

// ═══════════════════════════════════════════════════════════════
// ROLE LABELS
// ═══════════════════════════════════════════════════════════════

/**
 * NOTE: These are PROPOSED application roles.
 * See docs/ROLES.md for full documentation.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  'admin': 'Administrator',
  'tester': 'Tester',
  'reviewer': 'Reviewer',
  'viewer': 'Viewer',
};

// ═══════════════════════════════════════════════════════════════
// TEST STATUS LIFECYCLE
// ═══════════════════════════════════════════════════════════════

/** Ordered test statuses for workflow navigation */
export const TEST_STATUS_ORDER: TestStatus[] = [
  'draft',
  'in-testing',
  'observations-complete',
  'calculations-pending',
  'calculations-complete',
  'pending-review',
  'revision-requested',
  'approved',
  'rejected',
  'completed',
];

/** Valid status transitions */
export const VALID_STATUS_TRANSITIONS: Record<TestStatus, TestStatus[]> = {
  'draft': ['in-testing'],
  'in-testing': ['observations-complete', 'draft'],
  'observations-complete': ['calculations-pending'],
  'calculations-pending': ['calculations-complete'],
  'calculations-complete': ['pending-review'],
  'pending-review': ['approved', 'rejected', 'revision-requested'],
  'revision-requested': ['in-testing', 'draft'],
  'approved': ['completed'],
  'rejected': ['draft'],
  'completed': [], // Terminal state
};

// ═══════════════════════════════════════════════════════════════
// FILTER OPTIONS
// ═══════════════════════════════════════════════════════════════

export const TEST_STATUS_FILTERS: FilterOption[] = [
  { label: 'All Tests', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'In Testing', value: 'in-testing' },
  { label: 'Pending Review', value: 'pending-review' },
  { label: 'Completed', value: 'completed' },
];

export const VERIFICATION_TYPE_FILTERS: FilterOption[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Initial Verification', value: 'initial' },
  { label: 'Subsequent Verification', value: 'subsequent' },
  { label: 'Type Approval', value: 'type-approval' },
];

export const INSTRUMENT_CLASS_FILTERS: FilterOption[] = [
  { label: 'All Classes', value: 'all' },
  { label: 'Class I — Precision', value: 'I' },
  { label: 'Class II — High Precision', value: 'II' },
  { label: 'Class III — General', value: 'III' },
  { label: 'Class IIII — Coarse', value: 'IIII' },
  { label: 'Class III L — Large Capacity', value: 'IIIIL' },
];

// ═══════════════════════════════════════════════════════════════
// TEST OBSERVATION TYPES (per OIML R-76)
// ═══════════════════════════════════════════════════════════════

export const OBSERVATION_TYPES: FilterOption[] = [
  { label: 'Repeatability', value: 'repeatability' },
  { label: 'Eccentricity (Off-center)', value: 'eccentricity' },
  { label: 'Linearity', value: 'linearity' },
  { label: 'Discrimination', value: 'discrimination' },
  { label: 'Stability', value: 'stability' },
  { label: 'Temperature Effect', value: 'temperature-effect' },
];

// ═══════════════════════════════════════════════════════════════
// ALERT TYPE STYLES
// ═══════════════════════════════════════════════════════════════

export const ALERT_STYLES: Record<AlertType, {
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: string;
}> = {
  'info': {
    bgColor: 'bg-info-50',
    borderColor: 'border-info-400',
    textColor: 'text-info-800',
    icon: 'ℹ',
  },
  'success': {
    bgColor: 'bg-success-50',
    borderColor: 'border-success-400',
    textColor: 'text-success-800',
    icon: '✓',
  },
  'warning': {
    bgColor: 'bg-warning-50',
    borderColor: 'border-warning-400',
    textColor: 'text-warning-800',
    icon: '⚠',
  },
  'error': {
    bgColor: 'bg-danger-50',
    borderColor: 'border-danger-400',
    textColor: 'text-danger-800',
    icon: '✕',
  },
};

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

export const EMPTY_STATES = {
  'no-tests': {
    title: 'No Tests Found',
    description: 'There are no test records matching your current filters.',
    action: { label: 'Create New Test', href: '/tests/new' },
  },
  'no-instruments': {
    title: 'No Instruments Registered',
    description: 'Register an instrument before creating test records.',
    action: { label: 'Register Instrument', href: '/instruments/new' },
  },
  'no-laboratories': {
    title: 'No Laboratories Configured',
    description: 'Add at least one laboratory to begin test record management.',
    action: { label: 'Add Laboratory', href: '/laboratories/new' },
  },
  'no-equipment': {
    title: 'No Equipment Registered',
    description: 'Register calibration weights and test equipment.',
    action: { label: 'Register Equipment', href: '/equipment/new' },
  },
  'no-reports': {
    title: 'No Reports Generated',
    description: 'Reports are generated from completed and approved tests.',
    action: { label: 'View Completed Tests', href: '/tests?status=completed' },
  },
  'no-audit-entries': {
    title: 'No Audit Entries',
    description: 'Audit trail entries will appear as actions are performed.',
    action: undefined,
  },
  'search-no-results': {
    title: 'No Results',
    description: 'Your search did not match any records. Try adjusting your search terms or filters.',
    action: { label: 'Clear Filters', href: undefined },
  },
} as const;
