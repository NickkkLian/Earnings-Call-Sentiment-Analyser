"""The opt-in `--structured native` Anthropic path against a local mock of the Messages API (no keys, no network).

Proves: the real anthropic SDK's `messages.parse` sends SectionAnalysis as `output_config.format` (no tools), a valid
reply comes back as a SectionAnalysis, and a refusal, a reply cut off at max_tokens, a reply outside the schema's
bounds, or a reply with no text each raise RuntimeError instead of returning a row.
Does not prove that the live API accepts the schema — that needs a key and a real call.
"""
import http.server
import json
import threading

import pytest

from src import analyzer as A
from src.schema import SectionAnalysis

GOOD = {
    "section": "qa", "tone": -0.2, "hedging_density": 0.4, "guidance_confidence": 0.5, "guidance_change": "hold",
    "topics": [{"name": "Margins", "weight": 1.0, "tone": -0.2}],
    "notable_passages": [{"tag": "evasion", "speaker": "CFO", "text": "We will not break that out."}],
}


class Mock(http.server.BaseHTTPRequestHandler):
    """Answers POST /v1/messages with a scripted (stop_reason, content) pair in the Messages API's reply shape."""
    script = []      # list of (stop_reason, content blocks), consumed in order
    requests = []

    def log_message(self, *a):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("content-length") or 0)))
        Mock.requests.append({"path": self.path, "body": body})
        stop, content = Mock.script.pop(0) if Mock.script else ("end_turn", [{"type": "text", "text": json.dumps(GOOD)}])
        obj = {"id": "msg_mock", "type": "message", "role": "assistant", "model": "claude-mock", "content": content,
               "stop_reason": stop, "stop_sequence": None, "usage": {"input_tokens": 1, "output_tokens": 1}}
        raw = json.dumps(obj).encode()
        self.send_response(200); self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(raw))); self.end_headers(); self.wfile.write(raw)


@pytest.fixture(scope="module")
def base():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Mock)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()


@pytest.fixture
def an(base, monkeypatch):
    Mock.script, Mock.requests = [], []
    monkeypatch.setenv("ANTHROPIC_BASE_URL", base)
    return A.AnthropicAnalyzer(model="claude-sonnet-5-5", api_key="test-key")


KW = dict(ticker="T", quarter_label="Q1 2025", section="qa", text="Analyst: margins? CFO: We will not break that out.")


def text(s):
    return [{"type": "text", "text": s}]


def test_valid_reply_is_parsed_and_schema_goes_in_output_config(an):
    result = an.analyze_section(**KW)
    assert result == SectionAnalysis.model_validate(GOOD)
    (req,) = Mock.requests
    assert req["path"] == "/v1/messages"
    body = req["body"]
    assert "tools" not in body and "tool_choice" not in body
    fmt = body["output_config"]["format"]
    assert fmt["type"] == "json_schema"
    assert set(fmt["schema"]["properties"]) == set(SectionAnalysis.model_fields)
    assert body["system"] == A.SYSTEM_PROMPT and body["model"] == "claude-sonnet-5-5"


@pytest.mark.parametrize("stop, content, match", [
    ("refusal", [], "stop_reason=refusal"),
    ("refusal", text("I can't help with that."), "did not validate"),
    ("max_tokens", [], "hit max_tokens"),
    ("max_tokens", text(json.dumps(GOOD)[:40]), "did not validate"),
    ("end_turn", text(json.dumps(dict(GOOD, tone=1.5))), "did not validate"),   # bound the API does not enforce
    ("end_turn", [], "no structured output"),
])
def test_bad_or_empty_replies_raise(an, stop, content, match):
    Mock.script = [(stop, content)]
    with pytest.raises(RuntimeError, match=match):
        an.analyze_section(**KW)
    assert len(Mock.requests) == 1, "the native path makes one call and no repair round"
