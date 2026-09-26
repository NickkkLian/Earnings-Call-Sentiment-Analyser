"""LLM-based section analyzer with swappable Anthropic / OpenAI backends.

Both providers are coerced into the same Pydantic shape (see schema.py),
so downstream code never has to branch on provider. Caching is keyed on
(text_hash, model, section_type) — change the model and you re-run; same
model on same text and we hit the cache.
"""
from __future__ import annotations

import json
import os
import hashlib
from pathlib import Path
from typing import Literal, Protocol

from pydantic import ValidationError

from . import llm
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
# Model-agnostic implementation (default): Claude, OpenAI, Gemini, any OpenAI-compatible endpoint
# =========================================================================

JSON_INSTRUCTIONS = """

Reply with ONE JSON object and nothing else. It must validate against this JSON Schema:
{schema}"""


class JsonAnalyzer:
    """Plain HTTP through src/llm.py — no SDK, no tool calling, no vendor JSON mode.

    The schema is stated in the prompt, the reply is parsed and validated with Pydantic, and a reply that does not
    validate gets exactly one repair round (the validation errors are sent back). A second failure raises, so a
    model that cannot follow the schema produces an error, never a half-valid row.
    """

    def __init__(self, cfg: dict, max_repairs: int = 1, opener=None):
        self.cfg = cfg
        self.model = cfg["model"]
        self.max_repairs = max_repairs
        self.opener = opener
        schema = json.dumps(SectionAnalysis.model_json_schema(), separators=(",", ":"))
        self.system = SYSTEM_PROMPT + JSON_INSTRUCTIONS.format(schema=schema)
        self.prompt_suffix = JSON_INSTRUCTIONS.format(schema=schema)
        self.calls = 0

    def _ask(self, user: str) -> str:
        self.calls += 1
        # 16000: on Claude Sonnet 5 thinking is on by default and counts toward max_tokens
        text, _model = llm.complete(self.cfg, self.system, user, max_tokens=16000, opener=self.opener)
        return text

    def analyze_section(self, *, ticker, quarter_label, section, text):
        user = _user_prompt(section, text, ticker, quarter_label)
        reply = self._ask(user)
        for attempt in range(self.max_repairs + 1):
            try:
                obj = llm.extract_json(reply, kind="object")
                result = SectionAnalysis.model_validate(obj)
                if result.section != section:
                    raise ValueError(f"section is {result.section!r}, expected {section!r}")
                return result
            except (ValueError, ValidationError) as e:
                if attempt == self.max_repairs:
                    raise RuntimeError(f"{llm.describe(self.cfg)}: reply did not match the schema after "
                                       f"{self.max_repairs} repair round(s): {str(e)[:400]}") from None
                reply = self._ask(user + "\n\nYour previous reply did not validate:\n" + str(e)[:1500]
                                  + "\n\nPrevious reply:\n" + reply[:4000]
                                  + "\n\nReply again with ONE corrected JSON object only.")
        raise AssertionError("unreachable")


# =========================================================================
# Native structured output (opt-in: --structured native). Uses a vendor-only
# feature, so it is never the default path.
# =========================================================================

# =========================================================================
# Anthropic implementation
# =========================================================================

class AnthropicAnalyzer:
    def __init__(self, model: str = "claude-sonnet-5", api_key: str | None = None):
        from anthropic import Anthropic
        self.client = Anthropic(api_key=api_key or os.environ["ANTHROPIC_API_KEY"])
        self.model = model

    def analyze_section(self, *, ticker, quarter_label, section, text):
        # Tool use carries the schema. Claude Sonnet 5 and Opus 5.5 reject a forced tool_choice, so the tool is offered
        # with tool_choice auto and the prompt asks for it; a reply without the tool call is an error.
        tool = {
            "name": "submit_analysis",
            "description": "Submit the structured earnings call section analysis.",
            "input_schema": SectionAnalysis.model_json_schema(),
        }
        resp = self.client.messages.create(
            model=self.model,
            max_tokens=16000,   # thinking is on by default on Sonnet 5 and counts toward max_tokens
            system=SYSTEM_PROMPT + "\n\nSubmit your analysis by calling the submit_analysis tool exactly once.",
            tools=[tool],
            tool_choice={"type": "auto"},
            messages=[{
                "role": "user",
                "content": _user_prompt(section, text, ticker, quarter_label),
            }],
        )
        if resp.stop_reason == "refusal":
            raise RuntimeError("Anthropic declined the request (stop_reason=refusal)")
        if resp.stop_reason == "max_tokens":
            raise RuntimeError("Anthropic reply hit max_tokens before the tool call finished")
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
        suffix = getattr(inner, "prompt_suffix", "")
        self._prompt_fp = hashlib.sha256((SYSTEM_PROMPT + suffix).encode()).hexdigest()[:8]

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

NATIVE_DEFAULT_MODEL = {"anthropic": "claude-sonnet-5", "openai": "gpt-4o-mini"}


def make_analyzer(provider: str | None = None, model: str | None = None,
                  cache_dir: str = "./cache", structured: str | None = None,
                  base_url: str | None = None, env: dict | None = None) -> CachedAnalyzer:
    """Build the analyzer for a provider.

    provider    anthropic (default) | openai | gemini | openai-compatible      — or LLM_PROVIDER
    model       explicit > LLM_MODEL > ANTHROPIC_MODEL / OPENAI_MODEL > the defaults for those two
                (claude-sonnet-5, gpt-4o-mini).
                Gemini and OpenAI-compatible have no default: name a model.
    structured  json (default, model-agnostic) | native (Anthropic tool use / OpenAI structured outputs only)
    base_url    LLM_BASE_URL; required for openai-compatible
    """
    env = dict(os.environ if env is None else env)
    provider = (provider or env.get("LLM_PROVIDER") or "anthropic").lower()
    structured = (structured or env.get("LLM_STRUCTURED") or "json").lower()
    vendor_model_env = {"anthropic": "ANTHROPIC_MODEL", "openai": "OPENAI_MODEL"}.get(provider)
    m = model or env.get("LLM_MODEL") or (env.get(vendor_model_env) if vendor_model_env else None) \
        or NATIVE_DEFAULT_MODEL.get(provider)
    if structured == "native":
        if provider == "anthropic":
            return CachedAnalyzer(AnthropicAnalyzer(model=m), cache_dir, "anthropic")
        if provider == "openai":
            return CachedAnalyzer(OpenAIAnalyzer(model=m), cache_dir, "openai")
        raise ValueError(f"--structured native exists only for anthropic and openai, not {provider}; use json")
    if structured != "json":
        raise ValueError(f"structured must be json or native, not {structured!r}")
    cfg_env = {**env, "LLM_PROVIDER": provider}
    if m:
        cfg_env["LLM_MODEL"] = m
    if base_url:
        cfg_env["LLM_BASE_URL"] = base_url
    cfg = llm.config_from_env(cfg_env)
    return CachedAnalyzer(JsonAnalyzer(cfg), cache_dir, f"{provider}/json")


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
