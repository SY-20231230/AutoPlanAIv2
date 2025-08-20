from pathlib import Path


def ensure_dir(path: Path) -> None:
	path.mkdir(parents=True, exist_ok=True)


def write_text(path: str, content: str) -> None:
	p = Path(path)
	ensure_dir(p.parent)
	p.write_text(content, encoding="utf-8")
