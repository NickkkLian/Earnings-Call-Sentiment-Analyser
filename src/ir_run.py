"""Run the pipeline on earnings calls whose transcripts the companies publish on their own investor-relations sites,
and write the dashboard's default data (docs/real-data.js).

    python -m src.ir_run                      # reads data/ir-calls.json, needs ANTHROPIC_API_KEY
    python -m src.ir_run --max-usd 3          # stop before the estimated model spend passes this

Each call in data/ir-calls.json names the company's own transcript URL and the SHA-256 of the file that was scored; a
download that does not match is refused. Transcripts are cached under cache/ir/ and are not part of the repository.
What the dashboard file keeps from the transcripts: the model's scores, and at most a few quotes per company taken only
from the prepared remarks, each at most 25 words and found word for word in the transcript. Analyst questions are
scored but never quoted, and no analyst is named.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import html
import io
import json
import re
import urllib.request
import zipfile
from pathlib import Path

import pandas as pd

from . import llm
from .analyzer import analyze_call, make_analyzer
from .export_dashboard import export
from .prices import compute_reaction
from .transcripts import Transcript, split_prepared_qa

ROOT = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (research script; CallDelta)"
# US$ per million tokens, first-party Claude API list prices (input, output)
PRICES = {"claude-sonnet-5": (2.00, 10.00), "claude-opus-5-5": (4.00, 20.00)}


def fetch(url: str, dest: Path, sha256: str | None) -> bytes:
    if dest.exists():
        raw = dest.read_bytes()
    else:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
            raw = r.read()
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(raw)
    got = hashlib.sha256(raw).hexdigest()
    if sha256 and got != sha256:
        raise ValueError(f"{url}: SHA-256 {got} does not match the manifest ({sha256}); the published file changed")
    return raw


def to_text(raw: bytes, fmt: str) -> str:
    if fmt == "docx":
        xml = zipfile.ZipFile(io.BytesIO(raw)).read("word/document.xml").decode("utf-8")
        paras = ("".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p)) for p in re.findall(r"<w:p[ >].*?</w:p>", xml, re.S))
        return "\n".join(html.unescape(p).strip() for p in paras if p.strip())
    if fmt == "pdf":
        from pdfminer.high_level import extract_text  # pdfminer.six (MIT)
        return extract_text(io.BytesIO(raw))
    raise ValueError(f"unknown transcript format {fmt!r}")


def spent_usd(model: str) -> tuple[int, int, float]:
    tin = sum((u["usage"] or {}).get("input_tokens", 0) for u in llm.USAGE_LOG)
    tout = sum((u["usage"] or {}).get("output_tokens", 0) for u in llm.USAGE_LOG)
    pin, pout = PRICES[model]
    return tin, tout, tin / 1e6 * pin + tout / 1e6 * pout


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--manifest", default=str(ROOT / "data" / "ir-calls.json"))
    ap.add_argument("--model", default="claude-sonnet-5", choices=sorted(PRICES))
    ap.add_argument("--max-usd", type=float, default=3.0, help="stop before the estimated spend passes this")
    ap.add_argument("--cache-dir", default=str(ROOT / "cache"))
    ap.add_argument("--out", default=str(ROOT / "docs" / "real-data.js"))
    args = ap.parse_args(argv)

    manifest = json.loads(Path(args.manifest).read_text())
    analyzer = make_analyzer(provider="anthropic", model=args.model, cache_dir=args.cache_dir, structured="json")
    rows, prepared_text, meta_calls = [], {}, []
    # Spending guard, checked before every request (cached answers cost nothing and are not checked): stop if the spend
    # so far plus the worst case of this request (its max_tokens all used, input at ~3 characters per token) could pass
    # the cap.
    complete = llm.complete

    def guarded(cfg, system, user, max_tokens=2048, **kw):
        _, _, usd = spent_usd(args.model)
        worst = max_tokens / 1e6 * PRICES[args.model][1] + (len(system) + len(user)) / 3 / 1e6 * PRICES[args.model][0]
        if usd + worst > args.max_usd:
            raise SystemExit(f"stopping: ${usd:.3f} spent, the next request could pass ${args.max_usd}")
        return complete(cfg, system, user, max_tokens=max_tokens, **kw)
    llm.complete = guarded
    for c in manifest["calls"]:
        raw = fetch(c["source_url"], Path(args.cache_dir) / "ir" / f"{c['ticker']}.{c['format']}", c.get("sha256"))
        text = to_text(raw, c["format"])
        prepared, qa = split_prepared_qa(text)
        tr = Transcript(ticker=c["ticker"], year=c["year"], quarter=c["quarter"], call_date=c["call_date"],
                        prepared_text=prepared, qa_text=qa)
        call = analyze_call(tr, analyzer)
        rxn = compute_reaction(c["ticker"], c["call_date"])
        prepared_text[c["ticker"]] = tr.prepared_text
        rows.append({
            "ticker": c["ticker"], "quarter_label": c["label"], "call_date": c["call_date"],
            "mgmt_tone": call.prepared.tone, "qa_tone": call.qa.tone, "sentiment_gap": call.sentiment_gap,
            "hedging_prepared": call.prepared.hedging_density, "hedging_qa": call.qa.hedging_density,
            "guidance_confidence_qa": call.qa.guidance_confidence, "guidance_change_qa": call.qa.guidance_change,
            "topics_prepared": [t.model_dump() for t in call.prepared.topics],
            "topics_qa": [t.model_dump() for t in call.qa.topics],
            "extracts_prepared": [p.model_dump() for p in call.prepared.notable_passages],
            "extracts_qa": [],   # Q&A passages can quote or name analysts; they are never exported
            "eps_actual": rxn.eps_actual, "eps_estimate": rxn.eps_estimate, "eps_surprise": rxn.eps_surprise,
            "ret_1d": rxn.return_1d, "ret_5d": rxn.return_5d, "ret_30d": rxn.return_30d,
            "sector_5d": rxn.sector_return_5d, "residual_5d": rxn.residual_5d,
        })
        meta_calls.append({k: c[k] for k in ("ticker", "company", "label", "call_date", "source_page", "source_url")})
        print(f"  {c['ticker']} {c['label']}: prepared {len(tr.prepared_text.split())} words, "
              f"Q&A {len(tr.qa_text.split())} words, tone {call.prepared.tone:+.2f} / {call.qa.tone:+.2f}")

    out = export(pd.DataFrame(rows), Path(args.cache_dir) / "real-data.json", extract_sections=("prepared",),
                 max_quote_words=25, verbatim_in=prepared_text)
    out = {c["ticker"]: out[c["ticker"]] for c in manifest["calls"]}   # tabs in manifest order
    for c in manifest["calls"]:
        out[c["ticker"]]["company"] = c["company"]
        out[c["ticker"]]["source_url"] = c["source_url"]
        out[c["ticker"]]["quarters"][0]["label"] = c["label"]
        if c.get("note"):
            out[c["ticker"]]["note"] = c["note"]
    tin, tout, usd = spent_usd(args.model)
    meta = {"run_date": dt.date.today().isoformat(), "model": args.model, "calls": meta_calls,
            "eps_source": "Yahoo Finance earnings calendar (yfinance)", "price_source": "Yahoo Finance daily closes (yfinance)"}
    Path(args.out).write_text(
        "/* real-data.js — written by `python -m src.ir_run`: real model output for the earnings calls listed in\n"
        "   data/ir-calls.json, scored from each company's own published transcript. Do not edit by hand. */\n"
        f"window.CALLDELTA_REAL_META = {json.dumps(meta, indent=1, ensure_ascii=False)};\n"
        f"window.CALLDELTA_REAL = {json.dumps(out, indent=1, ensure_ascii=False)};\n", encoding="utf-8")
    print("models reported by the API:", sorted({u["model"] for u in llm.USAGE_LOG}) or "none (all answers from cache/llm)")
    print(f"wrote {args.out}: {len(out)} companies · {len(llm.USAGE_LOG)} requests · "
          f"{tin} input + {tout} output tokens · ≈ ${usd:.3f} at ${PRICES[args.model][0]}/${PRICES[args.model][1]} per MTok")


if __name__ == "__main__":
    main()
