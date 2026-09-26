/* real-data.js — written by `python -m src.ir_run`: real model output for the earnings calls listed in
   data/ir-calls.json, scored from each company's own published transcript. Do not edit by hand. */
window.CALLDELTA_REAL_META = {
 "run_date": "2026-09-25",
 "model": "claude-sonnet-5",
 "calls": [
  {
   "ticker": "MSFT",
   "company": "Microsoft Corporation",
   "label": "FY26 Q1",
   "call_date": "2025-10-29",
   "source_page": "https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q1",
   "source_url": "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/TranscriptFY26Q1.docx"
  },
  {
   "ticker": "MSFT",
   "company": "Microsoft Corporation",
   "label": "FY26 Q2",
   "call_date": "2026-01-28",
   "source_page": "https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q2",
   "source_url": "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/TranscriptQandAFY26q2"
  },
  {
   "ticker": "MSFT",
   "company": "Microsoft Corporation",
   "label": "FY26 Q3",
   "call_date": "2026-04-29",
   "source_page": "https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q3",
   "source_url": "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/TranscriptQandAFY26Q3"
  },
  {
   "ticker": "MSFT",
   "company": "Microsoft Corporation",
   "label": "FY26 Q4",
   "call_date": "2026-07-29",
   "source_page": "https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q4",
   "source_url": "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/TranscriptFY26Q4.docx"
  },
  {
   "ticker": "GOOGL",
   "company": "Alphabet Inc.",
   "label": "Q3 2025",
   "call_date": "2025-10-29",
   "source_page": "https://abc.xyz/investor/events/event-details/2025/2025-Q3-Earnings-Call-2025-4OI4Bac_Q9/default.aspx",
   "source_url": "https://s206.q4cdn.com/479360582/files/doc_events/2025/Oct/29/2025_Q3_Earnings_Transcript.pdf"
  },
  {
   "ticker": "GOOGL",
   "company": "Alphabet Inc.",
   "label": "Q4 2025",
   "call_date": "2026-02-04",
   "source_page": "https://abc.xyz/investor/events/event-details/2026/2025-Q4-Earnings-Call-2026-Dr_C033hS6/default.aspx",
   "source_url": "https://s206.q4cdn.com/479360582/files/doc_events/2026/Feb/04/2025_Q4_Earnings_Transcript.pdf"
  },
  {
   "ticker": "GOOGL",
   "company": "Alphabet Inc.",
   "label": "Q1 2026",
   "call_date": "2026-04-29",
   "source_page": "https://abc.xyz/investor/events/event-details/2026/2026-Q1-Earnings-Call-2026-nW8kCrBAKS/default.aspx",
   "source_url": "https://s206.q4cdn.com/479360582/files/doc_events/2026/Apr/29/Alphabet-2026_Q1_Earnings_Transcript.pdf"
  },
  {
   "ticker": "GOOGL",
   "company": "Alphabet Inc.",
   "label": "Q2 2026",
   "call_date": "2026-07-22",
   "source_page": "https://abc.xyz/investor/events/event-details/2026/2026-Q2-Earnings-Call-2026-GgTAq7Is0z/default.aspx",
   "source_url": "https://s206.q4cdn.com/479360582/files/doc_events/2026/Jul/22/2026_Q2_Earnings_Transcript.pdf"
  },
  {
   "ticker": "META",
   "company": "Meta Platforms, Inc.",
   "label": "Q3 2025",
   "call_date": "2025-10-29",
   "source_page": "https://investor.atmeta.com/investor-events/default.aspx",
   "source_url": "https://s21.q4cdn.com/399680738/files/doc_financials/2025/q3/META-Q3-2025-Earnings-Call-Transcript.pdf"
  },
  {
   "ticker": "META",
   "company": "Meta Platforms, Inc.",
   "label": "Q4 2025",
   "call_date": "2026-01-28",
   "source_page": "https://investor.atmeta.com/investor-events/default.aspx",
   "source_url": "https://s21.q4cdn.com/399680738/files/doc_financials/2025/q4/META-Q4-2025-Earnings-Call-Transcript.pdf"
  },
  {
   "ticker": "META",
   "company": "Meta Platforms, Inc.",
   "label": "Q1 2026",
   "call_date": "2026-04-29",
   "source_page": "https://investor.atmeta.com/investor-events/default.aspx",
   "source_url": "https://s21.q4cdn.com/399680738/files/doc_financials/2026/q1/META-Q1-2026-Earnings-Call-Transcript.pdf"
  },
  {
   "ticker": "META",
   "company": "Meta Platforms, Inc.",
   "label": "Q2 2026",
   "call_date": "2026-07-29",
   "source_page": "https://investor.atmeta.com/investor-events/default.aspx",
   "source_url": "https://s21.q4cdn.com/399680738/files/doc_financials/2026/q2/META-Q2-2026-Earnings-Call-Transcript.pdf"
  }
 ],
 "eps_source": "Yahoo Finance earnings calendar (yfinance)",
 "price_source": "Yahoo Finance daily closes (yfinance)"
};
window.CALLDELTA_REAL = {
 "MSFT": {
  "company": "Microsoft Corporation",
  "sector": "Software",
  "beta": 1.0,
  "gamma": 1.5,
  "quarters": [
   {
    "label": "FY26 Q1",
    "date": "2025-10-29",
    "mgmt": 0.72,
    "qa": 0.4,
    "hedging": 0.35,
    "guidance": 0.6,
    "eps_surprise": 0.128415300546448,
    "ret_5d": -0.0635028296608271,
    "sector_5d": -0.030116326700237783,
    "residual_5d": -0.22600945378026133,
    "source_page": "https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q1",
    "source_url": "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/TranscriptFY26Q1.docx"
   },
   {
    "label": "FY26 Q2",
    "date": "2026-01-28",
    "mgmt": 0.55,
    "qa": 0.35,
    "hedging": 0.25,
    "guidance": 0.72,
    "eps_surprise": 0.056122448979591774,
    "ret_5d": -0.14002441438443902,
    "sector_5d": -0.1362044136611742,
    "residual_5d": -0.08800367419265248,
    "source_page": "https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q2",
    "source_url": "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/TranscriptQandAFY26q2"
   },
   {
    "label": "FY26 Q3",
    "date": "2026-04-29",
    "mgmt": 0.55,
    "qa": 0.55,
    "hedging": 0.3,
    "guidance": 0.8,
    "eps_surprise": 0.049140049140048964,
    "ret_5d": -0.024737292373319675,
    "sector_5d": 0.03928989801605787,
    "residual_5d": -0.13773726409945097,
    "source_page": "https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q3",
    "source_url": "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/TranscriptQandAFY26Q3"
   },
   {
    "label": "FY26 Q4",
    "date": "2026-07-29",
    "mgmt": 0.55,
    "qa": 0.55,
    "hedging": 0.25,
    "guidance": 0.75,
    "eps_surprise": 0.11792452830188678,
    "ret_5d": 0.2481691896505871,
    "sector_5d": 0.09678461130437199,
    "residual_5d": -0.025502214106615073,
    "source_page": "https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q4",
    "source_url": "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/TranscriptFY26Q4.docx"
   }
  ],
  "topics": [
   {
    "name": "AI Infrastructure & Azure",
    "weight": 0.28,
    "mgmt": 0.7,
    "qa": 0.0,
    "qa_missing": true
   },
   {
    "name": "Model choice/multi-model architecture & IP protection",
    "weight": 0.22,
    "mgmt": 0.0,
    "qa": 0.5,
    "mgmt_missing": true
   },
   {
    "name": "Copilot & Enterprise AI Adoption",
    "weight": 0.2,
    "mgmt": 0.65,
    "qa": 0.0,
    "qa_missing": true
   },
   {
    "name": "Azure growth drivers & capacity constraints",
    "weight": 0.2,
    "mgmt": 0.0,
    "qa": 0.5,
    "mgmt_missing": true
   },
   {
    "name": "Overcapacity risk, pricing pressure & margin protection",
    "weight": 0.2,
    "mgmt": 0.0,
    "qa": 0.3,
    "mgmt_missing": true
   },
   {
    "name": "M365 Copilot monetization & adoption",
    "weight": 0.2,
    "mgmt": 0.0,
    "qa": 0.65,
    "mgmt_missing": true
   }
  ],
  "extracts": [
   {
    "tag": "admission",
    "speaker": "Satya Nadella",
    "text": "We are making the necessary decisions required across our content portfolio, platform, and operations to reset the business for long-term growth."
   },
   {
    "tag": "hedging",
    "speaker": "Amy Hood",
    "text": "As in prior quarters, the range of potential outcomes remains wider than normal."
   },
   {
    "tag": "confident",
    "speaker": "Satya Nadella",
    "text": "I have never been more confident in Microsoft's opportunity to drive durable, long-term growth and ensure the benefits of AI flow broadly."
   }
  ]
 },
 "GOOGL": {
  "company": "Alphabet Inc.",
  "sector": "Communication Services",
  "beta": 1.0,
  "gamma": 1.5,
  "quarters": [
   {
    "label": "Q3 25",
    "date": "2025-10-29",
    "mgmt": 0.75,
    "qa": 0.45,
    "hedging": 0.4,
    "guidance": 0.55,
    "eps_surprise": 0.2699115044247789,
    "ret_5d": 0.035473711612017844,
    "sector_5d": -0.024679712557093003,
    "residual_5d": -0.34471383246805753,
    "source_page": "https://abc.xyz/investor/events/event-details/2025/2025-Q3-Earnings-Call-2025-4OI4Bac_Q9/default.aspx",
    "source_url": "https://s206.q4cdn.com/479360582/files/doc_events/2025/Oct/29/2025_Q3_Earnings_Transcript.pdf"
   },
   {
    "label": "Q4 25",
    "date": "2026-02-04",
    "mgmt": 0.75,
    "qa": 0.55,
    "hedging": 0.25,
    "guidance": 0.75,
    "eps_surprise": 0.06818181818181807,
    "ret_5d": -0.06629836739651707,
    "sector_5d": -0.0005138121200995993,
    "residual_5d": -0.16805728254914457,
    "source_page": "https://abc.xyz/investor/events/event-details/2026/2025-Q4-Earnings-Call-2026-Dr_C033hS6/default.aspx",
    "source_url": "https://s206.q4cdn.com/479360582/files/doc_events/2026/Feb/04/2025_Q4_Earnings_Transcript.pdf"
   },
   {
    "label": "Q1 26",
    "date": "2026-04-29",
    "mgmt": 0.75,
    "qa": 0.55,
    "hedging": 0.25,
    "guidance": 0.62,
    "eps_surprise": 0.9138576779026218,
    "ret_5d": 0.13745221947767972,
    "sector_5d": 0.017867981310787595,
    "residual_5d": -1.2512022786870407,
    "source_page": "https://abc.xyz/investor/events/event-details/2026/2026-Q1-Earnings-Call-2026-nW8kCrBAKS/default.aspx",
    "source_url": "https://s206.q4cdn.com/479360582/files/doc_events/2026/Apr/29/Alphabet-2026_Q1_Earnings_Transcript.pdf"
   },
   {
    "label": "Q2 26",
    "date": "2026-07-22",
    "mgmt": 0.75,
    "qa": 0.5,
    "hedging": 0.25,
    "guidance": 0.68,
    "eps_surprise": 2.1413793103448273,
    "ret_5d": -0.01572680292551487,
    "sector_5d": 0.0028388386550022293,
    "residual_5d": -3.230634607097758,
    "source_page": "https://abc.xyz/investor/events/event-details/2026/2026-Q2-Earnings-Call-2026-GgTAq7Is0z/default.aspx",
    "source_url": "https://s206.q4cdn.com/479360582/files/doc_events/2026/Jul/22/2026_Q2_Earnings_Transcript.pdf"
   }
  ],
  "topics": [
   {
    "name": "Google Cloud & AI Infrastructure",
    "weight": 0.28,
    "mgmt": 0.85,
    "qa": 0.0,
    "qa_missing": true
   },
   {
    "name": "AI/Gemini model strategy & frontier competition",
    "weight": 0.28,
    "mgmt": 0.0,
    "qa": 0.6,
    "mgmt_missing": true
   },
   {
    "name": "CapEx, capacity constraints & TPU strategy",
    "weight": 0.27,
    "mgmt": 0.0,
    "qa": 0.35,
    "mgmt_missing": true
   },
   {
    "name": "Search & AI Overviews/Mode",
    "weight": 0.22,
    "mgmt": 0.8,
    "qa": 0.0,
    "qa_missing": true
   },
   {
    "name": "YouTube & Advertising",
    "weight": 0.18,
    "mgmt": 0.7,
    "qa": 0.0,
    "qa_missing": true
   },
   {
    "name": "CapEx & Margin/Cash Flow Outlook",
    "weight": 0.18,
    "mgmt": 0.1,
    "qa": 0.0,
    "qa_missing": true
   }
  ],
  "extracts": [
   {
    "tag": "confident",
    "speaker": "Sundar Pichai",
    "text": "Cloud revenue grew 82%, powered by strong demand for AI infrastructure and AI solutions. And Cloud backlog grew to $514 billion."
   },
   {
    "tag": "confident",
    "speaker": "Anat Ashkenazi",
    "text": "We are updating our full year 2026 CapEx guidance range to $195‑205 billion, up from our previous estimate of $180‑190 billion."
   }
  ],
  "note": "Alphabet's reported EPS beat the estimate by 27%, 92% and 214% in Q3 2025, Q1 2026 and Q2 2026, and on each of those calls it said other income came mainly from unrealized gains on equity securities, which the estimates did not include. The EPS-surprise control (1.5 × surprise) swamps those three residuals: read them as not meaningful."
 },
 "META": {
  "company": "Meta Platforms, Inc.",
  "sector": "Communication Services",
  "beta": 1.0,
  "gamma": 1.5,
  "quarters": [
   {
    "label": "Q3 25",
    "date": "2025-10-29",
    "mgmt": 0.35,
    "qa": 0.35,
    "hedging": 0.45,
    "guidance": 0.45,
    "eps_surprise": -0.8435171385991058,
    "ret_5d": -0.15395060457991205,
    "sector_5d": -0.024679712557093003,
    "residual_5d": 1.1360048158758396,
    "source_page": "https://investor.atmeta.com/investor-events/default.aspx",
    "source_url": "https://s21.q4cdn.com/399680738/files/doc_financials/2025/q3/META-Q3-2025-Earnings-Call-Transcript.pdf"
   },
   {
    "label": "Q4 25",
    "date": "2026-01-28",
    "mgmt": 0.55,
    "qa": 0.25,
    "hedging": 0.45,
    "guidance": 0.55,
    "eps_surprise": 0.08029197080291972,
    "ret_5d": 0.00038880569030719236,
    "sector_5d": 0.00042823926005741697,
    "residual_5d": -0.1204773897741298,
    "source_page": "https://investor.atmeta.com/investor-events/default.aspx",
    "source_url": "https://s21.q4cdn.com/399680738/files/doc_financials/2025/q4/META-Q4-2025-Earnings-Call-Transcript.pdf"
   },
   {
    "label": "Q1 26",
    "date": "2026-04-29",
    "mgmt": 0.45,
    "qa": 0.4,
    "hedging": 0.35,
    "guidance": 0.55,
    "eps_surprise": 0.5675675675675674,
    "ret_5d": -0.0840506926396879,
    "sector_5d": 0.017867981310787595,
    "residual_5d": -0.9532700253018266,
    "source_page": "https://investor.atmeta.com/investor-events/default.aspx",
    "source_url": "https://s21.q4cdn.com/399680738/files/doc_financials/2026/q1/META-Q1-2026-Earnings-Call-Transcript.pdf"
   },
   {
    "label": "Q2 26",
    "date": "2026-07-29",
    "mgmt": 0.55,
    "qa": 0.45,
    "hedging": 0.42,
    "guidance": 0.35,
    "eps_surprise": -0.1440443213296399,
    "ret_5d": 0.005396123194286284,
    "sector_5d": 0.012419002101415888,
    "residual_5d": 0.20904360308733025,
    "source_page": "https://investor.atmeta.com/investor-events/default.aspx",
    "source_url": "https://s21.q4cdn.com/399680738/files/doc_financials/2026/q2/META-Q2-2026-Earnings-Call-Transcript.pdf"
   }
  ],
  "topics": [
   {
    "name": "AI-driven core business & recommendations",
    "weight": 0.25,
    "mgmt": 0.7,
    "qa": 0.0,
    "qa_missing": true
   },
   {
    "name": "CapEx & Capital Sources",
    "weight": 0.22,
    "mgmt": 0.0,
    "qa": 0.2,
    "mgmt_missing": true
   },
   {
    "name": "Ads monetization & advertiser tools",
    "weight": 0.2,
    "mgmt": 0.65,
    "qa": 0.0,
    "qa_missing": true
   },
   {
    "name": "Infrastructure/Capex & compute strategy",
    "weight": 0.2,
    "mgmt": 0.3,
    "qa": 0.0,
    "qa_missing": true
   },
   {
    "name": "AI Models/Research Lab & Open Source",
    "weight": 0.2,
    "mgmt": 0.0,
    "qa": 0.55,
    "mgmt_missing": true
   },
   {
    "name": "Consumer AI/Personal Agents",
    "weight": 0.17,
    "mgmt": 0.0,
    "qa": 0.55,
    "mgmt_missing": true
   }
  ],
  "extracts": [
   {
    "tag": "confident",
    "speaker": "Mark Zuckerberg",
    "text": "On a dollar basis, our ads business is reporting faster year-over-year revenue growth than any other company's reported ad business …"
   },
   {
    "tag": "confident",
    "speaker": "Mark Zuckerberg",
    "text": "Early sales have been strong, exceeding our expectations."
   }
  ],
  "note": "Meta's EPS in Q3 2025 includes a one-time non-cash tax charge (reported EPS 84% below the estimate) and in Q1 2026 a tax benefit (57% above), both stated on the calls. The EPS-surprise control swamps those two residuals: read them as not meaningful."
 }
};
