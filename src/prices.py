"""Compute the return signal that pairs with our sentiment scores.

The hardest part of this project isn't NLP — it's making sure the price
reaction we're correlating against isn't just measuring the EPS beat.
We compute a *residual* return: the post-call price move net of
(a) sector beta and (b) the EPS surprise itself. What's left is what the
*tone* of the call added.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import timedelta

import pandas as pd
import requests
import yfinance as yf


DEFAULT_PROXY = "SPY"

# Sector ETF proxies. For the residual-return calculation we beta against
# the proxy, so we want one that's reasonably tight to the ticker's
# fundamentals — sector-ETF is crude but workable for a portfolio project.
# Production work would fit a proper multi-factor model.
SECTOR_PROXY: dict[str, str] = {
    # Semiconductors / hardware → SOXX
    **dict.fromkeys([
        "NVDA", "AMD", "INTC", "AVGO", "QCOM", "TSM", "ASML", "AMAT",
        "LRCX", "KLAC", "MRVL", "MU", "ON", "MCHP", "ADI", "TXN", "NXPI",
        "ARM", "WDC", "STX",
    ], "SOXX"),

    # Software / cloud → IGV
    **dict.fromkeys([
        "MSFT", "ORCL", "CRM", "ADBE", "NOW", "INTU", "SNPS", "CDNS",
        "WDAY", "PANW", "CRWD", "NET", "SNOW", "DDOG", "MDB", "TEAM",
        "ZM", "DOCU", "OKTA", "ZS", "FTNT", "S",
    ], "IGV"),

    # Communication services / internet → XLC
    **dict.fromkeys([
        "META", "GOOGL", "GOOG", "NFLX", "DIS", "T", "VZ", "TMUS",
        "EA", "TTWO", "SPOT", "MTCH", "PINS", "SNAP", "RBLX", "RDDT",
        "WBD", "PARA", "FOXA", "CHTR",
    ], "XLC"),

    # Consumer discretionary → XLY
    **dict.fromkeys([
        "AMZN", "TSLA", "HD", "NKE", "MCD", "SBUX", "BKNG", "LOW",
        "TGT", "F", "GM", "ABNB", "UBER", "DASH", "CMG", "MAR", "HLT",
        "RIVN", "LCID", "DKNG", "EBAY", "ETSY",
    ], "XLY"),

    # Consumer staples → XLP
    **dict.fromkeys([
        "WMT", "PG", "KO", "PEP", "COST", "PM", "MO", "MDLZ", "CL",
        "KMB", "GIS", "STZ", "KHC", "SYY", "K",
    ], "XLP"),

    # Financials → XLF
    **dict.fromkeys([
        "JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "SCHW", "AXP",
        "V", "MA", "PYPL", "COF", "USB", "PNC", "TFC", "BK", "SPGI",
        "MCO", "ICE", "CME", "COIN", "HOOD", "SQ",
    ], "XLF"),

    # Healthcare → XLV
    **dict.fromkeys([
        "UNH", "JNJ", "LLY", "PFE", "ABBV", "MRK", "TMO", "ABT",
        "DHR", "BMY", "AMGN", "GILD", "CVS", "CI", "ELV", "ISRG",
        "MDT", "SYK", "BSX", "ZTS", "HCA", "BDX",
    ], "XLV"),

    # Biotech (sub-sector for purer beta) → IBB
    **dict.fromkeys([
        "MRNA", "BIIB", "REGN", "VRTX", "ILMN", "BMRN", "INCY",
        "ALNY", "BEAM", "CRSP",
    ], "IBB"),

    # Industrials → XLI
    **dict.fromkeys([
        "BA", "CAT", "DE", "UPS", "FDX", "GE", "HON", "RTX", "LMT",
        "NOC", "MMM", "EMR", "ETN", "ITW", "PH", "CSX", "UNP", "NSC",
        "GD", "TDG",
    ], "XLI"),

    # Energy → XLE
    **dict.fromkeys([
        "XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "OXY",
        "VLO", "PXD", "HES", "FANG", "DVN", "BKR", "HAL",
    ], "XLE"),

    # Utilities → XLU
    **dict.fromkeys([
        "NEE", "DUK", "SO", "AEP", "D", "EXC", "SRE", "XEL", "PEG",
    ], "XLU"),

    # Materials → XLB
    **dict.fromkeys([
        "LIN", "FCX", "NEM", "APD", "SHW", "ECL", "DOW", "NUE", "CTVA",
    ], "XLB"),

    # Real estate → XLRE
    **dict.fromkeys([
        "AMT", "PLD", "SPG", "EQIX", "DLR", "CCI", "WELL", "PSA",
        "O", "VICI", "EXR",
    ], "XLRE"),
}


@dataclass
class PriceReaction:
    ticker: str
    call_date: str
    eps_actual: float
    eps_estimate: float
    eps_surprise: float           # (actual - estimate) / |estimate|
    return_1d: float
    return_5d: float
    return_30d: float
    sector_return_5d: float
    residual_5d: float            # return_5d - β*sector - γ*surprise


def fetch_eps_surprise(ticker: str, call_date: str, api_key: str | None = None) -> tuple[float, float, float]:
    """Pull (actual_eps, estimated_eps, surprise%) from FMP for the quarter ending on/around call_date."""
    api_key = api_key or os.environ.get("FMP_API_KEY")
    url = f"https://financialmodelingprep.com/api/v3/earnings-surprises/{ticker.upper()}"
    r = requests.get(url, params={"apikey": api_key}, timeout=30)
    r.raise_for_status()
    rows = r.json()
    target = pd.to_datetime(call_date)
    # Pick the row with the closest reporting date ≤ call date
    candidates = [row for row in rows if pd.to_datetime(row["date"]) <= target + pd.Timedelta(days=2)]
    if not candidates:
        raise ValueError(f"No EPS row found for {ticker} near {call_date}")
    row = max(candidates, key=lambda r: pd.to_datetime(r["date"]))
    actual = float(row["actualEarningsResult"])
    est = float(row["estimatedEarning"])
    surprise = (actual - est) / abs(est) if est else 0.0
    return actual, est, surprise


def _window_return(prices: pd.Series, anchor: pd.Timestamp, days: int) -> float:
    """Return from the last close at/before `anchor` to `days` trading days after."""
    pre = prices.loc[:anchor]
    if pre.empty:
        return float("nan")
    p0 = pre.iloc[-1]
    post_idx = prices.index.get_loc(pre.index[-1]) + days
    if post_idx >= len(prices):
        return float("nan")
    p1 = prices.iloc[post_idx]
    return float(p1 / p0 - 1.0)


def compute_reaction(ticker: str, call_date: str,
                     beta: float = 1.0, gamma: float = 1.5) -> PriceReaction:
    """Compute the price reaction for a given call.

    `gamma` weights the EPS-surprise control. 1.5 is a rough rule of thumb
    (a 1% beat moves the stock ~1.5% on average for large-cap tech).
    Replace with a fitted coefficient when you have enough samples.
    """
    anchor = pd.to_datetime(call_date)
    start = (anchor - timedelta(days=10)).strftime("%Y-%m-%d")
    end = (anchor + timedelta(days=45)).strftime("%Y-%m-%d")

    proxy = SECTOR_PROXY.get(ticker.upper(), DEFAULT_PROXY)
    px = yf.download([ticker, proxy], start=start, end=end,
                     auto_adjust=True, progress=False)["Close"]

    r1 = _window_return(px[ticker], anchor, 1)
    r5 = _window_return(px[ticker], anchor, 5)
    r30 = _window_return(px[ticker], anchor, 22)  # ~30 calendar ≈ 22 trading
    sector5 = _window_return(px[proxy], anchor, 5)

    eps_actual, eps_est, surprise = fetch_eps_surprise(ticker, call_date)

    residual = r5 - beta * sector5 - gamma * surprise

    return PriceReaction(
        ticker=ticker.upper(),
        call_date=call_date,
        eps_actual=eps_actual,
        eps_estimate=eps_est,
        eps_surprise=surprise,
        return_1d=r1,
        return_5d=r5,
        return_30d=r30,
        sector_return_5d=sector5,
        residual_5d=residual,
    )
