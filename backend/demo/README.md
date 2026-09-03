# NAWI TestFlow — Demonstration Data

## ⚠️ IMPORTANT NOTICE

**All data in this directory is FICTIONAL and created solely for demonstration purposes.**

- All manufacturer names, model numbers, and serial numbers are fictional
- All laboratory information is fictional
- All test observations are synthetic
- No real regulatory data is represented
- No real test results are implied
- This data is NOT suitable for any official or regulatory purpose

## Purpose

This demonstration data showcases the NAWI TestFlow application capabilities
for the Smart India Hackathon (SIH) presentation. It demonstrates:

1. Instrument registration
2. Test observation entry
3. Data validation
4. OIML R-76 calculations
5. Compliance evaluation
6. Report generation
7. Repository management

## Data Structure

```
demo/
├── README.md           # This file
├── demo_data.py        # Complete demonstration dataset
└── run_demo.py         # Script to execute the demonstration
```

## How to Run

```bash
cd backend
python -m demo.run_demo
```

## Fictional Entities

| Entity | Fictional Name | Purpose |
|--------|---------------|---------|
| Laboratory | Precision Metrics Lab, Pune | Demonstration laboratory |
| Manufacturer | Bharat Weigh Systems Pvt. Ltd. | Fictional Indian manufacturer |
| Manufacturer | Zenith Precision Instruments | Fictional European manufacturer |
| Instrument | BWS-3000 Electronic Balance | Fictional Class III instrument |
| Instrument | ZPI-2200 Precision Scale | Fictional Class II instrument |

## Disclaimer

This demonstration data is provided "as is" for educational and presentation
purposes only. It does not represent actual test results, regulatory compliance,
or official laboratory data. The NAWI TestFlow application is designed to
process real OIML R-76 test data, but this demo uses synthetic data only.
