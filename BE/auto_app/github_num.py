# -*- coding: utf-8 -*-
"""
github_num.py
- Gemini로 레포지터리 유사도 점수(0~5, 소수점 허용)와 비교 코멘트를 생성
- 프롬프트: 첫 줄은 '0~5 사이 실수 한 개'만 출력하도록 강제
- 파싱: 정규식으로 어디에 있든 첫 번째 0~5 실수를 뽑고, 실패 시 '숫자만' 재요청
"""

import os
import time
import re
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

# ──────────────────────────────────────────────────────────────────────────────
# 환경 설정: 제미나이 키(.env: GEMINI_API_KEY_3)
# ──────────────────────────────────────────────────────────────────────────────
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY_3")
if not api_key:
    # 키가 없어도 모듈 import는 되게 두고, 호출 시 에러 메시지 반환
    pass
genai.configure(api_key=api_key)

# 모델/설정
_GEMINI_MODEL = "gemini-2.5-flash"
_GENCFG = GenerationConfig(temperature=0.1)

__all__ = ["make_similarity_prompt", "gemini_similarity_eval"]


# ──────────────────────────────────────────────────────────────────────────────
# 유틸
# ──────────────────────────────────────────────────────────────────────────────
_FLOAT_0_5 = re.compile(r"\b(?:5(?:\.0+)?|[0-4](?:\.\d+)?|0(?:\.\d+)?)\b")

def _extract_float_0_5(s: str):
    """문자열 어디에서든 0~5 사이의 첫 번째 실수(또는 정수)를 찾아 float로 반환. 없으면 None."""
    if not s:
        return None
    m = _FLOAT_0_5.search(s)
    if not m:
        return None
    try:
        return float(m.group(0))
    except Exception:
        return None


# ──────────────────────────────────────────────────────────────────────────────
# 프롬프트
# ──────────────────────────────────────────────────────────────────────────────
def make_similarity_prompt(requirement_text: str, repo_desc: str, repo_readme: str) -> str:
    """
    requirement_text: 내 요구사항 요약(뷰에서 합쳐서 전달)
    repo_desc: GitHub repo description
    repo_readme: README 텍스트(길면 앞부분 몇천자만 잘라서 넣을 것)
    """
    return f"""
너는 인공지능 소프트웨어 평가 전문가야.
아래 1번은 내가 만들고자 하는 소프트웨어 '기술명세서'이고,
2번은 평가 대상이 되는 깃허브 오픈소스 프로젝트의 설명 및 README야.

[평가 방법]
- 1번과 2번의 유사도를 0~5점(5=거의 완전 유사/복붙 가능, 2.5=절반 정도 유사, 0=거의 무관)으로 평가해.
- 실제 기능/핵심 역할/데이터 연동/알고리즘/구현 구조 같은 **핵심 구현 요소** 기준으로 판단.
- 단순 키워드/이름 유사도는 점수에 큰 영향 주지마.

[⚠️ 출력 형식(매우 중요)]
- **첫 줄에는 0~5 사이의 실수(소수점 허용) 한 개만** 출력한다. 다른 문자/기호/설명 금지.
- **두 번째 줄부터** 상세 비교 분석을 3~5줄 이상 작성한다(핵심 유사점·차이, 참고 포인트, 부족한 점 등).

[1] 내 기술명세서:
{requirement_text}

[2] 오픈소스 설명:
{repo_desc}

[3] 오픈소스 README:
{repo_readme}
""".strip()


# ──────────────────────────────────────────────────────────────────────────────
# 호출/파싱
# ──────────────────────────────────────────────────────────────────────────────
def gemini_similarity_eval(prompt: str, retry: int = 6, delay: float = 1.5):
    """
    Gemini로 유사도 점수와 코멘트를 생성.
    반환: (score:float[0..5], comment:str)
      - score: 0~5 (소수 허용). 실패/파싱오류 시 0.0을 반환해 항상 숫자 보장.
      - comment: 상세 비교 분석(첫 응답의 전체 텍스트를 그대로 보관)
    """
    if not api_key:
        return 0.0, "Gemini API Key 미설정(GEMINI_API_KEY_3)."

    model = genai.GenerativeModel(_GEMINI_MODEL)
    curr = delay

    for _ in range(retry):
        try:
            res = model.generate_content(prompt, generation_config=_GENCFG)
            txt = (res.text or "").strip()

            # 1차: 전체에서 0~5 실수 스캔(첫 줄 강제했더라도 전범위 방어)
            score = _extract_float_0_5(txt)
            if score is not None:
                return float(score), txt

            # 2차: 숫자만 재요청
            res2 = model.generate_content(
                "방금 비교 평가의 유사도 점수를 0~5 사이 실수 **한 줄만** 출력해. (예: 3.7)"
            )
            txt2 = (res2.text or "").strip()
            score = _extract_float_0_5(txt2)
            if score is not None:
                return float(score), txt  # 코멘트는 1차 전체 응답을 유지

        except Exception:
            time.sleep(curr)
            curr = min(curr * 2, 12)

    # 최종 실패
    return 0.0, "Gemini 평가 실패"
