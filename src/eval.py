"""Small evaluation set for the LLM extraction step (not a formal evaluation pipeline).

    python -m src.eval            # score cached model output; NOT RUN (exit 2) until a cache exists
    python -m src.eval --llm      # populate eval/llm-cache.json with one model run (LLM_PROVIDER + that provider's key; see README)
    python -m src.eval --break    # corrupt one cached entry in a temporary copy and require the scorer to reject it

Two scores: passage tag accuracy (30 synthetic passages, five tags) and guidance_change accuracy (10 synthetic snippets).
The cache records the model name and date so the README can say exactly what was scored. Exit 0 = both scores at or
above the thresholds in eval/passages.json; 1 = below; 2 = not run (no cache) or a malformed cache.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
import sys
import tempfile
from pathlib import Path

from .schema import Passage, SectionAnalysis

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "eval" / "passages.json"
CACHE = ROOT / "eval" / "llm-cache.json"
TAGS = ("confident", "hedging", "evasion", "admission", "contradiction")
GUIDANCE = ("raise", "hold", "lower", "none")


def load_cache(path: Path = CACHE) -> dict:
    if not path.exists():
        return {"model": None, "generated": None, "provider": None, "passages": {}, "guidance": {}}
    cache = json.loads(path.read_text(encoding="utf-8"))
    validate_cache(cache)
    return cache


def validate_cache(cache: dict) -> None:
    for k in ("passages", "guidance"):
        if not isinstance(cache.get(k), dict):
            raise ValueError(f"llm-cache: '{k}' must be an object")
    for pid, tag in cache["passages"].items():
        if tag not in TAGS:
            raise ValueError(f"llm-cache: tag {tag!r} for {pid} is outside the allowed set")
    for gid, g in cache["guidance"].items():
        if g not in GUIDANCE:
            raise ValueError(f"llm-cache: guidance_change {g!r} for {gid} is outside the allowed set")
    if (cache["passages"] or cache["guidance"]) and not (cache.get("model") and cache.get("generated")):
        raise ValueError("llm-cache: model and generated date are required once entries exist")


def run_model(spec: dict, cache: dict) -> dict:
    """Ask the configured provider through the project's own analyzer path (same prompt, same schema)."""
    from .analyzer import make_analyzer

    analyzer = make_analyzer(cache_dir=str(ROOT / "cache"))
    for p in spec["passages"]:
        if p["id"] in cache["passages"]:
            continue
        section: SectionAnalysis = analyzer.analyze_section(
            ticker="EVAL", quarter_label="Q0 0000", section="qa",
            text=f"Analyst: Please comment. Management: {p['text']}" if not p["text"].startswith("Analyst:") else p["text"],
        )
        tags = [x.tag for x in section.notable_passages]
        cache["passages"][p["id"]] = tags[0] if tags else "hedging"  # an empty extraction counts as the weakest tag
    for g in spec["guidance"]:
        if g["id"] in cache["guidance"]:
            continue
        section = analyzer.analyze_section(ticker="EVAL", quarter_label="Q0 0000", section="prepared", text=g["text"])
        cache["guidance"][g["id"]] = section.guidance_change
    inner = analyzer.inner
    cache["model"] = getattr(inner, "model", "unknown")   # provider records e.g. "gemini/json" — structured mode included
    cache["provider"] = analyzer.provider_label
    cache["generated"] = dt.date.today().isoformat()
    return cache


def score(spec: dict, cache: dict) -> tuple[int, str]:
    lines = []
    if len(cache["passages"]) < len(spec["passages"]) or len(cache["guidance"]) < len(spec["guidance"]):
        lines.append(f"NOT RUN: cached model output covers {len(cache['passages'])}/{len(spec['passages'])} passages and "
                     f"{len(cache['guidance'])}/{len(spec['guidance'])} guidance items. Populate with: python -m src.eval --llm")
        return 2, "\n".join(lines)
    tag_hits = [p for p in spec["passages"] if cache["passages"][p["id"]] == p["expected_tag"]]
    g_hits = [g for g in spec["guidance"] if cache["guidance"][g["id"]] == g["expected_guidance_change"]]
    tag_acc, g_acc = len(tag_hits) / len(spec["passages"]), len(g_hits) / len(spec["guidance"])
    lines.append(f"model {cache['model']} ({cache['provider']}, {cache['generated']})")
    per_tag = {t: (sum(1 for p in tag_hits if p["expected_tag"] == t), sum(1 for p in spec["passages"] if p["expected_tag"] == t)) for t in TAGS}
    lines.append(f"passage tags: {len(tag_hits)}/{len(spec['passages'])} = {tag_acc:.0%} · " + " · ".join(f"{t} {a}/{b}" for t, (a, b) in per_tag.items()))
    lines.append(f"guidance_change: {len(g_hits)}/{len(spec['guidance'])} = {g_acc:.0%}")
    for p in spec["passages"]:
        if cache["passages"][p["id"]] != p["expected_tag"]:
            lines.append(f"  miss {p['id']}: expected {p['expected_tag']}, got {cache['passages'][p['id']]} · {p['text'][:70]}…")
    for g in spec["guidance"]:
        if cache["guidance"][g["id"]] != g["expected_guidance_change"]:
            lines.append(f"  miss {g['id']}: expected {g['expected_guidance_change']}, got {cache['guidance'][g['id']]}")
    th = spec["pass_threshold"]
    ok = tag_acc >= th["tag"] and g_acc >= th["guidance_change"]
    lines.append(("EVAL PASS" if ok else "EVAL FAIL") + f" (thresholds tag {th['tag']:.0%}, guidance {th['guidance_change']:.0%})")
    return (0 if ok else 1), "\n".join(lines)


def break_eval() -> int:
    """Negative control: a cached tag outside the schema must make the scorer refuse (exit 2), never pass."""
    spec = json.loads(SPEC.read_text(encoding="utf-8"))
    with tempfile.TemporaryDirectory() as td:
        bad = Path(td) / "llm-cache.json"
        cache = {"model": "mutated", "provider": "mutated", "generated": "2026-01-01",
                 "passages": {p["id"]: p["expected_tag"] for p in spec["passages"]},
                 "guidance": {g["id"]: g["expected_guidance_change"] for g in spec["guidance"]}}
        cache["passages"]["p01"] = "sarcasm"
        bad.write_text(json.dumps(cache), encoding="utf-8")
        print("MUTATION wrote a cache whose p01 tag is 'sarcasm' (outside the schema) into a temporary copy")
        try:
            load_cache(bad)
        except ValueError as e:
            print("EXPECTED FAILURE OBSERVED: " + str(e))
            return 0
        print("FAIL: the mutated cache was accepted")
        return 1


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--llm", action="store_true", help="populate the cache with one model run")
    ap.add_argument("--break", dest="brk", action="store_true", help="negative control")
    args = ap.parse_args(argv)
    if args.brk:
        return break_eval()
    spec = json.loads(SPEC.read_text(encoding="utf-8"))
    try:
        cache = load_cache()
    except ValueError as e:
        print("FAIL: " + str(e))
        return 2
    if args.llm:
        cache = run_model(spec, cache)
        validate_cache(cache)
        CACHE.write_text(json.dumps(cache, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"cache written: {len(cache['passages'])} passages, {len(cache['guidance'])} guidance items ({cache['model']})")
    code, report = score(spec, cache)
    print(report)
    return code


if __name__ == "__main__":
    sys.exit(main())
