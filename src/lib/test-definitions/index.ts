/**
 * NAWI Sahayak — Test Definition Configuration Layer
 *
 * This module defines the structure and configuration for all tests
 * available in the system. Tests are configured here, not hardcoded
 * in React components.
 *
 * IMPORTANT: This defines test STRUCTURE and UI configuration only.
 * Actual OIML R-76 acceptance limits and compliance rules are stored
 * in the database (compliance_rules table) and loaded separately.
 *
 * Design Principles:
 * - Tests are defined as data, not code
 * - UI components render based on test definitions
 * - Adding a new test requires only adding a definition here
 * - No OIML acceptance limits are hardcoded
 */

import type { MassUnit, InstrumentClass } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/** Data type for input fields */
export type FieldDataType = 'number' | 'text' | 'date' | 'select' | 'calculated';

/** Source of a calculated value */
export type CalculationSource = 'mean' | 'stddev' | 'deviation' | 'error' | 'custom';

/** Test applicability conditions */
export interface TestApplicability {
  /** Instrument classes this test applies to (empty = all) */
  instrumentClasses?: InstrumentClass[];
  /** Instrument types this test applies to (empty = all) */
  instrumentTypes?: ('mechanical' | 'electronic' | 'electromechanical')[];
  /** Verification types this test applies to (empty = all) */
  verificationTypes?: ('initial' | 'subsequent' | 'type-approval')[];
  /** Minimum number of verification scale divisions */
  minVerificationDivisions?: number;
  /** Custom applicability function name (for complex rules) */
  customRule?: string;
}

/** Input field definition for a test */
export interface TestInputField {
  /** Unique field key */
  key: string;
  /** Display label */
  label: string;
  /** Data type */
  dataType: FieldDataType;
  /** Unit label (if applicable) */
  unit?: string;
  /** Whether this field is required */
  required: boolean;
  /** Whether this field is read-only (calculated) */
  readOnly?: boolean;
  /** Calculation source if readOnly */
  calculationSource?: CalculationSource;
  /** Placeholder text */
  placeholder?: string;
  /** Validation rules */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customMessage?: string;
  };
  /** For select fields */
  options?: { label: string; value: string }[];
  /** Default value */
  defaultValue?: unknown;
  /** Help text */
  helpText?: string;
}

/** Observation point definition */
export interface TestObservationPoint {
  /** Unique point key */
  key: string;
  /** Display label (e.g., "0.1e", "0.5e", "1e") */
  label: string;
  /** Reference value description */
  description: string;
  /** Number of observations required at this point */
  observationCount: number;
  /** Unit for observations */
  unit: MassUnit;
  /** Whether this point is required */
  required: boolean;
  /** Help text */
  helpText?: string;
}

/** Calculated value definition */
export interface TestCalculatedValue {
  /** Unique value key */
  key: string;
  /** Display label */
  label: string;
  /** Unit */
  unit?: string;
  /** Calculation formula description (for display) */
  formulaDescription: string;
  /** Source fields used in calculation */
  sourceFields: string[];
  /** Number of decimal places to display */
  decimals: number;
}

/** Limit definition (configurable, not hardcoded) */
export interface TestLimit {
  /** Unique limit key */
  key: string;
  /** Display label */
  label: string;
  /** Unit */
  unit?: string;
  /** Whether this limit is configurable per instrument */
  configurable: boolean;
  /** Default value (can be overridden by compliance rules) */
  defaultValue?: number;
  /** Description of how this limit is determined */
  description: string;
}

/** Complete test definition */
export interface TestDefinition {
  /** Unique test code (e.g., "RPT", "ECC") */
  code: string;
  /** Display name */
  name: string;
  /** Purpose/description */
  purpose: string;
  /** OIML R-76 section reference */
  sectionReference?: string;
  /** Applicability conditions */
  applicability: TestApplicability;
  /** Input fields (instrument specs, conditions) */
  inputFields: TestInputField[];
  /** Observation points */
  observationPoints: TestObservationPoint[];
  /** Calculated values */
  calculatedValues: TestCalculatedValue[];
  /** Applicable limits (from compliance rules) */
  limits: TestLimit[];
  /** Sort order in test selection */
  sortOrder: number;
  /** Whether this test is enabled by default */
  enabledByDefault: boolean;
}

// ============================================================================
// TEST DEFINITIONS
// ============================================================================

/**
 * All available tests for NAWI OIML R-76 verification.
 *
 * This is the single source of truth for test definitions.
 * To add a new test, add a new entry here.
 */
export const TEST_DEFINITIONS: TestDefinition[] = [
  // ── Repeatability Test ──
  {
    code: 'RPT',
    name: 'Repeatability',
    purpose: 'Determine the repeatability of the instrument by performing multiple loadings at the same test point.',
    sectionReference: 'OIML R-76, Section 7.1',
    applicability: {
      instrumentClasses: ['I', 'II', 'III', 'IIII', 'IIIIL'],
      verificationTypes: ['initial', 'subsequent', 'type-approval'],
    },
    inputFields: [
      {
        key: 'testPointValue',
        label: 'Test Point Value',
        dataType: 'number',
        unit: 'kg',
        required: true,
        placeholder: 'e.g., 1000',
        helpText: 'The reference mass value for this test point',
      },
      {
        key: 'observationCount',
        label: 'Number of Observations',
        dataType: 'number',
        required: true,
        defaultValue: 10,
        validation: { min: 5, max: 20 },
        helpText: 'Minimum 5 observations recommended',
      },
    ],
    observationPoints: [
      {
        key: 'rp1',
        label: 'Observation',
        description: 'Load and read',
        observationCount: 10,
        unit: 'kg',
        required: true,
        helpText: 'Record the indicated value for each loading',
      },
    ],
    calculatedValues: [
      {
        key: 'mean',
        label: 'Mean',
        formulaDescription: 'Sum of observations ÷ Number of observations',
        sourceFields: ['observations'],
        decimals: 4,
      },
      {
        key: 'stdDev',
        label: 'Standard Deviation',
        formulaDescription: '√(Σ(xi - x̄)² ÷ (n-1))',
        sourceFields: ['observations'],
        decimals: 4,
      },
      {
        key: 'maxDeviation',
        label: 'Maximum Deviation',
        formulaDescription: 'max(|xi - x̄|)',
        sourceFields: ['observations'],
        decimals: 4,
      },
    ],
    limits: [
      {
        key: 'maxStdDev',
        label: 'Maximum Standard Deviation',
        unit: 'd',
        configurable: true,
        description: 'Maximum allowable standard deviation in scale intervals',
      },
    ],
    sortOrder: 1,
    enabledByDefault: true,
  },

  // ── Eccentricity Test ──
  {
    code: 'ECC',
    name: 'Eccentricity (Off-center)',
    purpose: 'Determine the effect of off-center loading on the weighing result.',
    sectionReference: 'OIML R-76, Section 7.2',
    applicability: {
      instrumentClasses: ['I', 'II', 'III', 'IIII', 'IIIIL'],
      verificationTypes: ['initial', 'subsequent', 'type-approval'],
    },
    inputFields: [
      {
        key: 'testPointValue',
        label: 'Test Point Value',
        dataType: 'number',
        unit: 'kg',
        required: true,
        placeholder: 'e.g., 500',
        helpText: 'Reference mass for eccentricity test (typically 1/3 to 1/2 of capacity)',
      },
    ],
    observationPoints: [
      {
        key: 'center',
        label: 'Center',
        description: 'Load at center of pan',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
      {
        key: 'front',
        label: 'Front',
        description: 'Load at front edge of pan',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
      {
        key: 'rear',
        label: 'Rear',
        description: 'Load at rear edge of pan',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
      {
        key: 'left',
        label: 'Left',
        description: 'Load at left edge of pan',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
      {
        key: 'right',
        label: 'Right',
        description: 'Load at right edge of pan',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
    ],
    calculatedValues: [
      {
        key: 'centerValue',
        label: 'Center Reading',
        formulaDescription: 'Direct reading at center',
        sourceFields: ['center'],
        decimals: 4,
      },
      {
        key: 'maxDeviation',
        label: 'Maximum Deviation from Center',
        formulaDescription: 'max(|edge - center|)',
        sourceFields: ['center', 'front', 'rear', 'left', 'right'],
        decimals: 4,
      },
      {
        key: 'deviationPercent',
        label: 'Deviation (% of test point)',
        formulaDescription: '(Max deviation ÷ test point) × 100',
        sourceFields: ['maxDeviation', 'testPointValue'],
        decimals: 2,
      },
    ],
    limits: [
      {
        key: 'maxEccentricity',
        label: 'Maximum Eccentricity',
        unit: 'd',
        configurable: true,
        description: 'Maximum allowable deviation from center reading',
      },
    ],
    sortOrder: 2,
    enabledByDefault: true,
  },

  // ── Linearity Test ──
  {
    code: 'LIN',
    name: 'Linearity',
    purpose: 'Verify the linearity of the instrument across the weighing range.',
    sectionReference: 'OIML R-76, Section 7.3',
    applicability: {
      instrumentClasses: ['I', 'II'],
      verificationTypes: ['initial', 'type-approval'],
    },
    inputFields: [],
    observationPoints: [
      {
        key: 'min',
        label: 'Min Capacity',
        description: 'Minimum weighing capacity',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
      {
        key: 'q1',
        label: '0.25e',
        description: '25% of capacity',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
      {
        key: 'q2',
        label: '0.5e',
        description: '50% of capacity',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
      {
        key: 'q3',
        label: '0.75e',
        description: '75% of capacity',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
      {
        key: 'max',
        label: 'Max Capacity',
        description: 'Maximum weighing capacity',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
    ],
    calculatedValues: [
      {
        key: 'linearityError',
        label: 'Maximum Linearity Error',
        formulaDescription: 'max|indicated - reference| across all points',
        sourceFields: ['min', 'q1', 'q2', 'q3', 'max'],
        decimals: 4,
      },
    ],
    limits: [
      {
        key: 'maxLinearity',
        label: 'Maximum Linearity Error',
        unit: 'd',
        configurable: true,
        description: 'Maximum allowable linearity error',
      },
    ],
    sortOrder: 3,
    enabledByDefault: false,
  },

  // ── Discrimination Test ──
  {
    code: 'DIS',
    name: 'Discrimination',
    purpose: 'Verify the discrimination capability of the instrument.',
    sectionReference: 'OIML R-76, Section 7.4',
    applicability: {
      instrumentClasses: ['I', 'II', 'III'],
      verificationTypes: ['initial', 'type-approval'],
    },
    inputFields: [
      {
        key: 'discriminationValue',
        label: 'Discrimination Test Value',
        dataType: 'number',
        unit: 'mg',
        required: true,
        placeholder: 'e.g., 10',
        helpText: 'Small weight to test discrimination',
      },
    ],
    observationPoints: [
      {
        key: 'before',
        label: 'Reading Before',
        description: 'Instrument reading before adding discrimination weight',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
      {
        key: 'after',
        label: 'Reading After',
        description: 'Instrument reading after adding discrimination weight',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
    ],
    calculatedValues: [
      {
        key: 'discrimination',
        label: 'Discrimination',
        formulaDescription: 'Reading after - Reading before',
        sourceFields: ['before', 'after'],
        decimals: 4,
      },
    ],
    limits: [
      {
        key: 'minDiscrimination',
        label: 'Minimum Discrimination',
        unit: 'mg',
        configurable: true,
        description: 'Minimum required discrimination capability',
      },
    ],
    sortOrder: 4,
    enabledByDefault: false,
  },

  // ── Stability Test ──
  {
    code: 'STB',
    name: 'Stability',
    purpose: 'Verify the stability of the instrument reading over time.',
    sectionReference: 'OIML R-76, Section 7.5',
    applicability: {
      instrumentClasses: ['I', 'II', 'III'],
      verificationTypes: ['initial', 'type-approval'],
    },
    inputFields: [
      {
        key: 'testPointValue',
        label: 'Test Point Value',
        dataType: 'number',
        unit: 'kg',
        required: true,
      },
      {
        key: 'duration',
        label: 'Observation Duration',
        dataType: 'number',
        unit: 'minutes',
        required: true,
        defaultValue: 5,
        helpText: 'Duration to monitor stability',
      },
    ],
    observationPoints: [
      {
        key: 'initial',
        label: 'Initial Reading',
        description: 'Reading at time zero',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
      {
        key: 'final',
        label: 'Final Reading',
        description: 'Reading after duration',
        observationCount: 1,
        unit: 'kg',
        required: true,
      },
    ],
    calculatedValues: [
      {
        key: 'drift',
        label: 'Reading Drift',
        formulaDescription: 'Final reading - Initial reading',
        sourceFields: ['initial', 'final'],
        decimals: 4,
      },
    ],
    limits: [
      {
        key: 'maxDrift',
        label: 'Maximum Allowable Drift',
        unit: 'd',
        configurable: true,
        description: 'Maximum allowable reading drift over time',
      },
    ],
    sortOrder: 5,
    enabledByDefault: false,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get test definition by code.
 */
export function getTestDefinition(code: string): TestDefinition | undefined {
  return TEST_DEFINITIONS.find(t => t.code === code);
}

/**
 * Get all test definitions sorted by sort order.
 */
export function getAllTestDefinitions(): TestDefinition[] {
  return [...TEST_DEFINITIONS].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Check if a test is applicable to the given instrument.
 */
export function isTestApplicable(
  test: TestDefinition,
  instrumentClass?: InstrumentClass,
  instrumentType?: string,
  verificationType?: string,
): boolean {
  const { applicability } = test;

  // Check instrument class
  if (applicability.instrumentClasses && applicability.instrumentClasses.length > 0) {
    if (!instrumentClass || !applicability.instrumentClasses.includes(instrumentClass)) {
      return false;
    }
  }

  // Check instrument type
  if (applicability.instrumentTypes && applicability.instrumentTypes.length > 0) {
    if (!instrumentType || !applicability.instrumentTypes.includes(instrumentType as 'mechanical' | 'electronic' | 'electromechanical')) {
      return false;
    }
  }

  // Check verification type
  if (applicability.verificationTypes && applicability.verificationTypes.length > 0) {
    if (!verificationType || !applicability.verificationTypes.includes(verificationType as 'initial' | 'subsequent' | 'type-approval')) {
      return false;
    }
  }

  return true;
}

/**
 * Get tests applicable to the given instrument.
 */
export function getApplicableTests(
  instrumentClass?: InstrumentClass,
  instrumentType?: string,
  verificationType?: string,
): TestDefinition[] {
  return getAllTestDefinitions().filter(test =>
    isTestApplicable(test, instrumentClass, instrumentType, verificationType)
  );
}

/**
 * Get default test codes for an instrument.
 */
export function getDefaultTestCodes(
  instrumentClass?: InstrumentClass,
  instrumentType?: string,
  verificationType?: string,
): string[] {
  return getApplicableTests(instrumentClass, instrumentType, verificationType)
    .filter(t => t.enabledByDefault)
    .map(t => t.code);
}
