"""LLM-based section analyzer with swappable Anthropic / OpenAI backends.

Both providers are coerced into the same Pydantic shape (see schema.py),
so downstream code never has to branch on provider. Caching is keyed on
(text_hash, model, section_type) — change the model and you re-run; same
model on same text and we hit the cache.
"""
from __future__ import annotations

import os
import hashlib
from pathlib import Path
from typing import Literal, Protocol

from pydantic import ValidationError

from .schema import SectionAnalysis, CallAnalysis
from .transcripts import Transcript


# =========================================================================
# Prompt — the single most important line of code in this project.
# Iterate on this; everything downstream depends on extraction quality.
# =========================================================================

SYSTEM_PROMPT = """You are an equity research analyst extracting structured \
signals from an earnings call.

You will receive ONE section of a call (either prepared remarks OR analyst \
Q&A). Score it conservatively. Tone is the affect of the *speakers in this \
section*: management's framing in 'prepared'; the substance of analyst \
questions plus the directness of management answers in 'qa'.

Hedging density measures how often statements use language that softens \
commitment ('we believe', 'should', 'if conditions allow', 'depending on', \
'we expect'). Count it conservatively — only true hedges, not normal \
forward language.

Topics should be 4–6 themes that occupy meaningful airtime. Weights should \
roughly sum to 1.0. For Q&A, topic tone reflects the *exchange* (analyst \
question + management answer combined), not management alone.

Notable passages: extract 2–4 short, exemplary quotes. Tag each:
  - confident:    strong, unhedged forward-looking claim
  - hedging:      heavily qualified statement
  - evasion:      management did not directly answer the question asked
  - admission:    management acknowledged a problem or shortfall
  - contradiction: management framing conflicts with prior quarter or filings

Be conservative. If you would only weakly assign a tag, omit the passage.
Return strictly valid JSON conforming to the provided schema."""


def _user_prompt(section: Literal["prepared", "qa"], text: str,
                 ticker: str, quarter_label: str) -> str:
    return f"""Ticker: {ticker}
Quarter: {quarter_label}
Section: {section}

---
{text}
---

Extract the structured analysis."""


# =========================================================================
# Provider protocol
# =========================================================================

class Analyzer(Protocol):
    def analyze_section(self, *, ticker: str, quarter_label: str,
                        section: Literal["prepared", "qa"],
                        text: str) -> SectionAnalysis: ...


# =========================================================================
# Anthropic implementation
# =========================================================================

class AnthropicAnalyzer:
    def __init__(self, model: str = "claude-haiku-4-5-20251001", api_key: str | None = None):
        from anthropic import Anthropic
        self.client = Anthropic(api_key=api_key or os.environ["ANTHROPIC_API_KEY"])
        self.model = model

    def analyze_section(self, *, ticker, quarter_label, section, text):
        # Use tool use to force structured output
        tool = {
            "name": "submit_analysis",
            "description": "Submit the structured earnings call section analysis.",
            "input_schema": SectionAnalysis.model_json_schema(),
        }
        resp = self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            system=SYSTEM_PROMPT,
            tools=[tool],
            tool_choice={"type": "tool", "name": "submit_analysis"},
            messages=[{
                "role": "user",
                "content": _user_prompt(section, text, ticker, quarter_label),
            }],
        )
        for block in resp.content:
            if block.type == "tool_use" and block.name == "submit_analysis":
                return SectionAnalysis.model_validate(block.input)
        raise RuntimeError("Anthropic response had no tool_use block")


# =========================================================================
# OpenAI implementation
# =========================================================================

class OpenAIAnalyzer:
    def __init__(self, model: str = "gpt-4o-mini", api_key: str | None = None):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key or os.environ["OPENAI_API_KEY"])
        self.model = model

    def analyze_section(self, *, ticker, quarter_label, section, text):
        # Use OpenAI's structured-outputs parse helper. It accepts the
        # Pydantic class directly and handles all the schema massaging
        # (additionalProperties: false, required fields, $defs resolution)
        # that strict mode requires — Pydantic's raw model_json_schema()
        # does NOT satisfy strict mode on its own.
        completion = self.client.beta.chat.completions.parse(
            model=self.model,
            response_format=SectionAnalysis,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _user_prompt(section, text, ticker, quarter_label)},
            ],
        )
        parsed = completion.choices[0].message.parsed
        if parsed is None:
            # Refusal or parse failure — surface the refusal message if present
            refusal = completion.choices[0].message.refusal
            raise RuntimeError(f"OpenAI parse returned None (refusal={refusal!r})")
        return parsed


# =========================================================================
# Caching wrapper — works with any Analyzer
# =========================================================================

class CachedAnalyzer:
    def __init__(self, inner: Analyzer, cache_dir: str | Path = "./cache",
                 provider_label: str = "unknown"):
        self.inner = inner
        self.cache_dir = Path(cache_dir) / "llm"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.provider_label = provider_label
        # Hash the system prompt so any prompt iteration invalidates the cache.
        # Otherwise tweaking SYSTEM_PROMPT silently returns stale extractions.
        self._prompt_fp = hashlib.sha256(SYSTEM_PROMPT.encode()).hexdigest()[:8]

    def _cache_key(self, model: str, section: str, text: str) -> Path:
        h = hashlib.sha256()
        h.update(f"{self.provider_label}::{model}::{self._prompt_fp}::{section}::{text}".encode())
        return self.cache_dir / f"{h.hexdigest()[:24]}.json"

    def analyze_section(self, *, ticker, quarter_label, section, text):
        model = getattr(self.inner, "model", "default")
        path = self._cache_key(model, section, text)
        if path.exists():
            try:
                return SectionAnalysis.model_validate_json(path.read_text())
            except ValidationError:
                pass  # stale cache; re-run
        result = self.inner.analyze_section(
            ticker=ticker, quarter_label=quarter_label,
            section=section, text=text,
        )
        path.write_text(result.model_dump_json())
        return result


# =========================================================================
# Factory + full-call convenience
# =========================================================================

def make_analyzer(provider: str | None = None, model: str | None = None,
                  cache_dir: str = "./cache") -> CachedAnalyzer:
    provider = (provider or os.environ.get("LLM_PROVIDER", "anthropic")).lower()
    if provider == "anthropic":
        m = model or os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
        return CachedAnalyzer(AnthropicAnalyzer(model=m), cache_dir, "anthropic")
    if provider == "openai":
        m = model or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        return CachedAnalyzer(OpenAIAnalyzer(model=m), cache_dir, "openai")
    raise ValueError(f"Unknown provider: {provider}")


def analyze_call(transcript: Transcript, analyzer: CachedAnalyzer) -> CallAnalysis:
    prepared = analyzer.analyze_section(
        ticker=transcript.ticker, quarter_label=transcript.quarter_label,
        section="prepared", text=transcript.prepared_text,
    )
    qa = (
        analyzer.analyze_section(
            ticker=transcript.ticker, quarter_label=transcript.quarter_label,
            section="qa", text=transcript.qa_text,
        )
        if transcript.qa_text
        else SectionAnalysis(
            section="qa", tone=0.0, hedging_density=0.0, guidance_confidence=0.0,
            guidance_change="none", topics=[], notable_passages=[],
        )
    )
    return CallAnalysis(
        ticker=transcript.ticker,
        quarter_label=transcript.quarter_label,
        call_date=transcript.call_date,
        prepared=prepared,
        qa=qa,
    )
