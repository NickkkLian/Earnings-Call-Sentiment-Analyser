"""Fetch earnings call transcripts from Financial Modeling Prep.

FMP's transcript endpoint returns the full call as one string. We split it
into prepared remarks and Q&A by detecting the "Questions and Answers" /
"Q&A" header that the call's operator typically reads.
"""
from __future__ import annotations

import os
import re
import json
import hashlib
from dataclasses import dataclass
from pathlib import Path

import requests
from tenacity import retry, stop_after_attempt, wait_exponential


FMP_BASE = "https://financialmodelingprep.com/api/v3"


@dataclass
class Transcript:
    ticker: str
    year: int
    quarter: int
    call_date: str          # ISO
    prepared_text: str
    qa_text: str

    @property
    def quarter_label(self) -> str:
        return f"Q{self.quarter} {self.year}"

    def hash_id(self) -> str:
        h = hashlib.sha256()
        h.update(f"{self.ticker}-{self.year}-Q{self.quarter}".encode())
        return h.hexdigest()[:16]


# --- HTTP layer ---------------------------------------------------------

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
def _fetch_raw(ticker: str, year: int, quarter: int, api_key: str) -> dict:
    url = f"{FMP_BASE}/earning_call_transcript/{ticker.upper()}"
    params = {"year": year, "quarter": quarter, "apikey": api_key}
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data:
        raise ValueError(f"No transcript found for {ticker} Q{quarter} {year}")
    return data[0]


# --- Splitting prepared vs. Q&A -----------------------------------------

# Operators almost always announce the Q&A with a phrase like:
#   "...we will now begin the question-and-answer session"
#   "Operator: thank you... we'll now move to questions"
QA_MARKERS = [
    r"question.{0,3}and.{0,3}answer\s+session",
    r"begin\s+the\s+q&a",
    r"open\s+(it\s+up\s+|the\s+(call|line)\s+)?(for|to)\s+questions",
    r"first\s+question\s+(comes|is)\s+from",
    # match both "we'll" and "we will" forms; "now" is optional
    r"(we'll|we\s+will|we\s+would)(\s+now)?\s+(take|move\s+to|open\s+(it\s+up\s+)?(for|to))\s+questions",
]
QA_RE = re.compile("|".join(QA_MARKERS), re.IGNORECASE)


def split_prepared_qa(content: str) -> tuple[str, str]:
    """Return (prepared_text, qa_text). If no Q&A marker found, treat all as prepared."""
    match = QA_RE.search(content)
    if not match:
        return content.strip(), ""
    cut = match.start()
    prepared = content[:cut].strip()
    qa = content[match.end():].strip()
    return prepared, qa


# --- Public API ---------------------------------------------------------

def get_transcript(ticker: str, year: int, quarter: int,
                   cache_dir: str | Path = "./cache",
                   api_key: str | None = None) -> Transcript:
    api_key = api_key or os.environ.get("FMP_API_KEY")
    if not api_key:
        raise EnvironmentError("FMP_API_KEY not set in env")

    cache_dir = Path(cache_dir) / "transcripts"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_path = cache_dir / f"{ticker.upper()}_Q{quarter}_{year}.json"

    if cache_path.exists():
        payload = json.loads(cache_path.read_text())
    else:
        payload = _fetch_raw(ticker, year, quarter, api_key)
        cache_path.write_text(json.dumps(payload))

    prepared, qa = split_prepared_qa(payload["content"])
    return Transcript(
        ticker=ticker.upper(),
        year=year,
        quarter=quarter,
        call_date=payload.get("date", "")[:10],
        prepared_text=prepared,
        qa_text=qa,
    )
