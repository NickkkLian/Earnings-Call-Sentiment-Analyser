# Earnings Call Sentiment Analyser

NLP-driven equity research tool that decomposes earnings calls into
**management framing vs. analyst pushback**, tracks how that gap evolves
across quarters, and tests whether it predicts post-call price moves
*after controlling for the EPS surprise*.

The point isn't another "sentiment is positive/negative" project — it's
isolating the **marginal signal in how management speaks** beyond what
they actually reported.

## What's interesting here

1. **Section-level decomposition.** Prepared remarks and Q&A are scored
   separately. The *gap* between the two — how rosy management sounds vs.
   how skeptical analysts are — is the headline signal.
2. **Topic-level sentiment.** Each call is broken into 4–6 themes (e.g.
   *Data Center*, *China*, *Margins*) with separate management and Q&A
   tone per topic. Wide topic-level gaps highlight where analysts are
   pushing back.
3. **Hedging / evasion / admission tags.** The LLM extracts and tags
   notable passages, not just numerical scores.
4. **Residual return as the target.** We don't correlate sentiment with
   raw post-call returns (that's mostly the EPS beat). We correlate it
   with the *residual* — return net of sector and net of EPS surprise.
5. **Multi-quarter trajectory.** Single-call sentiment is noise. The
   *change* in management tone across quarters is where the signal lives.

## Stack

| Layer            | Choice                                       |
| ---------------- | -------------------------------------------- |
| Transcripts      | Financial Modeling Prep API                  |
| LLM              | Anthropic Claude *or* OpenAI (swappable)     |
| Structured output| Tool use (Anthropic) / JSON schema (OpenAI)  |
| Schema           | Pydantic                                     |
| Prices / EPS     | yfinance + FMP earnings-surprises endpoint   |
| Wrangling        | Pandas                                       |
| Frontend         | React + Recharts (demo) / Plotly Dash (full) |

## Quickstart

```bash
pip install -r requirements.txt
cp .env.example .env   # then fill in keys

# 1. Run the pipeline
python -m src.cli \
    --tickers NVDA,META,TSLA,AAPL,AMD \
    --quarters 2024Q3,2024Q4,2025Q1,2025Q2,2025Q3,2025Q4 \
    --provider anthropic \
    --out signals.csv

# 2. Export to the dashboard's JSON shape
python -m src.export_dashboard signals.csv -o dashboard_data.json

# 3. Open dashboard.jsx in any React sandbox (or paste into claude.ai
#    artifacts), click "Load JSON", and pick dashboard_data.json
```

You can run the pipeline against any ticker FMP has a transcript for —
that's essentially every US-listed large/mid cap. The `SECTOR_PROXY` map
in `src/prices.py` covers ~150 commonly-traded names; add yours there or
fall back to SPY (default).

## Layout

```
.
├── src/
│   ├── schema.py            # Pydantic models — single source of truth
│   ├── transcripts.py       # FMP fetcher + prepared/Q&A splitter
│   ├── prices.py            # yfinance + EPS surprise + residual return
│   ├── analyzer.py          # LLM analyzer (Anthropic + OpenAI + cache)
│   ├── pipeline.py          # Orchestrator → DataFrame
│   ├── export_dashboard.py  # DataFrame → dashboard JSON
│   └── cli.py               # CLI entry point
├── dashboard.jsx            # Loads sample data; "Load JSON" for real
├── requirements.txt
└── .env.example
```

## Swapping providers

Either set `LLM_PROVIDER=openai` in `.env` or pass `--provider openai`.
The Pydantic schema is fed to both providers (Anthropic via tool use,
OpenAI via `response_format=json_schema`), so the downstream DataFrame
shape is identical.

## Caching

Both transcripts and LLM responses are cached on disk under `./cache/`.
Cache key for LLM calls is `(provider, model, section_type, transcript_text)`,
so changing models forces re-runs but re-running the same config is free.

## Honest caveats

- **Sample size.** A few hundred calls is small. Treat the
  sentiment-gap → residual-return correlations as illustrative
  methodology, not a tradeable signal.
- **Lookahead bias.** The pipeline anchors all returns to the actual
  call date. Don't be cute with intraday data.
- **EPS-surprise control is rough.** Production work would fit `γ`
  per-ticker or per-sector instead of using a constant. Easy upgrade.
- **Sector proxy is crude.** SOXX / XLC / XLY etc. — fine for a
  portfolio project, replace with a proper factor model for real work.

## Resume one-liner

> Built a Python pipeline that decomposes earnings calls into management
> framing vs. analyst pressure using LLM structured outputs (Anthropic /
> OpenAI), and tests whether the framing gap predicts 5-day residual
> returns after controlling for EPS surprise — across N calls and M tickers.
