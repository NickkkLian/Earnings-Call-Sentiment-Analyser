"""Residual return arithmetic and the trading-day window, on a fixed synthetic price series (no network)."""
import math

import pandas as pd
import pytest

from src.prices import residual_return, _window_return, SECTOR_PROXY, DEFAULT_PROXY


def test_residual_removes_sector_beta_and_eps_surprise():
    # 5-day return 6%, sector moved 2% (beta 1), EPS beat 1% weighted by gamma 1.5 → 6 - 2 - 1.5 = 2.5%
    assert residual_return(0.06, 0.02, 0.01) == pytest.approx(0.025)


def test_residual_uses_beta_and_gamma():
    assert residual_return(0.06, 0.02, 0.01, beta=0.5, gamma=2.0) == pytest.approx(0.06 - 0.01 - 0.02)


def test_residual_is_zero_when_move_is_fully_explained():
    assert residual_return(0.035, 0.02, 0.01) == pytest.approx(0.0)


def _series():
    idx = pd.bdate_range("2025-08-20", periods=12)  # trading days only
    return pd.Series([100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111], index=idx, dtype=float)


def test_window_return_anchors_on_last_close_at_or_before_call_date():
    px = _series()
    # anchor on a Saturday: last close is Friday 2025-08-22 (102); 5 trading days later is 2025-08-29 (107)
    assert _window_return(px, pd.Timestamp("2025-08-23"), 5) == pytest.approx(107 / 102 - 1)


def test_window_return_is_nan_when_window_runs_past_the_series():
    px = _series()
    assert math.isnan(_window_return(px, pd.Timestamp("2025-09-03"), 22))


def test_window_return_is_nan_before_the_series_starts():
    assert math.isnan(_window_return(_series(), pd.Timestamp("2025-01-01"), 5))


def test_sector_proxy_map_is_well_formed():
    assert all(isinstance(k, str) and k.upper() == k for k in SECTOR_PROXY)
    assert set(SECTOR_PROXY.values()) <= {"SOXX", "IGV", "XLC", "XLY", "XLP", "XLF", "XLV", "IBB", "XLI", "XLE", "XLU", "XLB", "XLRE"}
    assert SECTOR_PROXY.get("NOT-A-TICKER", DEFAULT_PROXY) == "SPY"
