import os
import re
import argparse
from pathlib import Path
from typing import List

from tqdm import tqdm

from src.io_loaders import load_any_to_text_chunks
from src.plan import generate_or_load_plan
from src.rag import build_corpus_index, find_supporting_chunks
from src.writer import SectionWriter
from src.utils import ensure_dir, write_text
from src.docx_utils import new_doc, append_markdownish_section, save_doc


SUPPORTED_EXTS = {".pdf", ".docx", ".md", ".markdown", ".json"}


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(description="연구개발계획서 자동 작성 파이프라인")
	parser.add_argument("--inputs", nargs="*", help="입력 파일 경로들(.docx .pdf .md .json) — 제공 없으면 대화형 모드")
	parser.add_argument("--plan", type=str, default="plans/rd_plan_sections.json", help="섹션 계획 JSON 경로(없으면 생성)")
	parser.add_argument("--out", type=str, default="outputs/rd_proposal.docx", help="출력 경로(.docx 기본, .md도 가능)")
	parser.add_argument("--model", type=str, default="gemini-2.5-flash", help="Gemini 모델 명")
	parser.add_argument("--api_key", type=str, default=os.environ.get("GOOGLE_API_KEY", ""), help="Google API Key (환경변수 GOOGLE_API_KEY 우선)")
	parser.add_argument("--max_chunk_tokens", type=int, default=1200, help="모델 호출당 근거 텍스트 토큰 상한(대략치)")
	parser.add_argument("--max_retry", type=int, default=3, help="LLM 호출 재시도 횟수")
	parser.add_argument("--temp", type=float, default=0.2, help="생성 온도")
	return parser.parse_args()


def _clean_dropped_path(s: str) -> str:
	"""PowerShell 드래그&드롭 패턴 정리: & 'C:\\path with space\\file.docx'"""
	s = s.strip()
	# 앞의 & 제거
	if s.startswith("&"):
		s = s[1:].strip()
	# 따옴표로 감쌌을 경우 내부만 추출
	m = re.match(r"^[`\"'](?P<p>.*)[`\"']$", s)
	if m:
		s = m.group("p").strip()
	# 양끝 불필요한 따옴표 다시 제거
	s = s.strip('"').strip("'")
	return s


def _input_path(prompt: str, required: bool = True) -> str:
	while True:
		raw = input(prompt)
		p = _clean_dropped_path(raw)
		if not p and not required:
			return ""
		if not p:
			print("입력이 필요합니다.")
			continue
		# 상대경로/홈경로 정규화
		p = os.path.expanduser(p)
		p = os.path.normpath(p)
		if not os.path.isabs(p):
			p = str((Path.cwd() / p).resolve())
		if not os.path.exists(p):
			print("파일을 찾을 수 없습니다. 다시 입력하세요. (PowerShell 드래그&드롭 시 & 와 따옴표를 제거)\n예) C:\\Users\\...\\기획 서.docx")
			continue
		ext = Path(p).suffix.lower()
		if ext not in SUPPORTED_EXTS:
			print(f"지원하지 않는 확장자입니다({ext}). 계속 진행하려면 Enter, 다시 입력은 경로 재입력.")
			confirm = input("계속 진행하시겠습니까? (y/N): ").strip().lower()
			if confirm != "y":
				continue
		return p


def _input_multi_paths(prompt: str) -> List[str]:
	raw = input(prompt).strip()
	if not raw:
		return []
	candidates = [
		_clean_dropped_path(s)
		for s in raw.split(",")
		if s.strip()
	]
	valid: List[str] = []
	for p in candidates:
		q = os.path.normpath(os.path.expanduser(p))
		if not os.path.isabs(q):
			q = str((Path.cwd() / q).resolve())
		if os.path.exists(q):
			valid.append(q)
		else:
			print(f"경고: 파일이 없음 — {q} (건너뜀)")
	return valid


def interactive_collect(args: argparse.Namespace) -> argparse.Namespace:
	print("[대화형] 연구개발계획서 자동 작성")
	api_key = args.api_key
	if not api_key:
		api_key = input("Google API Key를 입력하세요(엔터 시 종료): ").strip()
		if not api_key:
			raise SystemExit("API Key가 필요합니다.")

	print("\n필수 입력을 순서대로 받습니다. 경로는 드래그&드롭 후 앞의 & 과 따옴표를 제거해 붙여넣기 가능합니다.")
	plan_doc = _input_path("1) 기획서 파일 경로(.docx/.pdf/.md/.json): ")
	spec_doc = _input_path("2) 기능명세서 파일 경로(.docx/.pdf/.md/.json): ")

	print("\n유사 프로젝트 자료는 선택입니다. 여러 개면 쉼표로 구분.")
	use_similar = input("유사 프로젝트 자료를 추가하시겠습니까? (y/N): ").strip().lower() == "y"
	similar_docs: List[str] = []
	if use_similar:
		similar_docs = _input_multi_paths("파일 경로들을 쉼표로 구분해 입력: ")

	out_path = _clean_dropped_path(input(f"\n출력 경로(기본 {args.out}) — Enter로 기본값: "))
	if not out_path:
		out_path = args.out

	model_name = input(f"모델 명(기본 {args.model}) — Enter로 기본값: ").strip() or args.model

	collected = argparse.Namespace(
		inputs=[plan_doc, spec_doc] + similar_docs,
		plan=args.plan,
		out=out_path,
		model=model_name,
		api_key=api_key,
		max_chunk_tokens=args.max_chunk_tokens,
		max_retry=args.max_retry,
		temp=args.temp,
	)
	return collected


def run_pipeline(args: argparse.Namespace) -> None:
	# 1) 입력 로드 및 청크 분할
	all_chunks = []
	for path in tqdm(args.inputs, desc="입력 로드"):
		if not os.path.exists(path):
			raise SystemExit(f"입력 파일을 찾을 수 없습니다: {path}")
		chunks = load_any_to_text_chunks(path)
		all_chunks.extend(chunks)

	# 2) 섹션 플랜 준비(없으면 생성)
	plan = generate_or_load_plan(plan_json_path=args.plan, evidence_chunks=all_chunks)

	# 3) 코퍼스 인덱스 구성(RAG)
	index = build_corpus_index(all_chunks)

	# 4) 섹션별로 생성
	writer = SectionWriter(api_key=args.api_key, model_name=args.model, temperature=args.temp, max_retry=args.max_retry)

	section_pairs: List[tuple[str, str]] = []
	for section in tqdm(plan["sections"], desc="섹션 작성"):
		sec_title: str = section["title"]
		outline: str = section.get("outline", "")
		guidance: str = section.get("guidance", "")

		# 섹션에 필요한 근거 추출
		support = find_supporting_chunks(index=index, query=f"{sec_title}\n{outline}\n{guidance}", k=12, max_tokens=args.max_chunk_tokens)

		md = writer.write_section(
			section_meta=section,
			support_chunks=support,
		)
		section_pairs.append((sec_title, md))

	# 5) 저장 (기본 .docx, .md도 지원)
	ensure_dir(Path(args.out).parent)
	ext_out = Path(args.out).suffix.lower()
	if ext_out == ".md":
		# 기존 md 경로로 저장
		write_text(args.out, "\n\n".join([f"## {t}\n\n{m}\n" for t, m in section_pairs]))
	else:
		# docx 기본 저장
		doc = new_doc()
		for title, md in section_pairs:
			append_markdownish_section(doc, title, md)
		save_doc(doc, args.out)
	print(f"완료: {args.out}")


def main() -> None:
	args = parse_args()
	# 대화형 모드 진입 조건: --inputs 미지정 또는 빈 목록
	if not args.inputs:
		args = interactive_collect(args)
	else:
		# 비대화형일 땐 API 키 확인
		if not args.api_key:
			raise SystemExit("GOOGLE_API_KEY가 필요합니다. --api_key 또는 환경변수로 설정하세요.")
	# 파이프라인 실행
	run_pipeline(args)


if __name__ == "__main__":
	main()
