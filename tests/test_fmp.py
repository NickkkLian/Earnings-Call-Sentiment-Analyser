"""FMP errors never carry the API key (src/fmp.py). Real requests against local sockets, no network and no real key:
an HTTP 401 from a local server and a refused connection must both come back without the fake key, through fmp_get,
through the two callers (EPS surprise; transcript fetch with its retries), and in the line the pipeline prints when
it skips a call. Without src/fmp.py, requests puts the whole URL, key included, into each of these messages.
"""
import http.server
import socket
import threading
import traceback
from types import SimpleNamespace

import pytest
import requests
from tenacity import wait_none

from src import pipeline, prices, transcripts
from src.fmp import FMPError, fmp_get, redact

KEY = "FAKEKEY-0123456789abcdef"
FMP = "https://financialmodelingprep.com"


class Deny(http.server.BaseHTTPRequestHandler):
    """Answers every GET the way FMP answers a bad key."""

    def log_message(self, *a):
        pass

    def do_GET(self):
        raw = b'{"Error Message": "Invalid API KEY."}'
        self.send_response(401); self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(raw))); self.end_headers(); self.wfile.write(raw)


@pytest.fixture(scope="module")
def deny():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Deny)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()


@pytest.fixture
def fmp_at(monkeypatch):
    """Send the callers' FMP requests to another host instead of financialmodelingprep.com (real requests either way)."""
    def point(base):
        real_get = requests.get
        monkeypatch.setattr(requests, "get", lambda url, **kw: real_get(url.replace(FMP, base), **kw))
    return point


def closed_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def shown(err):
    """Everything a person could see of an error: its message, its repr and its full traceback, chained errors too."""
    return str(err) + repr(err) + "".join(traceback.format_exception(type(err), err, err.__traceback__))


def test_http_error_keeps_status_and_endpoint_but_not_the_key(deny):
    with pytest.raises(FMPError) as e:
        fmp_get(f"{deny}/api/v3/earnings-surprises/NWSC", KEY)
    assert KEY not in shown(e.value)
    assert "401" in str(e.value) and "/api/v3/earnings-surprises/NWSC" in str(e.value) and "apikey=***" in str(e.value)
    assert e.value.__context__ is None and e.value.__cause__ is None


def test_refused_connection_does_not_carry_the_key():
    with pytest.raises(FMPError) as e:
        fmp_get(f"http://127.0.0.1:{closed_port()}/api/v3/earnings-surprises/NWSC", KEY, timeout=5)
    assert KEY not in shown(e.value)
    assert str(e.value).startswith("ConnectionError")


def test_redact_covers_the_url_encoded_key_and_leaves_other_text():
    assert redact("x?apikey=a%2Bb&y=1 and a+b", "a+b") == "x?apikey=***&y=1 and a+b"
    assert redact("nothing secret here", KEY) == "nothing secret here"


def test_eps_surprise_error_does_not_carry_the_key(deny, fmp_at):
    fmp_at(deny)
    with pytest.raises(FMPError) as e:
        prices.fetch_eps_surprise("NWSC", "2025-08-27", api_key=KEY)
    assert KEY not in shown(e.value)


def test_transcript_error_does_not_carry_the_key_after_retries(deny, fmp_at):
    fmp_at(deny)
    with pytest.raises(Exception) as e:   # tenacity's RetryError, holding the last attempt's FMPError
        transcripts._fetch_raw.retry_with(wait=wait_none())("NWSC", 2025, 2, KEY)
    last = e.value.last_attempt.exception()
    assert isinstance(last, FMPError)
    assert KEY not in shown(e.value) + shown(last)


def test_the_line_the_pipeline_prints_does_not_carry_the_key(deny, fmp_at, monkeypatch, tmp_path, capsys):
    # The EPS call is the one whose error reached the terminal (the transcript path ends in tenacity's RetryError,
    # whose text never showed the URL). Transcript and analysis are stubbed; compute_reaction is cut down to its FMP
    # step, the real fetch_eps_surprise, because it downloads prices from the network first.
    fmp_at(deny)
    monkeypatch.setenv("FMP_API_KEY", KEY)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "unused")          # the analyzer is built but never called
    monkeypatch.setattr(pipeline, "get_transcript", lambda *a, **k: SimpleNamespace(call_date="2025-08-27"))
    monkeypatch.setattr(pipeline, "analyze_call", lambda tr, analyzer: None)
    monkeypatch.setattr(pipeline, "compute_reaction", lambda ticker, date: prices.fetch_eps_surprise(ticker, date))
    df = pipeline.run([("NWSC", 2025, 2)], cache_dir=str(tmp_path))
    out = capsys.readouterr().out
    assert df.empty and "NWSC Q2 2025: FMPError" in out, "the call is skipped and reported"
    assert KEY not in out
