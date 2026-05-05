"""Command-line entry point.

Usage:
    python -m src.cli --tickers NVDA,META,TSLA \\
                      --quarters 2024Q3,2024Q4,2025Q1,2025Q2 \\
                      --provider anthropic \\
                      --out signals.csv
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from dotenv import load_dotenv

from .pipeline import run, signal_correlation


def parse_quarter(s: str) -> tuple[int, int]:
    # accepts "2025Q2" or "Q2-2025"
    s = s.upper().replace("-", "")
    if "Q" not in s:
        raise ValueError(f"bad quarter: {s}")
    if s.startswith("Q"):
        q, y = s[1], s[2:]
    else:
        y, q = s.split("Q")
    return int(y), int(q)


def main(argv=None):
    load_dotenv()
    ap = argparse.ArgumentParser(description="Earnings call sentiment pipeline.")
    ap.add_argument("--tickers", required=True, help="Comma-separated, e.g. NVDA,META,TSLA")
    ap.add_argument("--quarters", required=True,
                    help="Comma-separated YYYYQn, e.g. 2024Q3,2024Q4,2025Q1")
    ap.add_argument("--provider", choices=["anthropic", "openai"], default=None)
    ap.add_argument("--model", default=None)
    ap.add_argument("--cache-dir", default="./cache")
    ap.add_argument("--out", default="signals.csv")
    args = ap.parse_args(argv)

    tickers = [t.strip().upper() for t in args.tickers.split(",")]
    quarters = [parse_quarter(q.strip()) for q in args.quarters.split(",")]
    pairs = [(t, y, q) for t in tickers for (y, q) in quarters]

    print(f"Running pipeline: {len(pairs)} (ticker, quarter) pairs")
    print(f"Provider: {args.provider or 'env default'} | Model: {args.model or 'env default'}")

    df = run(pairs, provider=args.provider, model=args.model, cache_dir=args.cache_dir)
    if df.empty:
        print("No data — check API keys and inputs.", file=sys.stderr)
        sys.exit(1)

    out = Path(args.out)
    df.to_csv(out, index=False)
    print(f"\n✓ Wrote {len(df)} rows → {out}")

    print("\nPer-ticker signal correlation (sentiment gap vs 5d residual return):")
    print(signal_correlation(df).to_string(index=False))


if __name__ == "__main__":
    main()
