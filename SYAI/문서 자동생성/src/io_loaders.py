import re
from pathlib import Path
from typing import List

import pdfplumber
from docx import Document


MAX_CHARS = 1800


def _normalize(text: str) -> str:
	text = text.replace("\u0000", " ")
	text = re.sub(r"\s+", " ", text)
	return text.strip()


def chunk_text(text: str, max_chars: int = MAX_CHARS) -> List[str]:
	text = _normalize(text)
	chunks: List[str] = []
	for i in range(0, len(text), max_chars):
		chunks.append(text[i : i + max_chars])
	return chunks


def load_pdf(path: str) -> List[str]:
	pages: List[str] = []
	with pdfplumber.open(path) as pdf:
		for page in pdf.pages:
			pages.append(page.extract_text() or "")
	return chunk_text("\n".join(pages))


def load_docx(path: str) -> List[str]:
	doc = Document(path)
	paras = [p.text for p in doc.paragraphs]
	return chunk_text("\n".join(paras))


def load_md(path: str) -> List[str]:
	content = Path(path).read_text(encoding="utf-8")
	return chunk_text(content)


def load_json(path: str) -> List[str]:
	content = Path(path).read_text(encoding="utf-8")
	return chunk_text(content)


def load_any_to_text_chunks(path: str) -> List[str]:
	ext = Path(path).suffix.lower()
	if ext == ".pdf":
		return load_pdf(path)
	if ext == ".docx":
		return load_docx(path)
	if ext in (".md", ".markdown"):
		return load_md(path)
	if ext == ".json":
		return load_json(path)
	raise ValueError(f"지원하지 않는 형식: {ext}")
