/* real-data.js — written by `python -m src.ir_run`: real model output for the earnings calls listed in
   data/ir-calls.json, scored from each company's own published transcript. Do not edit by hand. */
window.CALLDELTA_REAL_META = {
 "run_date": "2026-09-25",
 "model": "claude-sonnet-5",
 "calls": [
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
   "label": "Q2 2026",
   "call_date": "2026-07-22",
   "source_page": "https://abc.xyz/investor/events/event-details/2026/2026-Q2-Earnings-Call-2026-GgTAq7Is0z/default.aspx",
   "source_url": "https://s206.q4cdn.com/479360582/files/doc_events/2026/Jul/22/2026_Q2_Earnings_Transcript.pdf"
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
    "label": "FY26 Q4",
    "date": "2026-07-29",
    "mgmt": 0.6,
    "qa": 0.55,
    "hedging": 0.25,
    "guidance": 0.75,
    "eps_surprise": 0.11792452830188678,
    "ret_5d": 0.2481691896505871,
    "sector_5d": 0.09678461130437199,
    "residual_5d": -0.025502214106615073
   }
  ],
  "topics": [
   {
    "name": "Azure & AI Infrastructure",
    "weight": 0.28,
    "mgmt": 0.65,
    "qa": 0.0,
    "qa_missing": true
   },
   {
    "name": "Azure capacity, constraints & efficiency",
    "weight": 0.25,
    "mgmt": 0.0,
    "qa": 0.5,
    "mgmt_missing": true
   },
   {
    "name": "Copilot & M365 Commercial",
    "weight": 0.22,
    "mgmt": 0.7,
    "qa": 0.0,
    "qa_missing": true
   },
   {
    "name": "Foundry/Platform & Agentic Ecosystem",
    "weight": 0.2,
    "mgmt": 0.65,
    "qa": 0.0,
    "qa_missing": true
   },
   {
    "name": "Model choice/architecture strategy",
    "weight": 0.2,
    "mgmt": 0.0,
    "qa": 0.6,
    "mgmt_missing": true
   },
   {
    "name": "Overcapacity/pricing risk & margin protection",
    "weight": 0.2,
    "mgmt": 0.0,
    "qa": 0.4,
    "mgmt_missing": true
   }
  ],
  "extracts": [
   {
    "tag": "hedging",
    "speaker": "Amy Hood",
    "text": "As a reminder, year-over-year Azure growth rates can vary quarter-to-quarter based on capacity timing and contract mix."
   },
   {
    "tag": "confident",
    "speaker": "Satya Nadella",
    "text": "I have never been more confident in Microsoft's opportunity to drive durable, long-term growth and ensure the benefits of AI flow broadly."
   }
  ],
  "source_url": "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/TranscriptFY26Q4.docx"
 },
 "GOOGL": {
  "company": "Alphabet Inc.",
  "sector": "Communication Services",
  "beta": 1.0,
  "gamma": 1.5,
  "quarters": [
   {
    "label": "Q2 2026",
    "date": "2026-07-22",
    "mgmt": 0.75,
    "qa": 0.5,
    "hedging": 0.25,
    "guidance": 0.68,
    "eps_surprise": 2.1413793103448273,
    "ret_5d": -0.01572680292551487,
    "sector_5d": 0.0028388386550022293,
    "residual_5d": -3.230634607097758
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
  "source_url": "https://s206.q4cdn.com/479360582/files/doc_events/2026/Jul/22/2026_Q2_Earnings_Transcript.pdf",
  "note": "Alphabet said on the call that its net income and EPS rose mainly because of unrealized gains on equity securities. The EPS estimate did not include them, so the EPS-surprise control (1.5 × +214%) swamps this residual: read it as not meaningful."
 },
 "META": {
  "company": "Meta Platforms, Inc.",
  "sector": "Communication Services",
  "beta": 1.0,
  "gamma": 1.5,
  "quarters": [
   {
    "label": "Q2 2026",
    "date": "2026-07-29",
    "mgmt": 0.55,
    "qa": 0.45,
    "hedging": 0.42,
    "guidance": 0.35,
    "eps_surprise": -0.1440443213296399,
    "ret_5d": 0.005396123194286284,
    "sector_5d": 0.012419002101415888,
    "residual_5d": 0.20904360308733025
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
  "source_url": "https://s21.q4cdn.com/399680738/files/doc_financials/2026/q2/META-Q2-2026-Earnings-Call-Transcript.pdf"
 }
};
