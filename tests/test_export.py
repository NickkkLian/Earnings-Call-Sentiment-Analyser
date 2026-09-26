"""Dashboard export: topic merging across sections, label shortening, NaN rows dropped rather than zeroed."""
import json

import pandas as pd

from src.export_dashboard import _combine_topics, _short_label, _coerce_listcell, export


def test_short_label():
    assert _short_label("Q2 2025") == "Q2 25"
    assert _short_label("FY 2025") == "FY 2025"


def test_combine_topics_matches_by_substring_and_surfaces_qa_only_topics():
    prepared = [{"name": "Data Center", "weight": 0.5, "tone": 0.8}, {"name": "Margins", "weight": 0.3, "tone": 0.4}]
    qa = [{"name": "data center demand", "weight": 0.4, "tone": 0.2}, {"name": "China", "weight": 0.3, "tone": -0.5}]
    out = _combine_topics(prepared, qa)
    by = {t["name"]: t for t in out}
    assert by["Data Center"]["qa"] == 0.2 and by["Data Center"]["weight"] == 0.45
    assert by["Margins"]["qa"] == 0.0 and by["Margins"]["qa_missing"] is True, \
        "an unmatched prepared topic carries a placeholder Q&A tone, flagged as missing"
    assert by["China"]["mgmt"] == 0.0 and by["China"]["mgmt_missing"] is True and by["China"]["qa"] == -0.5, \
        "analysts pushed on something management did not raise"
    assert "qa_missing" not in by["Data Center"] and "mgmt_missing" not in by["Data Center"]
    assert [t["weight"] for t in out] == sorted([t["weight"] for t in out], reverse=True)


def test_combine_topics_caps_at_six():
    prepared = [{"name": f"T{i}", "weight": 0.1, "tone": 0.0} for i in range(8)]
    assert len(_combine_topics(prepared, [])) == 6


def test_coerce_listcell_accepts_json_python_repr_and_nan():
    assert _coerce_listcell('[{"a": 1}]') == [{"a": 1}]
    assert _coerce_listcell("[{'a': 1}]") == [{"a": 1}]
    assert _coerce_listcell(float("nan")) == []
    assert _coerce_listcell([1]) == [1]


def _row(ticker, label, date, **over):
    base = dict(ticker=ticker, quarter_label=label, call_date=date, mgmt_tone=0.5, qa_tone=0.2, hedging_qa=0.3,
                guidance_confidence_qa=0.7, eps_surprise=0.01, ret_5d=0.02, residual_5d=0.005,
                topics_prepared=json.dumps([{"name": "Margins", "weight": 1.0, "tone": 0.5}]), topics_qa="[]",
                extracts_prepared="[]", extracts_qa=json.dumps([{"tag": "evasion", "speaker": "CEO", "text": "x"}]))
    base.update(over)
    return base


def test_export_drops_nan_rows_instead_of_zeroing_them(tmp_path, capsys):
    df = pd.DataFrame([_row("NWSC", "Q1 2025", "2025-05-28"), _row("NWSC", "Q2 2025", "2025-08-27", residual_5d=float("nan"))])
    out = export(df, tmp_path / "d.json")
    assert [q["label"] for q in out["NWSC"]["quarters"]] == ["Q1 25"]
    assert "Dropped 1 rows" in capsys.readouterr().out
    assert json.loads((tmp_path / "d.json").read_text())["NWSC"]["extracts"][0]["tag"] == "evasion"
    assert out["NWSC"]["sector"] == "Broad Market", "unknown tickers fall back to the SPY proxy"


def test_export_carries_the_parts_of_the_residual(tmp_path):
    """sector_5d, beta and gamma are exported so the dashboard can re-derive residual_5d; a file without sector_5d still exports"""
    from src.prices import residual_return
    r1 = _row("NWSC", "Q1 2025", "2025-05-28", ret_5d=0.034, eps_surprise=0.052, sector_5d=-0.049)
    r1["residual_5d"] = residual_return(r1["ret_5d"], r1["sector_5d"], r1["eps_surprise"])
    out = export(pd.DataFrame([r1]), tmp_path / "d.json")
    c = out["NWSC"]
    q = c["quarters"][0]
    assert (c["beta"], c["gamma"]) == (1.0, 1.5)
    assert q["sector_5d"] == -0.049
    assert abs(q["ret_5d"] - c["beta"] * q["sector_5d"] - c["gamma"] * q["eps_surprise"] - q["residual_5d"]) < 1e-12
    legacy = export(pd.DataFrame([_row("HRBS", "Q1 2025", "2025-05-28")]), tmp_path / "e.json")
    assert "sector_5d" not in legacy["HRBS"]["quarters"][0], "no sector_5d column → field omitted, the page shows 'not checkable'"


def test_select_extracts_can_keep_only_short_verbatim_prepared_quotes():
    from src.export_dashboard import select_extracts
    prepared = [{"tag": "confident", "speaker": "CEO", "text": "We delivered \u201crecord\u201d revenue this quarter."},
                {"tag": "hedging", "speaker": "CFO", "text": "We expect growth to moderate somewhat."},   # paraphrase
                {"tag": "admission", "speaker": "CFO", "text": " ".join(["word"] * 26)}]                  # too long
    qa = [{"tag": "evasion", "speaker": "Analyst", "text": "Can you break that out?"}]
    source = 'Thanks. We delivered "record"   revenue this quarter. Growth may moderate. ' + " ".join(["word"] * 26)
    out = select_extracts(prepared, qa, sections=("prepared",), max_words=25, verbatim_in=source)
    assert [e["speaker"] for e in out] == ["CEO"]
    long = [{"tag": "confident", "speaker": "CEO", "text": "Revenue grew. " + " ".join(["more"] * 30) + "."}]
    cut = select_extracts(long, [], sections=("prepared",), max_words=25, verbatim_in="Revenue grew. " + " ".join(["more"] * 30))
    assert [e["text"] for e in cut] == ["Revenue grew."], "an over-long passage keeps its leading sentences that fit"
    glued = [{"tag": "admission", "speaker": "CFO", "text": "Expenses were $4 billion... including charges."},
             {"tag": "admission", "speaker": "CFO", "text": "partially offset by charges."}]
    assert select_extracts(glued, [], sections=("prepared",), max_words=25,
                           verbatim_in="Expenses were $4 billion, including charges. Growth, partially offset by charges.") == [], \
        "an elided passage and a mid-sentence fragment are not publishable quotes"
    clause = [{"tag": "confident", "speaker": "CEO", "text": "Ads grew faster than ever -- " + " ".join(["so"] * 30) + "."}]
    assert select_extracts(clause, [], sections=("prepared",), max_words=25, verbatim_in=clause[0]["text"])[0]["text"] \
        == "Ads grew faster than ever \u2026"
    assert select_extracts(prepared, qa)[0]["speaker"] == "Analyst", "the default still ranks Q&A evasion first"
