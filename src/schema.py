"""Structured-output schema for earnings-call analysis.

Both Anthropic and OpenAI calls coerce their output into this shape, so
downstream pandas / Plotly code never has to deal with provider quirks.
"""
from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


# --- Sub-objects ---------------------------------------------------------

class Topic(BaseModel):
    name: str = Field(..., description="Short topic label, e.g. 'Data Center', 'China'.")
    weight: float = Field(..., ge=0.0, le=1.0,
                          description="Share of section discussion, 0–1. Weights across topics should sum to ~1.")
    tone: float = Field(..., ge=-1.0, le=1.0,
                        description="Sentiment of how this topic was discussed.")


class Passage(BaseModel):
    tag: Literal["confident", "hedging", "evasion", "admission", "contradiction"]
    speaker: str
    text: str = Field(..., description="Direct passage, ≤ 50 words.")


# --- One section of one call (prepared OR Q&A) ---------------------------

class SectionAnalysis(BaseModel):
    section: Literal["prepared", "qa"]
    tone: float = Field(..., ge=-1.0, le=1.0,
                        description="Overall tone of this section.")
    hedging_density: float = Field(..., ge=0.0, le=1.0,
                                   description="Fraction of statements with hedge language ('we believe', 'should', 'if', 'depending on'...).")
    guidance_confidence: float = Field(..., ge=0.0, le=1.0,
                                       description="How confidently forward guidance is delivered. Q&A only — for prepared, use the guidance segment.")
    guidance_change: Literal["raise", "hold", "lower", "none"]
    topics: list[Topic]
    notable_passages: list[Passage]


# --- One whole call (prepared + Q&A combined) ----------------------------

class CallAnalysis(BaseModel):
    ticker: str
    quarter_label: str   # "Q2 2025", etc.
    call_date: str       # ISO date

    prepared: SectionAnalysis
    qa: SectionAnalysis

    @property
    def sentiment_gap(self) -> float:
        """Management framing minus analyst pushback. Positive = management rosier."""
        return self.prepared.tone - self.qa.tone


# JSON schema dict (used to constrain LLM outputs)
def section_json_schema() -> dict:
    """JSON schema for a single SectionAnalysis — fed to both provider APIs."""
    return SectionAnalysis.model_json_schema()
