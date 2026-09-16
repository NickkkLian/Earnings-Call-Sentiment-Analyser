/* demo-data.js — SYNTHETIC demo data for the dashboard: four fictional companies, invented tickers, illustrative numbers
   in the exact shape src/export_dashboard.py emits. No real company, executive or quote appears here. Replace at runtime with
   "Load JSON" using a file produced by the pipeline. */
window.CALLDELTA_DEMO = {
 "NWSC": {
  "company": "Northwind Semiconductor (fictional)",
  "sector": "Semiconductors",
  "quarters": [
   {
    "label": "Q2 24",
    "date": "2024-08-28",
    "mgmt": 0.74,
    "qa": 0.52,
    "hedging": 0.16,
    "guidance": 0.84,
    "eps_surprise": 0.061,
    "ret_5d": 0.071,
    "residual_5d": 0.038
   },
   {
    "label": "Q3 24",
    "date": "2024-11-20",
    "mgmt": 0.78,
    "qa": 0.58,
    "hedging": 0.14,
    "guidance": 0.86,
    "eps_surprise": 0.082,
    "ret_5d": 0.041,
    "residual_5d": -0.012
   },
   {
    "label": "Q4 24",
    "date": "2025-02-26",
    "mgmt": 0.71,
    "qa": 0.49,
    "hedging": 0.21,
    "guidance": 0.79,
    "eps_surprise": 0.045,
    "ret_5d": -0.028,
    "residual_5d": -0.051
   },
   {
    "label": "Q1 25",
    "date": "2025-05-28",
    "mgmt": 0.69,
    "qa": 0.45,
    "hedging": 0.24,
    "guidance": 0.76,
    "eps_surprise": 0.038,
    "ret_5d": 0.012,
    "residual_5d": -0.018
   },
   {
    "label": "Q2 25",
    "date": "2025-08-27",
    "mgmt": 0.72,
    "qa": 0.48,
    "hedging": 0.22,
    "guidance": 0.78,
    "eps_surprise": 0.052,
    "ret_5d": 0.034,
    "residual_5d": 0.005
   },
   {
    "label": "Q3 25",
    "date": "2025-11-19",
    "mgmt": 0.68,
    "qa": 0.41,
    "hedging": 0.27,
    "guidance": 0.72,
    "eps_surprise": 0.029,
    "ret_5d": -0.041,
    "residual_5d": -0.058
   },
   {
    "label": "Q4 25",
    "date": "2026-02-25",
    "mgmt": 0.66,
    "qa": 0.38,
    "hedging": 0.31,
    "guidance": 0.68,
    "eps_surprise": 0.018,
    "ret_5d": -0.067,
    "residual_5d": -0.072
   },
   {
    "label": "Q1 26",
    "date": "2026-05-27",
    "mgmt": 0.62,
    "qa": 0.35,
    "hedging": 0.34,
    "guidance": 0.65,
    "eps_surprise": 0.024,
    "ret_5d": -0.052,
    "residual_5d": -0.061
   }
  ],
  "topics": [
   {
    "name": "Data centre",
    "weight": 0.42,
    "mgmt": 0.78,
    "qa": 0.55
   },
   {
    "name": "Export controls",
    "weight": 0.18,
    "mgmt": -0.2,
    "qa": -0.45
   },
   {
    "name": "Accelerator ramp",
    "weight": 0.16,
    "mgmt": 0.82,
    "qa": 0.6
   },
   {
    "name": "Margins",
    "weight": 0.12,
    "mgmt": 0.55,
    "qa": 0.3
   },
   {
    "name": "Sovereign deals",
    "weight": 0.12,
    "mgmt": 0.7,
    "qa": 0.4
   }
  ],
  "extracts": [
   {
    "tag": "confident",
    "speaker": "CFO (fictional)",
    "text": "Accelerator demand exceeds our most aggressive supply forecasts."
   },
   {
    "tag": "hedging",
    "speaker": "CEO (fictional)",
    "text": "We are cautiously monitoring the regulatory environment in certain regions."
   },
   {
    "tag": "evasion",
    "speaker": "Management response",
    "text": "On forward regional revenue: \"We do not break out forward expectations by geography.\""
   }
  ]
 },
 "HRBS": {
  "company": "Harbour Social (fictional)",
  "sector": "Communication Services",
  "quarters": [
   {
    "label": "Q2 24",
    "date": "2024-07-31",
    "mgmt": 0.42,
    "qa": 0.31,
    "hedging": 0.28,
    "guidance": 0.61,
    "eps_surprise": 0.071,
    "ret_5d": 0.049,
    "residual_5d": 0.018
   },
   {
    "label": "Q3 24",
    "date": "2024-10-30",
    "mgmt": 0.51,
    "qa": 0.39,
    "hedging": 0.24,
    "guidance": 0.66,
    "eps_surprise": 0.044,
    "ret_5d": 0.022,
    "residual_5d": 0.001
   },
   {
    "label": "Q4 24",
    "date": "2025-01-29",
    "mgmt": 0.58,
    "qa": 0.45,
    "hedging": 0.21,
    "guidance": 0.71,
    "eps_surprise": 0.082,
    "ret_5d": 0.061,
    "residual_5d": 0.02
   },
   {
    "label": "Q1 25",
    "date": "2025-04-30",
    "mgmt": 0.62,
    "qa": 0.48,
    "hedging": 0.19,
    "guidance": 0.74,
    "eps_surprise": 0.058,
    "ret_5d": 0.038,
    "residual_5d": 0.012
   },
   {
    "label": "Q2 25",
    "date": "2025-07-30",
    "mgmt": 0.65,
    "qa": 0.51,
    "hedging": 0.22,
    "guidance": 0.72,
    "eps_surprise": 0.041,
    "ret_5d": 0.029,
    "residual_5d": 0.011
   },
   {
    "label": "Q3 25",
    "date": "2025-10-29",
    "mgmt": 0.61,
    "qa": 0.42,
    "hedging": 0.29,
    "guidance": 0.68,
    "eps_surprise": 0.025,
    "ret_5d": -0.038,
    "residual_5d": -0.052
   },
   {
    "label": "Q4 25",
    "date": "2026-01-28",
    "mgmt": 0.66,
    "qa": 0.45,
    "hedging": 0.27,
    "guidance": 0.71,
    "eps_surprise": 0.067,
    "ret_5d": 0.044,
    "residual_5d": 0.01
   },
   {
    "label": "Q1 26",
    "date": "2026-04-29",
    "mgmt": 0.69,
    "qa": 0.48,
    "hedging": 0.25,
    "guidance": 0.74,
    "eps_surprise": 0.054,
    "ret_5d": 0.057,
    "residual_5d": 0.028
   }
  ],
  "topics": [
   {
    "name": "AI infrastructure",
    "weight": 0.32,
    "mgmt": 0.72,
    "qa": 0.4
   },
   {
    "name": "Ad revenue",
    "weight": 0.28,
    "mgmt": 0.78,
    "qa": 0.65
   },
   {
    "name": "Hardware lab",
    "weight": 0.18,
    "mgmt": 0.3,
    "qa": -0.1
   },
   {
    "name": "Capex",
    "weight": 0.12,
    "mgmt": 0.45,
    "qa": 0.2
   },
   {
    "name": "Regulatory",
    "weight": 0.1,
    "mgmt": 0.2,
    "qa": 0.1
   }
  ],
  "extracts": [
   {
    "tag": "confident",
    "speaker": "CFO (fictional)",
    "text": "Ad performance continues to compound on improved targeting and ranking models."
   },
   {
    "tag": "hedging",
    "speaker": "CEO (fictional)",
    "text": "AI infrastructure investments will continue at elevated levels for the foreseeable future."
   },
   {
    "tag": "evasion",
    "speaker": "Management response",
    "text": "On the hardware lab path to profitability: \"We see this as a multi-decade investment.\""
   }
  ]
 },
 "VLTW": {
  "company": "Voltway Motors (fictional)",
  "sector": "Automobiles",
  "quarters": [
   {
    "label": "Q2 24",
    "date": "2024-07-23",
    "mgmt": 0.61,
    "qa": 0.18,
    "hedging": 0.32,
    "guidance": 0.55,
    "eps_surprise": -0.041,
    "ret_5d": -0.082,
    "residual_5d": -0.045
   },
   {
    "label": "Q3 24",
    "date": "2024-10-23",
    "mgmt": 0.65,
    "qa": 0.21,
    "hedging": 0.34,
    "guidance": 0.58,
    "eps_surprise": 0.058,
    "ret_5d": 0.071,
    "residual_5d": 0.022
   },
   {
    "label": "Q4 24",
    "date": "2025-01-29",
    "mgmt": 0.71,
    "qa": 0.25,
    "hedging": 0.38,
    "guidance": 0.62,
    "eps_surprise": -0.022,
    "ret_5d": -0.051,
    "residual_5d": -0.038
   },
   {
    "label": "Q1 25",
    "date": "2025-04-22",
    "mgmt": 0.58,
    "qa": 0.1,
    "hedging": 0.41,
    "guidance": 0.51,
    "eps_surprise": -0.085,
    "ret_5d": -0.118,
    "residual_5d": -0.061
   },
   {
    "label": "Q2 25",
    "date": "2025-07-23",
    "mgmt": 0.62,
    "qa": 0.15,
    "hedging": 0.39,
    "guidance": 0.54,
    "eps_surprise": -0.038,
    "ret_5d": -0.058,
    "residual_5d": -0.029
   },
   {
    "label": "Q3 25",
    "date": "2025-10-22",
    "mgmt": 0.55,
    "qa": 0.05,
    "hedging": 0.45,
    "guidance": 0.48,
    "eps_surprise": -0.061,
    "ret_5d": -0.092,
    "residual_5d": -0.048
   },
   {
    "label": "Q4 25",
    "date": "2026-01-28",
    "mgmt": 0.68,
    "qa": 0.18,
    "hedging": 0.42,
    "guidance": 0.58,
    "eps_surprise": 0.012,
    "ret_5d": 0.038,
    "residual_5d": 0.025
   },
   {
    "label": "Q1 26",
    "date": "2026-04-22",
    "mgmt": 0.72,
    "qa": 0.2,
    "hedging": 0.44,
    "guidance": 0.61,
    "eps_surprise": -0.018,
    "ret_5d": -0.041,
    "residual_5d": -0.025
   }
  ],
  "topics": [
   {
    "name": "Robotaxi",
    "weight": 0.3,
    "mgmt": 0.85,
    "qa": 0.1
   },
   {
    "name": "Deliveries",
    "weight": 0.22,
    "mgmt": 0.45,
    "qa": 0.05
   },
   {
    "name": "Autonomy software",
    "weight": 0.18,
    "mgmt": 0.8,
    "qa": 0.25
   },
   {
    "name": "Margins",
    "weight": 0.16,
    "mgmt": 0.4,
    "qa": 0.1
   },
   {
    "name": "Energy storage",
    "weight": 0.14,
    "mgmt": 0.65,
    "qa": 0.55
   }
  ],
  "extracts": [
   {
    "tag": "confident",
    "speaker": "CEO (fictional)",
    "text": "Unsupervised autonomy will be available in most markets this year."
   },
   {
    "tag": "hedging",
    "speaker": "CFO (fictional)",
    "text": "Timing of the robotaxi commercial launch depends on regulatory approvals across jurisdictions."
   },
   {
    "tag": "evasion",
    "speaker": "Management response",
    "text": "On next-quarter delivery guidance: \"We do not typically provide specific quarterly numbers.\""
   }
  ]
 },
 "GRFD": {
  "company": "Granite Foundry (fictional)",
  "sector": "Semiconductors",
  "quarters": [
   {
    "label": "Q2 24",
    "date": "2024-08-01",
    "mgmt": 0.21,
    "qa": 0.15,
    "hedging": 0.42,
    "guidance": 0.38,
    "eps_surprise": -0.121,
    "ret_5d": -0.265,
    "residual_5d": -0.122
   },
   {
    "label": "Q3 24",
    "date": "2024-10-31",
    "mgmt": 0.15,
    "qa": 0.05,
    "hedging": 0.45,
    "guidance": 0.34,
    "eps_surprise": -0.082,
    "ret_5d": -0.091,
    "residual_5d": -0.018
   },
   {
    "label": "Q4 24",
    "date": "2025-01-30",
    "mgmt": 0.08,
    "qa": -0.05,
    "hedging": 0.48,
    "guidance": 0.3,
    "eps_surprise": -0.045,
    "ret_5d": -0.071,
    "residual_5d": -0.041
   },
   {
    "label": "Q1 25",
    "date": "2025-04-24",
    "mgmt": -0.05,
    "qa": -0.18,
    "hedging": 0.52,
    "guidance": 0.25,
    "eps_surprise": -0.158,
    "ret_5d": -0.182,
    "residual_5d": -0.058
   },
   {
    "label": "Q2 25",
    "date": "2025-07-31",
    "mgmt": -0.12,
    "qa": -0.25,
    "hedging": 0.55,
    "guidance": 0.22,
    "eps_surprise": -0.092,
    "ret_5d": -0.108,
    "residual_5d": -0.025
   },
   {
    "label": "Q3 25",
    "date": "2025-10-30",
    "mgmt": -0.18,
    "qa": -0.31,
    "hedging": 0.58,
    "guidance": 0.18,
    "eps_surprise": -0.071,
    "ret_5d": -0.092,
    "residual_5d": -0.028
   },
   {
    "label": "Q4 25",
    "date": "2026-01-29",
    "mgmt": -0.1,
    "qa": -0.22,
    "hedging": 0.51,
    "guidance": 0.28,
    "eps_surprise": 0.012,
    "ret_5d": 0.034,
    "residual_5d": 0.022
   },
   {
    "label": "Q1 26",
    "date": "2026-04-23",
    "mgmt": -0.05,
    "qa": -0.18,
    "hedging": 0.48,
    "guidance": 0.32,
    "eps_surprise": -0.025,
    "ret_5d": -0.018,
    "residual_5d": 0.001
   }
  ],
  "topics": [
   {
    "name": "Foundry",
    "weight": 0.32,
    "mgmt": 0.1,
    "qa": -0.4
   },
   {
    "name": "Client PCs",
    "weight": 0.2,
    "mgmt": 0.05,
    "qa": -0.1
   },
   {
    "name": "Data centre",
    "weight": 0.18,
    "mgmt": -0.15,
    "qa": -0.3
   },
   {
    "name": "Cost reduction",
    "weight": 0.16,
    "mgmt": 0.2,
    "qa": 0.05
   },
   {
    "name": "Strategy",
    "weight": 0.14,
    "mgmt": 0.15,
    "qa": -0.2
   }
  ],
  "extracts": [
   {
    "tag": "hedging",
    "speaker": "CEO (fictional)",
    "text": "We continue to make progress on our turnaround across all segments."
   },
   {
    "tag": "evasion",
    "speaker": "Management response",
    "text": "On foundry customer wins: \"We have ongoing discussions with several customers we cannot disclose.\""
   },
   {
    "tag": "admission",
    "speaker": "CFO (fictional)",
    "text": "We acknowledge our execution has not met our own expectations."
   }
  ]
 }
};
