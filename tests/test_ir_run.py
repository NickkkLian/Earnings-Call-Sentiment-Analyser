"""The transcript readers in src/ir_run.py on tiny hand-built files (no network, no model)."""
import io
import zipfile

import pytest

from src.ir_run import to_text


def _pdf(text: str) -> bytes:
    """A one-page PDF with one line of Helvetica text, cross-reference offsets computed."""
    stream = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode()
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
            b"/Resources << /Font << /F1 5 0 R >> >> >>",
            b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    out, offs = io.BytesIO(), []
    out.write(b"%PDF-1.4\n")
    for i, o in enumerate(objs, 1):
        offs.append(out.tell())
        out.write(b"%d 0 obj\n" % i + o + b"\nendobj\n")
    xref = out.tell()
    out.write(b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1))
    for o in offs:
        out.write(b"%010d 00000 n \n" % o)
    out.write(b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref))
    return out.getvalue()


def test_pdf_text_comes_from_pdfminer():
    pytest.importorskip("pdfminer")
    assert "Operator: first question" in to_text(_pdf("Operator: first question"), "pdf")


def test_docx_paragraphs_become_lines():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", '<w:document><w:body><w:p><w:r><w:t>CEO:</w:t></w:r></w:p>'
                   '<w:p><w:r><w:t xml:space="preserve">Revenue grew &amp; margins held.</w:t></w:r></w:p></w:body></w:document>')
    assert to_text(buf.getvalue(), "docx") == "CEO:\nRevenue grew & margins held."


def test_unknown_format_is_refused():
    with pytest.raises(ValueError, match="unknown transcript format"):
        to_text(b"", "html")
