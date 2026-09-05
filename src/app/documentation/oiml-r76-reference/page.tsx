'use client';

import React from 'react';
import { DocLayout, Callout, CodeBlock, DocSection, DocSubSection, DocTable } from '@/components/layout/DocLayout';

export default function OIMLR76ReferencePage() {
  return (
    <DocLayout title="OIML R-76 Reference" subtitle="Reference information on how test procedures, calculations and compliance rules are represented in the NAWI TestFlow application.">
      <Callout type="danger" title="DEMO RULES — NOT FOR REGULATORY USE">
        <strong>Methodology: official.</strong> This project implements the official OIML R-76 test procedures and compliance-evaluation methodology (repeatability, eccentricity, linearity, discrimination and stability), including versioned rule handling.
        <br /><br />
        <strong>Limits: demonstration only.</strong> Every numeric rule limit configured in this MVP is a <em>demonstration value</em>, stored in the database and flagged with <code>is_demo_rule = true</code>. They are NOT official OIML R-76 limits and must not be used for actual compliance determinations without verification against authoritative sources.
      </Callout>

      <Callout type="warning" title="Disclaimer">
        Reference information shown here describes how the application represents and processes OIML R-76-related testing information. This document is NOT a replacement for the official OIML recommendation. Authoritative requirements must be verified against the applicable official standard/document.
      </Callout>

      <DocSection id="test-procedures" title="Test Procedures">
        <p>The application configures five OIML R-76 test procedures. Each test has a code, name, required inputs, observation fields, and calculation method.</p>
        <DocSubSection id="rpt" title="Repeatability (RPT)">
          <DocTable headers={['Property', 'Value']} rows={[
            ['Test Code', 'RPT'],
            ['Test Name', 'Repeatability'],
            ['Purpose', 'Evaluate the instrument ability to produce consistent readings under the same conditions'],
            ['Applicability', 'All instrument classes (I, II, III, IIII)'],
            ['Test Points', 'Multiple capacity points (e.g., Max, 50% Max)'],
            ['Observations', 'Multiple readings at each test point (typically 5-10)'],
            ['Unit', 'Same as instrument scale interval (g, kg)'],
            ['Calculation', 'Mean and standard deviation of readings at each test point'],
            ['Compliance Criterion', 'Standard deviation less than or equal to applicable limit (in multiples of d)'],
            ['Demo Rule', 'RPT-III-001: Std Dev less than or equal to 0.5d for Class III instruments'],
          ]} />
          <Callout type="note" title="DEMO RULE - NOT FOR REGULATORY USE">
            The compliance limit (0.5d) shown above is a demonstration value. Actual OIML R-76 requirements must be verified from the official standard document.
          </Callout>
        </DocSubSection>

        <DocSubSection id="ecc" title="Eccentricity (ECC)">
          <DocTable headers={['Property', 'Value']} rows={[
            ['Test Code', 'ECC'],
            ['Test Name', 'Eccentricity (Off-center loading)'],
            ['Purpose', 'Evaluate the effect of load position on the measured value'],
            ['Applicability', 'All instrument classes'],
            ['Test Points', 'Center + 4 edge positions (Front, Back, Left, Right)'],
            ['Observations', '5 readings: 1 center + 4 edge positions'],
            ['Calculation', 'Maximum deviation of edge readings from center reading'],
            ['Demo Rule', 'ECC-III-001: Max Deviation less than or equal to 1.0d for Class III'],
          ]} />
        </DocSubSection>

        <DocSubSection id="lin" title="Linearity (LIN)">
          <DocTable headers={['Property', 'Value']} rows={[
            ['Test Code', 'LIN'],
            ['Test Name', 'Linearity'],
            ['Purpose', 'Evaluate the instrument accuracy across its measurement range'],
            ['Applicability', 'All instrument classes'],
            ['Status in MVP', 'CONFIGURED'],
          ]} />
        </DocSubSection>

        <DocSubSection id="dis" title="Discrimination (DIS)">
          <DocTable headers={['Property', 'Value']} rows={[
            ['Test Code', 'DIS'],
            ['Test Name', 'Discrimination'],
            ['Purpose', 'Evaluate the instrument ability to detect small changes in load'],
            ['Status in MVP', 'CONFIGURED'],
          ]} />
        </DocSubSection>

        <DocSubSection id="stb" title="Stability (STB)">
          <DocTable headers={['Property', 'Value']} rows={[
            ['Test Code', 'STB'],
            ['Test Name', 'Stability'],
            ['Purpose', 'Evaluate the instrument reading stability over time under constant load'],
            ['Status in MVP', 'CONFIGURED'],
          ]} />
        </DocSubSection>
      </DocSection>

      <DocSection id="calculation-methodology" title="Calculation Methodology">
        <p>The calculation engine processes raw observations through a deterministic pipeline. All calculations are performed by the Python backend engine, never by the frontend alone and never by AI/LLM.</p>
        <CodeBlock language="text">{`Raw Observation (user-entered readings)
  |
Input Validation
  +-- Missing value check
  +-- Numeric type check
  +-- Non-negative check (where applicable)
  |
Range Validation
  +-- Within instrument capacity
  +-- Reasonable spread check
  +-- Impossible value detection
  |
Duplicate Detection
  +-- Flag identical consecutive readings
  |
Unit Normalization
  +-- Convert to consistent units (g, kg, mg)
  |
Statistical Calculation
  +-- Mean (arithmetic average)
  +-- Standard Deviation (population)
  +-- Minimum and Maximum values
  +-- Spread (max - min)
  |
Result Generation
  +-- Calculated values with units
  +-- Permissible limits (from rule configuration)
  +-- Compliance status (PASS/FAIL/RULE_NOT_CONFIGURED)`}</CodeBlock>
        <DocSubSection title="Implemented Calculations">
          <DocTable headers={['Calculation', 'Formula', 'Description']} rows={[
            ['Mean', 'mu = Sum(xi) / n', 'Arithmetic average of all valid readings'],
            ['Standard Deviation', 'sigma = sqrt(Sum((xi - mu)^2) / n)', 'Population standard deviation of readings'],
            ['Spread', 'max(xi) - min(xi)', 'Range between highest and lowest reading'],
            ['Max Deviation (ECC)', 'max(|xi - x_center|)', 'Maximum difference from center reading'],
            ['Mean in d', 'mu / d', 'Mean expressed in scale intervals'],
            ['Std Dev in d', 'sigma / d', 'Standard deviation expressed in scale intervals'],
          ]} />
        </DocSubSection>
        <Callout type="info" title="Scale Interval (d)">
          The scale interval (d) is the difference between two consecutive displayed values. It is a fundamental parameter in OIML R-76 compliance evaluation. All compliance limits are expressed as multiples of d.
        </Callout>
      </DocSection>

      <DocSection id="compliance-evaluation" title="Compliance Evaluation">
        <p>After calculation, the compliance engine evaluates each test result against the applicable configured rule to determine compliance.</p>
        <DocSubSection title="Decision States">
          <DocTable headers={['State', 'Meaning']} rows={[
            ['PASS', 'Calculated value is within the applicable limit'],
            ['FAIL', 'Calculated value exceeds the applicable limit'],
            ['NOT_APPLICABLE', 'Rule exists but is not applicable to this instrument configuration'],
            ['INCOMPLETE', 'Insufficient observation data to perform evaluation'],
            ['RULE_NOT_CONFIGURED', 'No rule exists for this test code and instrument class combination'],
          ]} />
        </DocSubSection>
        <DocSubSection title="Example Evaluation">
          <CodeBlock language="text">{`Test: Repeatability (RPT)
Instrument Class: III
Calculated Std Dev: 0.0837 d
Applicable Limit: 0.5 d

Evaluation:
  0.0837 d <= 0.5 d  ->  PASS

Reason: "0.0837 d is within the 0.5 d limit for Class III instruments (RPT-III-001 v2009)"`}</CodeBlock>
        </DocSubSection>
      </DocSection>

      <DocSection id="compliance-rule-configuration" title="Compliance Rule Configuration">
        <p>Compliance rules are stored in a structured format that separates regulatory logic from the UI and calculation code.</p>
        <DocSubSection title="Rule Structure">
          <p>Each rule record follows the OIML R-76 evaluation methodology but carries an explicit demo flag in the database. The example below shows the record shape used for a <strong>demo</strong> rule.</p>
          <CodeBlock language="json">{`{
  "standard": "OIML R-76",
  "standard_version": "DEMO-2026.01",
  "rule_id": "RPT-III-001",
  "rule_version": "vDEMO-2026.01",
  "test_code": "RPT",
  "instrument_class": "III",
  "applicability": "All NAWI Class III instruments",
  "calculation_method": "standard_deviation",
  "applicable_limit": 0.5,
  "limit_unit": "d",
  "decision_logic": "calculated_value <= applicable_limit",
  "is_demo_rule": true
}`}</CodeBlock>
          <Callout type="warning" title="Demo value">
            The <code>applicable_limit</code> shown in this example is a demonstration value stored in the MVP database. It accompanies the official OIML R-76 evaluation logic but must be verified against authoritative sources before any regulatory use.
          </Callout>
        </DocSubSection>
        <DocSubSection title="Demo Rules (Current MVP)">
          <Callout type="warning" title="DEMO RULES - NOT FOR REGULATORY USE">
            The rules below are demonstration values configured for the MVP. They are clearly marked as demo rules in the database. They must not be used for actual compliance determinations without verification against authoritative sources.
          </Callout>
          <DocTable headers={['Rule ID', 'Test', 'Class', 'Limit', 'Method', 'Demo']} rows={[
            ['RPT-III-001', 'Repeatability', 'III', '0.5d', 'Std Dev <= limit', 'DEMO'],
            ['RPT-II-001', 'Repeatability', 'II', '0.5d', 'Std Dev <= limit', 'DEMO'],
            ['ECC-III-001', 'Eccentricity', 'III', '1.0d', 'Max Dev <= limit', 'DEMO'],
            ['ECC-II-001', 'Eccentricity', 'II', '1.0d', 'Max Dev <= limit', 'DEMO'],
          ]} />
        </DocSubSection>
      </DocSection>

      <DocSection id="rule-versioning" title="Rule Versioning">
        <p>The rule versioning system ensures that historical test reports always retain the exact rule version used when their compliance was evaluated.</p>
        <Callout type="note" title="Illustrative demo limits">
          The numeric limits in the diagram below are DEMO values shown for illustration only — they are not official OIML R-76 limits. The versioning mechanism illustrated (effective dates, newest-version selection, immutability of finalized reports) is exactly how the application loads, pins and reproduces rule versions for each report.
        </Callout>        <CodeBlock language="text">{`OIML R-76
  |
  +-- Version 2009 (Effective: 01 Jan 2009)
  |    +-- RPT limit: 0.5d (Class III)
  |    +-- ECC limit: 1.0d (Class III)
  |    +-- Reports finalized under this version retain these values
  |
  +-- Version 2024 (Effective: 01 Jan 2025)
  |    +-- RPT limit: 0.4d (Class III) -- stricter
  |    +-- ECC limit: 0.8d (Class III) -- stricter
  |    +-- NEW reports use this version
  |
  +-- Future versions
       +-- Can be added without modifying historical data`}</CodeBlock>
        <DocSubSection title="Immutability Guarantees">
          <ul className="list-disc list-inside space-y-1">
            <li>Finalized reports store the exact rule_id and rule_version used during evaluation</li>
            <li>Rule records for finalized reports are never overwritten</li>
            <li>Old rule versions remain available for historical report verification</li>
            <li>New rule versions can be activated for future reports without affecting existing ones</li>
            <li>The system returns RULE_NOT_CONFIGURED rather than applying the wrong version</li>
          </ul>
        </DocSubSection>
        <Callout type="info" title="Reproducibility">
          Any finalized report can be re-evaluated at any time using the stored rule version, and it will produce the same result. This ensures full reproducibility of historical compliance determinations.
        </Callout>
      </DocSection>
    </DocLayout>
  );
}
