from typing import List, Dict, Any
import time

import google.generativeai as genai


SYS_PROMPT = (
	"당신은 한국어 기술 문서 작성 전문가입니다. 사용자 제공 기획서/기능명세서/유사 프로젝트 근거를 바탕으로 연구개발계획서 각 섹션을 간결하고 구조적으로 작성하세요. 표나 목록은 Markdown으로 정리하세요. 불확실하면 '추가 근거 필요'로 표시하세요."
)


class SectionWriter:
	def __init__(self, api_key: str, model_name: str, temperature: float = 0.2, max_retry: int = 3):
		genai.configure(api_key=api_key)
		self.model_name = model_name
		self.temperature = temperature
		self.max_retry = max_retry

	def _call_model(self, messages: List[Dict[str, str]]) -> str:
		for attempt in range(1, self.max_retry + 1):
			try:
				model = genai.GenerativeModel(self.model_name)
				resp = model.generate_content(
					messages,
					generation_config={"temperature": self.temperature},
					request_options={"timeout": 45},
				)
				return resp.text or ""
			except Exception:
				if attempt == self.max_retry:
					return ""
				time.sleep(1.5 * attempt)
		return ""

	def write_section(self, section_meta: Dict[str, Any], support_chunks: List[str]) -> str:
		sec_title = section_meta.get("title", "섹션")
		outline = section_meta.get("outline", "")
		guidance = section_meta.get("guidance", "")

		# 근거를 여러 turn으로 분할 투입하여 컨텍스트 과부하 방지
		messages: List[Dict[str, str]] = [
			{"role": "user", "parts": [SYS_PROMPT]},
			{"role": "user", "parts": [f"섹션 제목: {sec_title}"]},
			{"role": "user", "parts": [f"아웃라인: {outline}"]},
			{"role": "user", "parts": [f"가이드: {guidance}"]},
		]

		accum_summary = ""
		for i, chunk in enumerate(support_chunks[:6], start=1):
			turn = [
				{"role": "user", "parts": [f"근거 #{i}:", chunk[:3000]]}
			]
			text = self._call_model(messages + turn + [
				{"role": "user", "parts": [
					"위 근거를 요약하고 섹션 작성에 필요한 핵심 bullet을 5줄 이내로 추출하세요.",
				]}
			])
			accum_summary += f"\n- 근거{i} 요약: " + (text.strip() if text else "(요약 실패)")

		# 최종 작성 요청 (요약을 근거로 사용)
		final_msgs: List[Dict[str, str]] = [
			{"role": "user", "parts": [SYS_PROMPT]},
			{"role": "user", "parts": [
				f"섹션 제목: {sec_title}",
				f"아웃라인: {outline}",
				f"가이드: {guidance}",
				"이하는 근거 요약입니다:",
				accum_summary[:12000],
				"요구사항: 1) 한국어, 2) Markdown 구조, 3) 불확실한 부분은 '추가 근거 필요', 4) 700~1200자."
			]}
		]
		final_text = self._call_model(final_msgs)
		return final_text.strip() if final_text else "추가 근거 필요 — 생성 실패 또는 타임아웃"
