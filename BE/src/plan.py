from pathlib import Path
from typing import Dict, Any, List

import orjson as json

from .utils import ensure_dir


DEFAULT_PLAN = {
	"doc_title": "연구개발계획서",
	"sections": [
		{
			"id": "overview",
			"title": "개요 및 목적",
			"outline": "프로젝트 배경, 문제정의, 목표, 기대효과",
			"guidance": "기획서와 기능명세서에서 프로젝트 전반을 요약. 핵심 가설과 사용자/시장 맥락 포함.",
			"required": True,
		},
		{
			"id": "related",
			"title": "선행연구 및 유사 서비스 분석",
			"outline": "유사 프로젝트(옵션), 차별점, 인사이트",
			"guidance": "크롤링된 유사 프로젝트가 있으면 비교표와 차별화 포인트를 정리.",
			"required": False,
		},
		{
			"id": "spec",
			"title": "기능 명세 및 시스템 구성",
			"outline": "핵심 기능 우선순위, 아키텍처, 데이터 흐름",
			"guidance": "기능명세서 기반으로 MVP 범위, API/DB/모듈 구조를 섹션별로.",
			"required": True,
		},
		{
			"id": "plan",
			"title": "개발 일정 및 마일스톤",
			"outline": "단계별 산출물, 일정, 리스크",
			"guidance": "로드맵, 기간/인력 계획, 위험요소와 완화책.",
			"required": True,
		},
		{
			"id": "eval",
			"title": "성능/품질 평가 및 지표",
			"outline": "지표 정의, 측정 방법, 베이스라인",
			"guidance": "정량 지표와 평가 절차를 명확히.",
			"required": True,
		},
		{
			"id": "budget",
			"title": "예산/자원 계획",
			"outline": "인건비, 클라우드/라이선스, 기타 비용",
			"guidance": "산출 근거를 간단 표로.",
			"required": False,
		},
	]
}


def generate_or_load_plan(plan_json_path: str, evidence_chunks: List[str]) -> Dict[str, Any]:
	p = Path(plan_json_path)
	if p.exists():
		return json.loads(p.read_bytes())
	ensure_dir(p.parent)
	# 기본 템플릿을 그대로 저장. 필요 시 추후 evidence 기반 자동 커스터마이즈 가능.
	p.write_bytes(json.dumps(DEFAULT_PLAN, option=json.OPT_INDENT_2 | json.OPT_SORT_KEYS))
	return DEFAULT_PLAN
