-- Allow the gross-load weighing procedure (WGT) in test_cases.
-- The calculation engine and the New Test wizard both emit case_type
-- 'weighing'; the original CHECK constraint only listed the other six
-- procedures plus 'temperature-effect', which silently blocked WGT rows.
ALTER TABLE test_cases DROP CONSTRAINT test_cases_case_type_check;
ALTER TABLE test_cases ADD CONSTRAINT test_cases_case_type_check
    CHECK (case_type IN (
        'weighing',
        'repeatability',
        'eccentricity',
        'linearity',
        'discrimination',
        'stability',
        'temperature-effect'
    ));