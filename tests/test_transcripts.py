"""The prepared/Q&A splitter. Contract: the first operator hand-off phrase the regex knows ends the prepared remarks;
the phrase itself is dropped; everything after it is Q&A. Words the operator says *before* the key phrase ("We will now")
stay in the prepared text — the split is on the phrase, not on the sentence."""
import pytest

from src.transcripts import split_prepared_qa, QA_RE, Transcript

PREPARED = "Good afternoon. Revenue grew 12% and margins expanded. We raised full-year guidance."
QA = "Analyst: Can you talk about pricing? CFO: Pricing was stable."

MARKERS = [
    "We will now begin the question-and-answer session.",
    "Let's begin the Q&A.",
    "We'll open it up for questions now.",
    "Operator: Our first question comes from the line of an analyst.",
    "We will now take questions.",
    "We'll move to questions.",
    "we would now open the call to questions",
]


@pytest.mark.parametrize("marker", MARKERS)
def test_every_documented_phrasing_is_recognised(marker):
    assert QA_RE.search(marker), f"regex must recognise: {marker}"


@pytest.mark.parametrize("marker", MARKERS)
def test_marker_ends_prepared_and_starts_qa(marker):
    prepared, qa = split_prepared_qa(f"{PREPARED} {marker} {QA}")
    assert prepared.startswith(PREPARED), "everything before the hand-off stays in prepared remarks"
    assert QA not in prepared, "no analyst text may leak into the prepared section"
    assert qa.lstrip(". ").endswith(QA) and QA in qa, "everything after the hand-off is Q&A"
    key = QA_RE.search(marker).group(0)
    assert key.lower() not in qa.lower(), "the matched hand-off phrase itself is dropped"


def test_no_marker_means_everything_is_prepared():
    prepared, qa = split_prepared_qa(f"{PREPARED} {QA}")
    assert prepared == f"{PREPARED} {QA}"
    assert qa == ""


def test_first_match_wins_and_matching_is_case_insensitive():
    text = f"{PREPARED} WE WILL NOW BEGIN THE QUESTION-AND-ANSWER SESSION. {QA} Our first question comes from someone."
    prepared, qa = split_prepared_qa(text)
    assert QA not in prepared
    assert qa.lstrip(". ").startswith(QA), "the split happens at the first phrase, not the last"


def test_quarter_label_and_hash_are_stable():
    t = Transcript(ticker="NWSC", year=2025, quarter=2, call_date="2025-08-27", prepared_text="p", qa_text="q")
    assert t.quarter_label == "Q2 2025"
    assert t.hash_id() == Transcript(ticker="NWSC", year=2025, quarter=2, call_date="x", prepared_text="", qa_text="").hash_id()
