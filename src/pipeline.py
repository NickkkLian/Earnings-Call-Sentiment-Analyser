"""End-to-end pipeline: tickers/quarters → transcripts → LLM → prices → DataFrame.

Output is a long-format DataFrame with one row per (ticker, quarter), ready
for Plotly / Pandas / correlation work.
"""
from __future__ import annotations

from typing import Iterable

import pandas as pd

from .transcripts import get_transcript
from .prices import compute_reaction
from .analyzer import make_analyzer, analyze_call


def run(tickers_quarters: Iterable[tuple[str, int, int]],
        provider: str | None = None,
        model: str | None = None,
        cache_dir: str = "./cache") -> pd.DataFrame:
    """
    tickers_quarters: iterable of (ticker, year, quarter), e.g.
        [("NVDA", 2025, 2), ("NVDA", 2025, 3), ("META", 2025, 2), ...]

    Returns a DataFrame with one row per call:
      ticker, quarter_label, call_date,
      mgmt_tone, qa_tone, sentiment_gap,
      hedging_prepared, hedging_qa,
      guidance_confidence_qa, guidance_change_qa,
      topics_prepared (json), topics_qa (json),
      eps_actual, eps_estimate, eps_surprise,
      ret_1d, ret_5d, ret_30d, sector_5d, residual_5d
    """
    analyzer = make_analyzer(provider=provider, model=model, cache_dir=cache_dir)
    rows = []

    for ticker, year, quarter in tickers_quarters:
        try:
            tr = get_transcript(ticker, year, quarter, cache_dir=cache_dir)
            call = analyze_call(tr, analyzer)
            rxn = compute_reaction(ticker, tr.call_date)
        except Exception as e:
            print(f"  ⚠ {ticker} Q{quarter} {year}: {type(e).__name__}: {e}")
            continue

        rows.append({
            "ticker": ticker.upper(),
            "quarter_label": call.quarter_label,
            "call_date": call.call_date,
            # sentiment
            "mgmt_tone": call.prepared.tone,
            "qa_tone": call.qa.tone,
            "sentiment_gap": call.sentiment_gap,
            "hedging_prepared": call.prepared.hedging_density,
            "hedging_qa": call.qa.hedging_density,
            "guidance_confidence_qa": call.qa.guidance_confidence,
            "guidance_change_qa": call.qa.guidance_change,
            "topics_prepared": [t.model_dump() for t in call.prepared.topics],
            "topics_qa": [t.model_dump() for t in call.qa.topics],
            "extracts_prepared": [p.model_dump() for p in call.prepared.notable_passages],
            "extracts_qa": [p.model_dump() for p in call.qa.notable_passages],
            # market
            "eps_actual": rxn.eps_actual,
            "eps_estimate": rxn.eps_estimate,
            "eps_surprise": rxn.eps_surprise,
            "ret_1d": rxn.return_1d,
            "ret_5d": rxn.return_5d,
            "ret_30d": rxn.return_30d,
            "sector_5d": rxn.sector_return_5d,
            "residual_5d": rxn.residual_5d,
        })

    df = pd.DataFrame(rows)
    if not df.empty:
        df = df.sort_values(["ticker", "call_date"]).reset_index(drop=True)
    return df


# Convenience: return correlation between sentiment_gap and residual_5d
def signal_correlation(df: pd.DataFrame) -> pd.DataFrame:
    """Per-ticker Pearson correlation between sentiment_gap and 5d residual return.

    With <30 calls per ticker these are noisy — the value is methodological,
    not a tradeable signal. Be honest about that.
    """
    out = []
    for tk, grp in df.groupby("ticker"):
        if len(grp) < 4:
            out.append({"ticker": tk, "n": len(grp), "corr_gap_residual": float("nan")})
            continue
        out.append({
            "ticker": tk,
            "n": len(grp),
            "corr_gap_residual": grp["sentiment_gap"].corr(grp["residual_5d"]),
            "corr_hedging_residual": grp["hedging_qa"].corr(grp["residual_5d"]),
        })
    return pd.DataFrame(out)
