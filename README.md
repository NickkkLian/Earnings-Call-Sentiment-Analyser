# CallDelta

**Call tone vs. analyst pushback — not a trading signal.**

**No reliable evidence that analyst pushback explains the post-call move after EPS.** Across the twelve scored calls, gap versus held-out EPS residual has **r = 0.03, approximate 95% interval −0.56 to +0.59**. Leave-one-out prediction RMSE: **EPS + gap 11.59 pp; EPS only 10.77 pp; training mean 8.75 pp** (lower is better). Removing one call and refitting gives r from **−0.10 to +0.31**. Reproduce these figures offline: `node docs/report-analysis.cjs`.

The interval is a Fisher approximation assuming independent calls. Repeated companies and shared training folds break that assumption; its coverage is not calibrated. This is an exploratory check on three companies, not a chronological backtest or a finding.

![CallDelta](.github/header.png)

An earnings call has two halves: what management chose to say, and what analysts made them answer. CallDelta scores each half separately with a fixed extraction schema, tracks the *gap* between them across quarters, and sets that gap next to the price move after the call.

**What it is.** A small, tested pipeline (transcript → the two halves → model scores validated against one schema → a static page) and **one real run of it: twelve calls**, the four most recent of Microsoft (FY26 Q1–Q4), Alphabet and Meta (Q3 2025–Q2 2026), scored by `claude-sonnet-5` on 2026-09-25 from the transcripts each company publishes on its own investor-relations site.

**What it is not.** Not a trading signal and not a finding. Twelve calls cannot show whether tone predicts returns. Three limits show up in the real run, and the page states each one where it applies:

- **The residual is a model leftover, not an earned return.** The analysis page replaces the historical hand-picked 1.5 × EPS control with an intercept and EPS coefficient fitted on all the other calls. It re-derives every displayed residual and keeps warnings when the EPS control dominates or a residual passes ±100%. The historical pipeline output remains intact as input; its residual column is superseded in the analysis view. See [Honest caveats](#honest-caveats).
- **No topic was matched across the two halves.** Topics are matched by name, and on the latest call of each of the three companies none matched (18 of 18 topics belong to one half), so the topic-level gap has nothing to show on this data.
- **One run of one model**, not checked against human labels.

[![Check](https://img.shields.io/github/actions/workflow/status/NickkkLian/Earnings-Call-Sentiment-Analyser/check.yml?branch=main&label=check&style=flat-square&labelColor=2f5859)](https://github.com/NickkkLian/Earnings-Call-Sentiment-Analyser/actions/workflows/check.yml)

![CallDelta dashboard: pooled verdict and fitted EPS residual analysis on the twelve real calls](docs/screenshot-dashboard.png)

The page opens on Microsoft, whose latest call scored the same tone for both halves (gap 0.00). The pooled verdict covers all companies and remains first on every tab.

## Try it

```bash
git clone https://github.com/NickkkLian/Earnings-Call-Sentiment-Analyser && cd Earnings-Call-Sentiment-Analyser
python3 -m http.server --directory docs 8000     # then open http://localhost:8000 (no install, no key)
node docs/check-web.mjs                          # the page's own checks; prints how many calls carry the residual warning
node --test docs/analysis.test.cjs                # fitted control, holdout, uncertainty and failure cases
node docs/report-analysis.cjs                     # reproduce the first-screen figures offline
```

**In the browser** — open the [dashboard](https://nickkklian.github.io/Earnings-Call-Sentiment-Analyser/) (static, no server) or serve `docs/` from a clone as above. It opens on the twelve real calls above, with a link to each call's transcript page; **Load JSON** (or drag a file onto the page) replaces them with your own pipeline output, validated for shape first; **Sample JSON** (under the schema in the Methodology section) downloads a **synthetic** example file (fictional companies, invented numbers) so you can see the schema.

**What the real data contains.** Scores for the prepared remarks and for the analyst Q&A, topics, EPS surprise and the 5-day returns (EPS estimates and prices from Yahoo Finance via yfinance). Quotes come only from the prepared remarks of each company's latest call: at most 25 words each, checked word for word against the transcript, a passage with an elision or a mid-sentence fragment dropped. Analyst questions are scored but never quoted, and no analyst is named. Two companies carry a caveat on the page, taken from what they said on the calls: Alphabet's EPS in Q3 2025, Q1 2026 and Q2 2026 includes unrealized gains on equity securities, and Meta's includes a one-time tax charge (Q3 2025) and a tax benefit (Q1 2026). Fitting the coefficient does not repair those EPS inputs. The page marks control dominance using the fitted coefficients.

**Re-run it** — `data/ir-calls.json` lists each call's transcript URL and the SHA-256 of the file that was scored (Word files are read with the standard library, PDFs with `pdfminer.six`, MIT-licensed):

```bash
python -m src.ir_run --max-usd 3   # needs ANTHROPIC_API_KEY; stops before the estimated spend passes the cap
```

Scoring the twelve calls took 24 requests on 2026-09-25: about 256,000 input and 26,000 output tokens, roughly US$0.78 at US$2 / US$10 per million (20 requests in the final run, plus 4 for the two July PDF calls after the PDF reader changed to `pdfminer.six`).

**Run the pipeline** — Python 3.10+; keys go in `.env`, never in the repo.

```bash
pip install -r requirements.txt
cp .env.example .env   # then fill in FMP_API_KEY and the key for your model provider
```

```bash
python -m src.cli --tickers NWSC,HRBS --quarters 2025Q1,2025Q2 --provider anthropic --out signals.csv
python -m src.export_dashboard signals.csv -o dashboard_data.json
```

Replace the fictional tickers with real ones FMP has transcripts for (most US-listed large and mid caps). Then open the dashboard and load `dashboard_data.json`.

## What is interesting here

1. **Section-level decomposition.** Prepared remarks and Q&A are scored separately. The gap between them — how rosy management sounds vs. how sceptical analysts are — is the headline signal.
2. **Topic-level sentiment.** Each call is broken into 4–6 themes with separate management and Q&A tone per topic; a wide gap on a topic both halves discussed shows where analysts are pushing back. Q&A-only topics (analysts raised something management did not) are surfaced on purpose. Topics are matched across the halves by name only: on the real run none matched, so every topic on the page belongs to one half, and each percentage is a share of that half, not of the whole call.
3. **Tagged passages.** The model extracts and tags notable quotes — *confident, hedging, evasion, admission, contradiction* — not just scores.
4. **Out-of-sample EPS control.** `docs/analysis.js` pools the calls and fits OLS: sector-adjusted move = α + γ × EPS surprise. For each displayed residual it excludes that call, fits α and γ on the rest, then subtracts the held-out prediction. The fitted γ ranges from 0.0048 to 0.1030 across these folds; no 1.5 constant enters the new analysis. Gap is management minus Q&A tone. The separate holdout comparison predicts the sector-adjusted move using EPS + gap, EPS only, or the training mean; each model excludes the held-out call. The delete-one sensitivity check removes a call and repeats the entire fitting process. Missing sector data or a singular EPS fit withholds the verdict and explicitly labels the file's original residuals. Singular EPS + gap fits withhold that baseline comparison. The same analysis runs on loaded JSON files.
5. **Multi-quarter trajectory.** Single-call sentiment is noise; the *change* in tone across quarters is where any signal would live.

## How it fits together

```mermaid
%%{init: {"theme": "base", "themeVariables": {"darkMode": false, "fontFamily": "Inter, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Helvetica, Arial", "primaryColor": "#dae7db", "mainBkg": "#dae7db", "primaryTextColor": "#1d1b24", "nodeTextColor": "#1d1b24", "textColor": "#1d1b24", "primaryBorderColor": "#2f5859", "nodeBorder": "#2f5859", "secondaryColor": "#fae8eb", "tertiaryColor": "#f7e9e8", "lineColor": "#5f7f76", "arrowheadColor": "#5f7f76", "defaultLinkColor": "#5f7f76", "edgeLabelBackground": "#fae8eb", "clusterBkg": "#f7e9e8", "clusterBorder": "#a8707a", "titleColor": "#7d2d44"}}}%%
flowchart LR
  A["FMP transcript"] --> B["split_prepared_qa<br/>operator hand-off regex"]
  B --> C["LLM extraction<br/>JSON schema in the prompt · 5 providers<br/>Pydantic SectionAnalysis"]
  C --> D["CallAnalysis<br/>prepared · qa · gap"]
  E["yfinance prices + FMP EPS surprise"] --> F["residual_return<br/>r5 − β·sector − γ·surprise"]
  D --> G["signals.csv"]
  F --> G
  G --> H["export_dashboard.py → JSON"]
  H --> I["docs/analysis.js<br/>pooled leave-one-out EPS fit → verdict → static dashboard"]
  J["tests/ · src/eval.py · docs/check-web.mjs"] -. verify .-> B
  J -. verify .-> F
  J -. verify .-> H
```

| Layer | Choice |
| --- | --- |
| Transcripts | Financial Modeling Prep API, cached on disk |
| LLM | Your choice of Claude, OpenAI, Gemini, an OpenAI-compatible server or your ChatGPT plan (`--provider`, see the compatibility table below); every reply is validated into the same Pydantic models |
| Structured output | Default: the JSON schema in the prompt, parsed and validated, with one repair round. Optional `--structured native`: the vendor's structured outputs through its SDK parse helper (Anthropic, OpenAI) |
| Prices / EPS | yfinance + FMP earnings-surprises endpoint |
| Wrangling | pandas |
| Dashboard | static HTML + hand-drawn SVG, no framework, no CDN scripts |

## Checks and the evaluation set

```bash
pip install -r requirements-dev.txt
python -m pytest -q
python -m src.eval
python -m src.eval --break
node docs/check-web.mjs
node --test docs/analysis.test.cjs
node docs/report-analysis.cjs
```

- `tests/` covers the transcript splitter (every operator phrasing the regex claims to recognise, the no-marker case, first match wins, an opening announcement of a later Q&A is not the hand-off), the quote filter for published data (prepared remarks only, 25 words, word for word, no elisions), the residual-return arithmetic and trading-day windows on a fixed synthetic series, and the dashboard export (topic merging across sections, Q&A-only topics, NaN rows dropped rather than zeroed). No network access.
- `src/eval.py` scores the extraction step on `eval/passages.json`: 30 synthetic passages (six per tag) and 10 synthetic guidance snippets. It runs through the project's own analyzer — same prompt, same schema — and records the model name and date in `eval/llm-cache.json`. The cache now holds the 2026-09-25 run with `claude-sonnet-5`, the default at the time (the default is now `claude-sonnet-5-5`, not yet scored on this set): **30/30 passages and 10/10 guidance snippets** (six right out of six for each of confident, hedging, evasion, admission and contradiction). The earlier 2026-09-22 run with `claude-haiku-4-5-20251001` had the same score; its cache is in the git history. Without the cache it reports **NOT RUN** (exit code 2) rather than a made-up number. `--break` is the negative control: a cached tag outside the schema must be refused. This is a small evaluation set, not a formal evaluation pipeline — and `eval/llm-cache.json` is the whole of what that run left behind: it records the model name and date, nothing here shows a request went over the network, and a hand-written cache would be indistinguishable from it.
- `docs/check-web.mjs` asserts the dashboard loads no external scripts, that the demo and the real data pass the loader's own validation, that every real transcript source is the company's own investor-relations site and every real quote is at most 25 words, that the page opens on the real data, that mutated files are rejected with specific messages, and that the correlation helper is right.
- `docs/analysis.test.cjs` checks fitted coefficients against exact synthetic arithmetic, exclusion of the held-out outcome, prediction baselines, interval endpoints, full refits for delete-one sensitivity, missing/degenerate inputs and the impossible-residual warning. The historical Python pipeline and scored files are unchanged; analysis consumes their raw EPS, sector returns and tone fields.

CI runs all of the above on every push (Python 3.10 and 3.13; the eval score only once the cache exists).

## Choosing a model provider, caching

Scoring works with Claude (default), OpenAI, Google Gemini, any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, gateways), or a ChatGPT Plus/Pro plan with no API key (that last one is built but not yet tried with a real sign-in):

```bash
python -m src.cli --tickers NWSC --quarters 2025Q2 --provider anthropic                    # ANTHROPIC_API_KEY
python -m src.cli --tickers NWSC --quarters 2025Q2 --provider openai                       # OPENAI_API_KEY
python -m src.cli --tickers NWSC --quarters 2025Q2 --provider gemini --model your-model-id  # GEMINI_API_KEY
python -m src.cli --tickers NWSC --quarters 2025Q2 --provider openai-compatible \
    --base-url http://localhost:11434/v1 --model your-model-id                             # LLM_API_KEY if the server needs one
python -m src.cli --tickers NWSC --quarters 2025Q2 --provider chatgpt --model your-model-id # your ChatGPT plan (not yet tried live), see below
```

The same variables work from `.env` (`LLM_PROVIDER`, `LLM_MODEL`, `LLM_BASE_URL`). Claude defaults to `claude-sonnet-5-5` and OpenAI to `gpt-4o-mini`; Gemini and OpenAI-compatible endpoints need a model id. Sonnet 5.5 thinks before it answers and the thinking counts toward `max_tokens`, so requests allow 16,000 output tokens; a refusal or a reply cut off at the limit is an error, never a half-read answer.

**Structured output without vendor features.** By default (`--structured json`) the analyst prompt and the Pydantic schema travel in plain text, the reply is parsed and validated locally, and a reply that does not validate gets one repair round with the validation errors — a second failure raises rather than writing a half-valid row. Nothing depends on tool calling, JSON mode or response schemas, so any model that can follow instructions can be used. The vendor-specific paths — Anthropic structured outputs (`client.messages.parse`, `anthropic>=0.77.0`), OpenAI structured outputs — remain available as `--structured native` for those two providers.

| Provider | Selected with | What has been run |
|---|---|---|
| Claude (Anthropic) | `--provider anthropic` (default) | Request and reply format, schema-in-prompt, validation, repair round and caching checked against a local mock of the documented API (`tests/test_llm_providers.py`). **Run against the live API**: the evaluation set on 2026-09-22 with `claude-haiku-4-5-20251001` and on 2026-09-25 with `claude-sonnet-5` (30 passages and 10 guidance snippets, every one tagged as the set expects both times; `eval/llm-cache.json` holds the second run), and the twelve real calls on the dashboard on 2026-09-25 with `claude-sonnet-5`. `--structured native` (`client.messages.parse`) is checked through the real SDK against a local mock (`tests/test_anthropic_native.py`), **not run against the live API**. |
| OpenAI | `--provider openai` | Same checks against a local mock (sends `max_completion_tokens`, no `temperature`). Should work per OpenAI's documentation; **not run against the live API.** |
| Google Gemini | `--provider gemini --model …` | Same checks against a local mock; key sent in the `x-goog-api-key` header. Should work per Google's documentation; **not run against the live API.** |
| OpenAI-compatible | `--provider openai-compatible --base-url … --model …` | Same checks against a local mock. **Not run against a real Ollama, LM Studio or vLLM server.** |
| ChatGPT plan (Continue with ChatGPT) | `--provider chatgpt --model …` after a one-time `python -m src.chatgpt_auth login` | Sign-in, refresh, sign-out and the Responses stream checked against a local mock of OpenAI's documented flow, with the ID token signed by a real RSA key (`tests/test_chatgpt_auth.py`), plus the analyzer end to end (`tests/test_llm_providers.py`); `tests/chatgpt_mutants.py` breaks each of 40 rules once and the tests catch every one. **Not yet signed in against the live service.** |

### Continue with ChatGPT (your ChatGPT plan, no API key)

**Status: not yet tried with a real sign-in.** The flow is built from OpenAI's documentation and tested against a local mock of it. Nobody has signed in to the live service with this tool, so everything below describes what the documentation says should happen, not something that has been seen to work.

This provider is meant to run the model step on a ChatGPT Plus or Pro plan instead of an API key. It follows OpenAI's official **Sign in with ChatGPT** flow for open-source, locally hosted apps ([OpenAI's documentation](https://developers.openai.com/siwc/token-sharing-open-source)); no unofficial endpoint and no scraped session is involved.

```sh
python -m src.chatgpt_auth login        # opens your browser: sign in to ChatGPT and allow the app to use your plan
python -m src.chatgpt_auth models       # the model ids your plan can use
python -m src.cli --tickers NWSC --quarters 2025Q2 --provider chatgpt --model a-model-id-from-that-list
python -m src.chatgpt_auth status       # who is signed in and whether plan usage is on (never prints a token)
python -m src.chatgpt_auth logout       # revokes the session at OpenAI, then clears the local tokens
```

**What it needs** (per OpenAI's documentation). An eligible ChatGPT Plus or Pro plan. Other accounts can sign in, but OpenAI answers their requests with `subscription_sharing_user_not_eligible`; that error is shown as it came, with the other providers named. Nothing switches to another provider or to an API key on its own. On Plus, the five-hour usage limit is shared with every other app that uses your plan; usage and per-app limits are at [chatgpt.com/settings/usage](https://chatgpt.com/settings/usage).

**Preview limits** ([OpenAI's list](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)). Responses API only; every request is sent with `store: false` and `stream: true`; fields such as `max_output_tokens` and `temperature` are not accepted, so this provider sends neither (the 16,000-token output allowance above does not apply to it).

**How it is built.** The first `login` registers "CallDelta" as an agent on your ChatGPT account (`client_id=dynamic_agent_client`, a browser callback on `http://127.0.0.1:1455/auth/callback` or another free port, PKCE, no client secret); later sign-ins reuse the client id OpenAI issued. The ID token is checked against OpenAI's published keys (RS256 signature, issuer, audience, expiry, nonce), and plan usage counts as on only when OpenAI grants `chatgpt.tokens.use.direct`. The signature check uses the standard library, because `src/chatgpt_auth.py` and `src/llm.py` are written without third-party packages (the rest of the project is not: `requirements.txt` lists nine); OpenAI's guide suggests a maintained JWT library where one can be used. Tokens are stored in `~/.config/calldelta/chatgpt/` (or `CHATGPT_AUTH_DIR`), one file per account, written atomically with mode 0600; never in this repository, never printed or logged. The access token is refreshed about five minutes before it expires, and the rotating refresh token is replaced at the same time.

`--structured native` stays limited to Anthropic and OpenAI API keys; with `chatgpt` the default `json` mode is used.

Transcripts and LLM responses are cached under `./cache/`. The LLM cache key is `(provider/mode, model, prompt hash, section, text)`, so changing the provider, model, structured-output mode or prompt re-runs, and repeating the same configuration is free.

## Honest caveats

- **Sample size.** The real run is twelve calls, four per company. That shows the method runs end to end; it cannot show a relationship. Every correlation on the page is an illustration of the method.
- **Lookahead bias.** The pipeline anchors all returns to the actual call date. Don't be cute with intraday data.
- **A fitted coefficient does not fix the sample or the EPS measure.** The page replaces the historical `γ = 1.5` placeholder with leave-one-out fits, including an intercept. The original source files and Python pipeline still retain the historical formula for reproducibility; their `residual_5d` is not the fitted analysis. Reported EPS still includes one-off equity gains and tax items. A coefficient fitted on the other calls can be unstable, and folds contain future calls: this is out-of-sample by call, not a historical trading simulation. Residuals remain model leftovers and must never be read as earned returns. The page retains both the control-dominance warning and a separate warning for residuals beyond ±100%.
- **Uncertainty is approximate.** The first-screen Fisher interval assumes independent observations. Calls repeat three companies and leave-one-out residuals share training data, so the interval is descriptive rather than calibrated inference. The delete-one range measures single-call sensitivity, not a confidence interval. A larger, company-diverse sample and time-based holdouts are needed before a predictive claim.
- **Sector proxy is crude.** One sector ETF per ticker (IGV, XLC, SOXX, …) with β fixed at 1; a factor model would be the proper control.
- **Topics are matched by name.** A topic counts as discussed in both halves only when one name contains the other. The model names topics freely, so on the real run nothing matched. Matching by meaning is not built.

**Not verified here:** the FMP transcript path has not been run for this revision (the real run used the companies' own transcripts, and EPS from Yahoo Finance because no FMP key was set); network calls are not covered by tests; the dashboard was checked in Chrome only; the model's scores are one run of one model, not checked against human labels on these calls.

## Layout

```
src/
  schema.py            Pydantic models — the contract every provider's output is validated against
  llm.py               standard-library HTTP adapter: Anthropic, OpenAI, Gemini, OpenAI-compatible, ChatGPT plan
  chatgpt_auth.py      Continue with ChatGPT: sign-in, token storage and refresh, Responses stream
  transcripts.py       FMP fetcher + prepared/Q&A splitter
  ir_run.py            the real run: companies' own transcripts (data/ir-calls.json) → docs/real-data.js
  prices.py            yfinance + EPS surprise + residual_return()
  analyzer.py          LLM analyzer (any of the five providers, optional native structured output, content-addressed cache)
  pipeline.py          orchestrator → DataFrame
  export_dashboard.py  DataFrame → dashboard JSON
  eval.py              evaluation set scorer (+ --llm to populate, --break negative control)
  cli.py               entry point
tests/                 splitter · residuals · export
eval/passages.json     30 tagged passages + 10 guidance snippets (synthetic)
data/ir-calls.json     the calls in the real run: company transcript URLs and SHA-256
docs/                  the dashboard (GitHub Pages root) · real-data.js · demo-data.js (Sample JSON) · check-web.mjs
  analysis.js          shared pure analysis: fitted EPS control, holdout comparison, interval, sensitivity
  report-analysis.cjs  offline reproduction of verdict figures and historical token-cost projection
  analysis.test.cjs    exact fixtures, exclusion checks, degeneracy and warning checks
DOCS.md                design notes and module-by-module developer guide
```

MIT licensed. Copyright 2026 Nick Lian.
