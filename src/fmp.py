"""One GET to Financial Modeling Prep, with errors that never carry the API key.

FMP takes its key as a URL parameter (?apikey=...), and requests writes the full URL into its error messages: an HTTP
error reads "401 Client Error: Unauthorized for url: https://.../NWSC?apikey=<key>", a refused connection
"... Max retries exceeded with url: /api/v3/...?apikey=<key> ...". The pipeline prints the message of every call it
skips, so a failed FMP call would put the runner's key on the terminal and into any log or issue it is pasted into.

Every FMP call goes through fmp_get. A failure comes back as FMPError: the message keeps the error type, the status
and the endpoint, with the key taken out, and it is raised outside the except block, so a traceback shows no chained
original either.
"""
from __future__ import annotations

import re

import requests


class FMPError(RuntimeError):
    """An FMP request failed. The message never contains the API key."""


_KEY_PARAM = re.compile(r"(apikey=)[^&\s'\")]+", re.IGNORECASE)


def redact(text: str, api_key: str | None) -> str:
    """text with the key replaced by ***: the key itself wherever it appears, and the value of any apikey= parameter
    (which also covers the key in its URL-encoded form)."""
    if api_key and len(api_key) >= 6:
        text = text.replace(api_key, "***")
    return _KEY_PARAM.sub(r"\1***", text)


def fmp_get(url: str, api_key: str | None, params: dict | None = None, timeout: float = 30) -> requests.Response:
    """GET url with the key as FMP expects it. Raises FMPError (key removed) on any requests error or HTTP 4xx/5xx."""
    try:
        r = requests.get(url, params={**(params or {}), "apikey": api_key}, timeout=timeout)
        r.raise_for_status()
        return r
    except requests.RequestException as e:
        message = redact(f"{type(e).__name__}: {e}", api_key)
    raise FMPError(message)
