"""The model-agnostic analyzer path against a local mock of each provider's documented API (no keys, no network).

Proves: the same prompt + schema reaches Claude, OpenAI, Gemini and OpenAI-compatible endpoints in each API's own
request shape; replies are parsed and validated into SectionAnalysis; a reply that does not validate gets exactly one
repair round and a second failure raises; results are cached per provider and structured-output mode.
Does not prove that a live service accepts the call — see the README compatibility table.
"""
import http.server
import json
import threading

import pytest

from src import analyzer as A
from src import llm

GOOD = {
    "section": "qa", "tone": -0.2, "hedging_density": 0.4, "guidance_confidence": 0.5, "guidance_change": "hold",
    "topics": [{"name": "Margins", "weight": 1.0, "tone": -0.2}],
    "notable_passages": [{"tag": "evasion", "speaker": "CFO", "text": "We will not break that out."}],
}


class Mock(http.server.BaseHTTPRequestHandler):
    """Answers in the shape of whichever API the path belongs to. The body of the reply is scripted per test."""
    script = []      # list of reply texts, consumed in order
    requests = []

    def log_message(self, *a):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("content-length") or 0)))
        Mock.requests.append({"path": self.path, "headers": {k.lower(): v for k, v in self.headers.items()}, "body": body})
        text = Mock.script.pop(0) if Mock.script else json.dumps(GOOD)
        if self.path.endswith("/messages"):
            obj = {"model": "claude-mock", "content": [{"type": "text", "text": text}]}
        elif self.path.endswith("/chat/completions"):
            obj = {"model": "openai-mock", "choices": [{"message": {"content": text}}]}
        else:
            obj = {"modelVersion": "gemini-mock", "candidates": [{"content": {"parts": [{"text": text}]}}]}
        raw = json.dumps(obj).encode()
        self.send_response(200); self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(raw))); self.end_headers(); self.wfile.write(raw)


@pytest.fixture(scope="module")
def base():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Mock)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()


@pytest.fixture(autouse=True)
def reset():
    Mock.script, Mock.requests = [], []


PROVIDERS = [
    ("anthropic", {"ANTHROPIC_API_KEY": "k"}, None, "/messages"),
    ("openai", {"OPENAI_API_KEY": "k"}, None, "/chat/completions"),
    ("gemini", {"GEMINI_API_KEY": "k"}, "gemini-some-model", ":generateContent"),
    ("openai-compatible", {}, "llama-local", "/chat/completions"),
]


def user_text(req):
    b = req["body"]
    if req["path"].endswith("/messages"):
        return b["system"] + "\n" + b["messages"][0]["content"]
    if req["path"].endswith("/chat/completions"):
        return "\n".join(m["content"] for m in b["messages"])
    return b["systemInstruction"]["parts"][0]["text"] + "\n" + b["contents"][0]["parts"][0]["text"]


@pytest.mark.parametrize("provider,env,model,path", PROVIDERS)
def test_each_provider_returns_a_validated_section(base, tmp_path, provider, env, model, path):
    Mock.script = ["Here is the analysis:\n```json\n" + json.dumps(GOOD) + "\n```"]
    an = A.make_analyzer(provider=provider, model=model, base_url=base, cache_dir=str(tmp_path), env=env)
    out = an.analyze_section(ticker="NWSC", quarter_label="Q2 2025", section="qa", text="Analyst: margins? Mgmt: …")
    assert out.guidance_change == "hold" and out.notable_passages[0].tag == "evasion"
    assert len(Mock.requests) == 1 and Mock.requests[0]["path"].endswith(path)
    sent = user_text(Mock.requests[0])
    assert A.SYSTEM_PROMPT in sent, "the analyst prompt is sent unchanged to every provider"
    assert '"guidance_change"' in sent and "JSON Schema" in sent, "the schema travels in the prompt, not in a vendor feature"
    body = Mock.requests[0]["body"]
    assert "tools" not in body and "response_format" not in body and "tool_choice" not in body


def test_invalid_reply_gets_one_repair_round(base, tmp_path):
    bad = dict(GOOD, guidance_change="up")            # outside the Literal
    Mock.script = [json.dumps(bad), json.dumps(GOOD)]
    an = A.make_analyzer(provider="openai-compatible", model="m", base_url=base, cache_dir=str(tmp_path), env={})
    out = an.analyze_section(ticker="T", quarter_label="Q1 2025", section="qa", text="x")
    assert out.guidance_change == "hold"
    assert len(Mock.requests) == 2
    repair = Mock.requests[1]["body"]["messages"][1]["content"]
    assert "did not validate" in repair and "guidance_change" in repair


def test_second_invalid_reply_raises_instead_of_returning_garbage(base, tmp_path):
    Mock.script = ["I think margins were fine.", json.dumps(dict(GOOD, tone=7))]
    an = A.make_analyzer(provider="gemini", model="g", base_url=base, cache_dir=str(tmp_path), env={"GEMINI_API_KEY": "k"})
    with pytest.raises(RuntimeError, match="did not match the schema"):
        an.analyze_section(ticker="T", quarter_label="Q1 2025", section="qa", text="x")
    assert len(Mock.requests) == 2
    assert not list((tmp_path / "llm").glob("*.json")), "nothing is cached from a failed extraction"


def test_wrong_section_is_rejected(base, tmp_path):
    Mock.script = [json.dumps(dict(GOOD, section="prepared")), json.dumps(dict(GOOD, section="prepared"))]
    an = A.make_analyzer(provider="openai-compatible", model="m", base_url=base, cache_dir=str(tmp_path), env={})
    with pytest.raises(RuntimeError, match="expected 'qa'"):
        an.analyze_section(ticker="T", quarter_label="Q1 2025", section="qa", text="x")


def test_cache_hit_makes_no_call_and_is_keyed_by_provider_and_mode(base, tmp_path):
    kw = dict(ticker="T", quarter_label="Q1 2025", section="qa", text="same text")
    a1 = A.make_analyzer(provider="openai-compatible", model="m", base_url=base, cache_dir=str(tmp_path), env={})
    a1.analyze_section(**kw)
    a1.analyze_section(**kw)
    assert len(Mock.requests) == 1
    a2 = A.make_analyzer(provider="gemini", model="m", base_url=base, cache_dir=str(tmp_path), env={"GEMINI_API_KEY": "k"})
    a2.analyze_section(**kw)
    assert len(Mock.requests) == 2, "a different provider must not reuse another provider's cached answer"
    assert a1.provider_label == "openai-compatible/json" and a2.provider_label == "gemini/json"


def test_defaults_and_errors(tmp_path):
    assert A.make_analyzer(env={"ANTHROPIC_API_KEY": "k"}, cache_dir=str(tmp_path)).inner.model == "claude-sonnet-5"
    assert A.make_analyzer(provider="openai", env={"OPENAI_API_KEY": "k", "OPENAI_MODEL": "x"}, cache_dir=str(tmp_path)).inner.model == "x"
    assert A.make_analyzer(provider="openai", env={"OPENAI_API_KEY": "k", "OPENAI_MODEL": "x", "LLM_MODEL": "y"}, cache_dir=str(tmp_path)).inner.model == "y"
    with pytest.raises(llm.ConfigError, match="LLM_MODEL is required for gemini"):
        A.make_analyzer(provider="gemini", env={"GEMINI_API_KEY": "k"})
    with pytest.raises(ValueError, match="native exists only for anthropic and openai"):
        A.make_analyzer(provider="openai-compatible", structured="native", env={})
    with pytest.raises(llm.ConfigError, match="ANTHROPIC_API_KEY"):
        A.make_analyzer(env={})
