"""Convert pipeline output → dashboard JSON.

Takes either a CSV produced by `src/cli.py` or a DataFrame returned by
`pipeline.run`, and emits a JSON file in the exact shape that
`dashboard.jsx`'s "Load JSON" button accepts.

Usage:
    python -m src.export_dashboard signals.csv -o dashboard_data.json

Or in code:
    from src.pipeline import run
    from src.export_dashboard import export
    df = run([...])
    export(df, "dashboard_data.json")
"""
from __future__ import annotations

import argparse
import ast
import json
import re
from pathlib import Path

import pandas as pd


# Map a CallAnalysis quarter_label like "Q2 2025" → short label "Q2 25"
def _short_label(quarter_label: str) -> str:
    m = re.match(r"Q(\d)\s+(\d{4})", quarter_label.strip())
    if not m:
        return quarter_label
    return f"Q{m.group(1)} {m.group(2)[2:]}"


# CSV serialises list/dict cols as repr-strings; coerce them back.
def _coerce_listcell(v):
    if isinstance(v, list):
        return v
    if pd.isna(v):
        return []
    if isinstance(v, str):
        try:
            return json.loads(v)
        except json.JSONDecodeError:
            try:
                return ast.literal_eval(v)
            except (ValueError, SyntaxError):
                return []
    return []


def _combine_topics(prepared_topics: list[dict], qa_topics: list[dict]) -> list[dict]:
    """Merge per-section topic lists into the dashboard's {name, weight, mgmt, qa} shape.

    Topic names won't perfectly align between sections — we use prepared
    topics as canonical, then fuzzy-match Q&A topics by case-insensitive
    substring match. Unmatched Q&A topics are appended.
    """
    out = []
    qa_used = set()

    for pt in prepared_topics:
        name = pt["name"]
        # find best-matching Q&A topic
        best = None
        for i, qt in enumerate(qa_topics):
            if i in qa_used:
                continue
            a, b = name.lower(), qt["name"].lower()
            if a == b or a in b or b in a:
                best = (i, qt)
                break
        if best:
            qa_used.add(best[0])
            out.append({
                "name": name,
                "weight": (pt["weight"] + best[1]["weight"]) / 2,
                "mgmt": pt["tone"],
                "qa": best[1]["tone"],
            })
        else:
            out.append({"name": name, "weight": pt["weight"], "mgmt": pt["tone"], "qa": 0.0})

    # surface Q&A-only topics (analyst pushed on something mgmt didn't emphasize — interesting!)
    for i, qt in enumerate(qa_topics):
        if i not in qa_used:
            out.append({"name": qt["name"], "weight": qt["weight"], "mgmt": 0.0, "qa": qt["tone"]})

    # Sort by total airtime (weight)
    out.sort(key=lambda t: t["weight"], reverse=True)
    return out[:6]


# Optional company-name override map. If you want pretty company names in
# the dashboard, fill these in or fetch them from FMP's /profile endpoint.
COMPANY_NAMES: dict[str, str] = {
    "NVDA": "NVIDIA Corporation", "META": "Meta Platforms, Inc.",
    "TSLA": "Tesla, Inc.",        "INTC": "Intel Corporation",
    "AAPL": "Apple Inc.",          "MSFT": "Microsoft Corporation",
    "GOOGL": "Alphabet Inc.",      "AMZN": "Amazon.com, Inc.",
    "AMD": "Advanced Micro Devices", "NFLX": "Netflix, Inc.",
}

SECTOR_NAMES: dict[str, str] = {
    "SOXX": "Semiconductors", "IGV": "Software", "XLC": "Communication Services",
    "XLY": "Consumer Discretionary", "XLP": "Consumer Staples",
    "XLF": "Financials", "XLV": "Healthcare", "IBB": "Biotech",
    "XLI": "Industrials", "XLE": "Energy", "XLU": "Utilities",
    "XLB": "Materials", "XLRE": "Real Estate", "SPY": "Broad Market",
}


def export(df: pd.DataFrame, out_path: str | Path = "dashboard_data.json") -> dict:
    """Produce dashboard JSON from a pipeline DataFrame. Returns the dict and writes to disk.

    Rows with NaN in any numeric field needed by the dashboard are dropped — JSON
    cannot represent NaN (json.dumps(NaN) emits the literal `NaN`, which JS
    JSON.parse rejects). Rather than coercing NaN → 0 (which would silently
    misrepresent missing data as a real signal), we drop the call and warn.
    """
    from .prices import SECTOR_PROXY

    numeric_cols = ["mgmt_tone", "qa_tone", "hedging_qa", "guidance_confidence_qa",
                    "eps_surprise", "ret_5d", "residual_5d"]
    before = len(df)
    df = df.dropna(subset=numeric_cols).copy()
    if len(df) < before:
        print(f"  ⚠ Dropped {before - len(df)} rows with NaN in numeric fields")

    out: dict[str, dict] = {}
    for tk, grp in df.groupby("ticker"):
        grp = grp.sort_values("call_date").copy()
        if grp.empty:
            continue
        latest = grp.iloc[-1]

        quarters = []
        for _, r in grp.iterrows():
            quarters.append({
                "label": _short_label(r["quarter_label"]),
                "date": str(r["call_date"]),
                "mgmt": float(r["mgmt_tone"]),
                "qa": float(r["qa_tone"]),
                "hedging": float(r["hedging_qa"]),
                "guidance": float(r["guidance_confidence_qa"]),
                "eps_surprise": float(r["eps_surprise"]),
                "ret_5d": float(r["ret_5d"]),
                "residual_5d": float(r["residual_5d"]),
            })

        topics = _combine_topics(
            _coerce_listcell(latest["topics_prepared"]),
            _coerce_listcell(latest["topics_qa"]),
        )

        # Pull the most informative extracts: prefer evasion / admission
        # tags from Q&A, then confident from prepared.
        all_extracts = (
            _coerce_listcell(latest["extracts_qa"])
            + _coerce_listcell(latest["extracts_prepared"])
        )
        priority = {"evasion": 0, "admission": 1, "contradiction": 2, "hedging": 3, "confident": 4}
        all_extracts.sort(key=lambda e: priority.get(e.get("tag", ""), 99))
        extracts = all_extracts[:4]

        proxy = SECTOR_PROXY.get(tk, "SPY")
        out[tk] = {
            "company": COMPANY_NAMES.get(tk, tk),
            "sector": SECTOR_NAMES.get(proxy, "Other"),
            "quarters": quarters,
            "topics": topics,
            "extracts": extracts,
        }

    Path(out_path).write_text(json.dumps(out, indent=2))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv", help="signals.csv produced by src.cli")
    ap.add_argument("-o", "--out", default="dashboard_data.json")
    args = ap.parse_args()

    df = pd.read_csv(args.csv)
    out = export(df, args.out)
    n_calls = sum(len(c["quarters"]) for c in out.values())
    print(f"✓ Wrote {len(out)} tickers, {n_calls} calls → {args.out}")


if __name__ == "__main__":
    main()
