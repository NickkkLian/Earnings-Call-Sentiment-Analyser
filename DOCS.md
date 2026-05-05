# Documentation

> A complete walkthrough of the Earnings Call Sentiment Analyser — what it is,
> how it works, how to extend it, and how to run it from zero.

---

## Table of Contents

1. [The thesis (why this exists)](#1-the-thesis-why-this-exists)
2. [Design overview](#2-design-overview)
3. [Data flow](#3-data-flow)
4. [Features](#4-features)
5. [Module-by-module developer notes](#5-module-by-module-developer-notes)
6. [Dashboard architecture](#6-dashboard-architecture)
7. [User guide](#7-user-guide-running-it-from-zero)
8. [How to extend it](#8-how-to-extend-it)
9. [Troubleshooting](#9-troubleshooting)
10. [Honest caveats](#10-honest-caveats)

---

## 1. The thesis (why this exists)

Most earnings-call sentiment projects answer the wrong question. They classify
a call as "positive" or "negative" and correlate that with the next-day
return — but the next-day return is overwhelmingly driven by whether the
company beat its EPS estimate, not by the *tone* of the call. So they end up
re-discovering EPS surprises with extra steps.

**This project answers a different question:** does the *gap* between how
management frames the quarter and how analysts respond to it predict the
*residual* return — what's left after controlling for the EPS beat?

Three concrete decisions follow from that thesis:

1. **Score management's prepared remarks and the analyst Q&A as separate
   sections.** The gap between them is the headline signal.
2. **Compute returns net of EPS surprise.** The thing being predicted is the
   marginal information in *how* people spoke, not what was reported.
3. **Track the trajectory across many quarters.** Single-call sentiment is
   noisy; the *change* in tone over time is informative.

That's the whole project in three bullets. Everything else is plumbing to
make those measurable cleanly.

---

## 2. Design overview

The system has three layers, deliberately decoupled.

```
┌─────────────────────────────────────────────────────────────────┐
│ INGESTION                                                       │
│ Pull raw transcripts (FMP) and price/EPS data (yfinance + FMP). │
│ Cache locally so re-runs are free.                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ ANALYSIS                                                        │
│ Send each call section to an LLM (Claude or GPT) with a strict  │
│ Pydantic schema. Get back tone, hedging, topics, extracts.      │
│ Compute residual return = 5d return − β·sector − γ·EPS surprise.│
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ PRESENTATION                                                    │
│ Long-format DataFrame → CSV → JSON → React dashboard.           │
└─────────────────────────────────────────────────────────────────┘
```

**Why three layers, not one monolith:** each layer has different failure
modes and different costs. Ingestion is rate-limited and slow. LLM calls
cost money. Presentation is free and fast. Caching at each boundary means
you can iterate on the dashboard without re-running the LLM, or iterate on
the prompt without re-pulling transcripts.

**Why these specific tools:**

| Choice | Rationale |
|---|---|
| FMP for transcripts | Has a workable API. Seeking Alpha doesn't anymore; scraping fights paywalls. |
| Pydantic schema | Single source of truth that both Anthropic and OpenAI can target via structured outputs. |
| LLM-agnostic core | Lets you A/B providers and models; the schema makes outputs comparable. |
| yfinance | Free, fine for portfolio scope. Polygon/Bloomberg if going further. |
| React + Recharts dashboard | Self-contained single file, drops into any sandbox or claude.ai artifact. |
| On-disk cache by content hash | LLM calls deduplicated by `(provider, model, prompt, text)`. Re-running is free. |

---

## 3. Data flow

The fully traced path of one (ticker, quarter) pair:

```
                  user CLI args
                  ─────────────
     --tickers NVDA  --quarters 2025Q2  --provider anthropic
                       │
                       ▼
       ┌─────────────────────────────────┐
       │ src/cli.py                      │ ← parses args, loads .env
       └────────────┬────────────────────┘
                    │
                    ▼
       ┌─────────────────────────────────┐
       │ src/pipeline.run()              │ ← loops (ticker, quarter) pairs
       └────────────┬────────────────────┘
                    │
       ┌────────────┼─────────────────────────┐
       ▼            ▼                         ▼
┌────────────┐ ┌────────────────┐  ┌──────────────────┐
│ get_       │ │ make_analyzer()│  │ compute_reaction │
│ transcript │ │ + analyze_call │  │                  │
│            │ │                │  │ yfinance prices  │
│ FMP API    │ │ split text →   │  │ FMP eps surprise │
│ → cache    │ │ LLM × 2 →      │  │ → residual_5d    │
│ → split    │ │ → cache        │  │                  │
└─────┬──────┘ └────────┬───────┘  └────────┬─────────┘
      │                 │                   │
      └─────────┬───────┴───────────────────┘
                ▼
       ┌─────────────────────────────────┐
       │  one row in the DataFrame       │
       │  (mgmt_tone, qa_tone, hedging,  │
       │   topics, extracts, eps_surp,   │
       │   residual_5d, …)               │
       └────────────┬────────────────────┘
                    │
                    ▼
              signals.csv
                    │
                    ▼
       ┌─────────────────────────────────┐
       │ src/export_dashboard.py         │ ← merge mgmt+qa topics, prioritize extracts
       └────────────┬────────────────────┘
                    │
                    ▼
            dashboard_data.json
                    │
                    ▼
       ┌─────────────────────────────────┐
       │ dashboard.jsx ("Load JSON")     │ ← validates shape, renders 5 panels
       └─────────────────────────────────┘
```

**Each arrow is a stable contract:**

- `get_transcript` returns a `Transcript` dataclass with `prepared_text` and
  `qa_text` already split.
- `analyze_call` returns a `CallAnalysis` (Pydantic) regardless of LLM
  provider.
- `compute_reaction` returns a `PriceReaction` dataclass with the residual
  already computed.
- `pipeline.run` returns a long-format DataFrame.
- `export_dashboard.export` produces the exact JSON shape the dashboard
  validator accepts.

You can swap any single layer without touching the others.

---

## 4. Features

### What the user sees in the dashboard

| Panel | What it shows | Why it matters |
|---|---|---|
| **KPI strip** | Mgmt tone, Q&A tone, sentiment gap, hedging density, guidance confidence — current quarter with delta from prior. | Five-second read of "what changed this quarter." |
| **Trajectory chart** | Mgmt vs Q&A tone over 8 quarters. Gap shaded between them. | Spots multi-quarter drift; e.g., management staying rosy while analysts turn skeptical. |
| **Topic emphasis** | LLM-extracted themes with weight bar + per-section tone. Wide gaps flagged. | Surfaces *where* analysts are pushing back. |
| **Sentiment gap vs residual return scatter** | Each dot is one call. X = framing gap, Y = residual return. | The actual research question, visualized. |
| **Notable extracts** | Tagged passages: confident / hedging / evasion / admission. | Qualitative texture; specific quotes a recruiter can read in 10 seconds. |
| **Methodology panel** | Prose + JSON schema excerpt. | Self-documenting; defends the approach. |

### Technical features under the hood

- **Provider-agnostic LLM layer** — Anthropic uses tool-use forced choice;
  OpenAI uses `client.beta.chat.completions.parse(response_format=PydanticModel)`.
  Both produce identical Pydantic objects.
- **Content-addressed caching** — keyed on
  `sha256(provider + model + prompt + section + text)`. Tweaking the prompt
  invalidates everything automatically; same prompt + same text on the same
  model is free.
- **Section-aware splitting** — regex matches operator handoff phrases
  (`question-and-answer session`, `we will now take questions`, `first
  question is from`, etc.) covering the six common phrasings.
- **Sector-relative residual return** — each ticker mapped to one of 13
  sector ETFs (SOXX, IGV, XLC, XLY, XLP, XLF, XLV, IBB, XLI, XLE, XLU, XLB,
  XLRE), defaulting to SPY. ~150 large/mid caps covered.
- **Dashboard JSON validation** — load button rejects malformed input with a
  specific error message, falls back to the demo data.
- **Topic merging across sections** — fuzzy substring match aligns
  "Data Center" (mgmt) with "Data center demand" (Q&A); unmatched Q&A topics
  surface separately (those are interesting on their own — analysts pushed on
  something management didn't emphasize).

---

## 5. Module-by-module developer notes

### `src/schema.py` — the contract

```python
SectionAnalysis(BaseModel):
    section: "prepared" | "qa"
    tone: float in [-1, 1]
    hedging_density: float in [0, 1]
    guidance_confidence: float in [0, 1]
    guidance_change: "raise" | "hold" | "lower" | "none"
    topics: list[Topic]            # name, weight, tone
    notable_passages: list[Passage] # tag, speaker, text

CallAnalysis(BaseModel):
    ticker, quarter_label, call_date
    prepared: SectionAnalysis
    qa: SectionAnalysis
    .sentiment_gap = prepared.tone - qa.tone   # property
```

This is the single source of truth. Both LLM providers are forced to produce
this shape. Downstream code never branches on provider.

**To extend:** add a field, run the pipeline once with `--cache-dir /tmp/x`
to bypass cache, propagate the field through `pipeline.run` and
`export_dashboard.export`, then teach the dashboard to display it.

### `src/transcripts.py` — get the raw text

Pulls from FMP, splits prepared from Q&A. The split uses a regex covering
six common operator phrasings (verified with unit tests). No marker → all
text goes to `prepared_text`, `qa_text` is empty (analyzer returns a
zero-vector for the Q&A section in that case).

**Cache:** `cache/transcripts/{TICKER}_Q{N}_{YEAR}.json` — raw FMP response.

### `src/prices.py` — the residual return

The interesting line:

```python
residual = ret_5d − β·sector_5d − γ·eps_surprise
```

with `β=1.0`, `γ=1.5` as placeholders. Tuning these is a natural extension.

`SECTOR_PROXY` maps tickers to sector ETFs. Falls back to SPY for unknown
tickers — fine for a portfolio project; for serious work, replace with a
fitted multi-factor model.

`fetch_eps_surprise` pulls actual vs. estimated EPS from FMP and computes
`(actual − estimate) / |estimate|`.

### `src/analyzer.py` — the LLM layer

Three classes:

- `AnthropicAnalyzer` — uses tool-use with `tool_choice` set to force the
  model to call `submit_analysis` with arguments matching the Pydantic
  schema. Reliable structured output, no JSON parsing.
- `OpenAIAnalyzer` — uses `client.beta.chat.completions.parse()` which
  accepts the Pydantic class directly. Handles the schema massaging
  (`additionalProperties: false`, required-field promotion) that strict mode
  needs.
- `CachedAnalyzer` — wraps either, hashes prompt + text + provider + model
  for the cache key.

The system prompt is the single highest-leverage line of code in the
project. If extraction quality matters for what you're doing, that's where
to iterate. The cache invalidates automatically when you edit it (because
the prompt is part of the hash key).

**Cache:** `cache/llm/{24-char-hash}.json` — one file per (provider, model,
prompt, section, text) combination.

### `src/pipeline.py` — the orchestrator

Loops over `(ticker, year, quarter)` tuples, calls the three modules, and
assembles a long-format DataFrame. One row per call. Errors are caught and
printed; failed rows are skipped, not fatal.

`signal_correlation(df)` is a convenience function — per-ticker Pearson
correlation between sentiment gap and residual return. Useful as a sanity
check at the end of a CLI run, but with N < 30 per ticker the values are
noisy.

### `src/export_dashboard.py` — DataFrame to JSON

Two non-trivial bits:

1. **NaN handling.** `json.dumps(NaN)` produces invalid JSON (`NaN` is not
   a valid JSON value). This module drops rows with NaN in critical numeric
   fields and warns. Coercing NaN → 0 would silently misrepresent missing
   data as a real signal, which would be worse.
2. **Topic merging.** Prepared and Q&A topic lists won't have identical
   names. The merger does case-insensitive substring fuzzy matching to
   align them, then surfaces unmatched Q&A-only topics separately. Sorted
   by total weight, capped at 6.

Extracts are prioritized: evasion → admission → contradiction → hedging →
confident. Top 4 surface in the dashboard.

### `src/cli.py` — entry point

Argparse, `.env` loading, prints per-ticker correlations at the end. That's
it. Deliberately thin — most logic lives in the tested modules.

---

## 6. Dashboard architecture

### File: `dashboard.jsx`

Single-file React component, ~820 lines. No build step required for the
artifact runtime.

**State:**

```javascript
const [data, setData] = useState(SAMPLE_DATA);   // the loaded JSON
const [isCustom, setIsCustom] = useState(false); // demo vs custom mode
const [ticker, setTicker] = useState(...);       // currently selected ticker
const [status, setStatus] = useState(null);      // toast for load success/errors
```

**`SAMPLE_DATA`** is the demo fallback — 4 tickers × 8 quarters of plausible
mock data. Real pipeline output replaces it via the **Load JSON** button.

**`validateData(obj)`** runs on every load. Returns `null` if valid, else a
specific error string ("META quarter 3: missing 'eps_surprise'") that
displays in a red toast.

**Charts:** Recharts (`<LineChart>`, `<ScatterChart>`, `<ComposedChart>`).
All theming is via CSS-in-JS (the `C` constants object) — no Tailwind
arbitrary classes (those don't work in artifact runtime without JIT).

**Loading custom data flow:**

```
user clicks "Load JSON"
  → hidden <input type="file"> fires
  → FileReader.readAsText()
  → JSON.parse + validateData
  → if valid: setData(parsed); setIsCustom(true)
  → if invalid: setStatus({type: 'err', msg: '...'})
```

The "Sample" button downloads `SAMPLE_DATA` as JSON — useful for
inspecting the expected shape if you're hand-crafting data.

---

## 7. User guide (running it from zero)

### Prerequisites

- Python 3.10+
- A Financial Modeling Prep API key (free tier works for ~10 calls)
- An Anthropic OR OpenAI API key (or both)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/earnings-call-sentiment.git
cd earnings-call-sentiment

# Set up environment
python -m venv .venv
source .venv/bin/activate    # on Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure keys
cp .env.example .env
# Open .env in any editor and fill in: FMP_API_KEY, ANTHROPIC_API_KEY (or OPENAI_API_KEY)
```

### Run the pipeline

```bash
python -m src.cli \
    --tickers NVDA,META,TSLA,AAPL \
    --quarters 2024Q3,2024Q4,2025Q1,2025Q2 \
    --provider anthropic \
    --out signals.csv
```

Expected output:

```
Running pipeline: 16 (ticker, quarter) pairs
Provider: anthropic | Model: env default

✓ Wrote 16 rows → signals.csv

Per-ticker signal correlation (sentiment gap vs 5d residual return):
ticker  n  corr_gap_residual  corr_hedging_residual
  AAPL  4              -0.32                  -0.18
  META  4               0.05                   0.22
  NVDA  4              -0.51                  -0.44
  TSLA  4              -0.62                  -0.31
```

(Numbers will differ; correlations from N=4 are pure noise — this is just
demonstrating the methodology.)

### Export to dashboard

```bash
python -m src.export_dashboard signals.csv -o dashboard_data.json
```

### View in dashboard

The fastest way: open [claude.ai](https://claude.ai), paste the contents
of `dashboard.jsx` as a new artifact, then click the **Load JSON** button
at the top right and select your `dashboard_data.json`.

For a more permanent setup, drop `dashboard.jsx` into any Vite/Next/CRA
project as a component. Imports are standard (React, recharts,
lucide-react).

### Smaller / cheaper test run

For first-time setup, start tiny:

```bash
python -m src.cli --tickers NVDA --quarters 2025Q2 --provider anthropic
```

One transcript, one LLM call pair, ~$0.01 in API costs. Verifies the whole
chain works before you scale up.

---

## 8. How to extend it

### Add more tickers

Just pass them on the CLI. If a ticker isn't in `SECTOR_PROXY`
(`src/prices.py`), it falls back to SPY. Edit the dict to add proper sector
mapping — it's a one-line change per ticker.

### Add a new metric (e.g., "questions answered directly")

1. Add a field to `SectionAnalysis` in `src/schema.py`.
2. Update the system prompt in `src/analyzer.py` to describe how to score it.
3. Bump the prompt — the cache invalidates automatically.
4. Surface it in `src/pipeline.py`'s row dict.
5. Pass it through `src/export_dashboard.py`.
6. Add a panel/chart in `dashboard.jsx`.

### Swap the LLM provider mid-stream

```bash
python -m src.cli ... --provider openai --model gpt-4o
```

Or set `LLM_PROVIDER=openai` in `.env`. The cache is keyed on provider so
you won't get cross-contamination.

### Use a different transcript source

Replace `src/transcripts.py`'s `get_transcript` function. It needs to
return a `Transcript` dataclass; everything else stays put.

### Tune the residual return formula

In `src/prices.py`, `compute_reaction` takes `beta` and `gamma` parameters.
Once you have ~30 calls per ticker, you can fit these per-ticker via OLS
on (ret, sector_ret, surprise) and replace the constants.

### Run more quarters efficiently

The cache handles re-runs free, so the cost-conscious workflow is:

```bash
# First pass with cheap model
python -m src.cli --tickers ... --quarters ... \
    --provider anthropic --model claude-haiku-4-5-20251001

# Re-run interesting subset with stronger model — only those re-extract
python -m src.cli --tickers NVDA,INTC --quarters ... \
    --provider anthropic --model claude-opus-4-7
```

---

## 9. Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `FMP_API_KEY not set in env` | `.env` not loaded or empty | Check the file is in the repo root and `LLM_PROVIDER`, `FMP_API_KEY` are filled in. |
| `No transcript found for X Q2 2025` | FMP doesn't have it (small-cap or too recent) | Try a different ticker or quarter. Free tier is also rate-limited. |
| All rows skipped with errors | Usually wrong API key | Check stdout — each error prints `{ticker} {quarter}: {ErrorType}: {message}`. |
| Dashboard says "Invalid JSON: missing 'eps_surprise'" | Pipeline run didn't complete for some calls | Re-run those rows or remove them from the CSV before exporting. |
| Cache feels stale after editing the prompt | It shouldn't — prompt is in cache key | If genuinely stuck, `rm -rf cache/llm/`. |
| Returns look way too positive/negative | EPS-surprise control is off | `gamma` in `compute_reaction` may not match your tickers. Try `gamma=1.0` or fit per-ticker. |
| Dashboard topic bar overflows | Old version | Pull latest — bar normalizes against max weight in the topic list. |

---

## 10. Honest caveats

**This is a methodology demo, not a tradeable signal.** A few things to be
upfront about:

- **Sample size.** A few hundred calls is small. Don't claim the
  sentiment-gap → residual-return correlation as predictive without
  out-of-sample validation across many more calls.
- **Lookahead-bias risk.** All returns are anchored to the actual call date.
  But: pre-market vs post-market reporting matters, and we treat them
  identically. For banks (often pre-market) this is a real distortion.
- **EPS-surprise control is rough.** A constant `gamma=1.5` is a rule of
  thumb. The real coefficient varies by ticker, sector, and regime.
- **Sector proxy is crude.** SOXX/XLC/XLY/etc. are loose. A proper Fama-French
  or Barra factor model would be better for serious work.
- **LLM extraction is not infallible.** Tone scores from an LLM are
  reasonably consistent but not calibrated to any external ground truth.
  Treat them as ordinal, not cardinal.

These aren't reasons not to do the project — they're the reasons it's
*honest* about what it shows. Calling them out is itself a signal of
research maturity.

---

*Last updated: 2026-05-04*
