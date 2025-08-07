# -*- coding: utf-8 -*-
import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

class PlanGenerator:
    def __init__(self):
        """
        기획서 생성기 초기화.
        환경 변수에서 API 키를 로드하고 Gemini 모델을 설정합니다.
        """
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        print("PlanGenerator가 활성화되었습니다. (Gemini AI 사용)")

    def _make_prompt(self, final_idea: dict) -> str:
        final_idea_text = json.dumps(final_idea, indent=2, ensure_ascii=False)
        return f"""
        당신은 실리콘밸리의 수석 PM(Product Manager)입니다.
        아래의 핵심 아이디어 요약본을 바탕으로, 투자자를 설득할 수 있을 만큼 상세하고 전문적인 **프로젝트 기획서 초안**을 작성해 주세요.

        **핵심 아이디어 요약:**
        ```json
        {final_idea_text}
        ```

        **기획서 포함 내용:**
        1.  **프로젝트명**: 아이디어의 핵심을 담은 창의적이고 기억하기 쉬운 이름
        2.  **개요 (Executive Summary)**: 프로젝트의 목표와 핵심 가치를 1~2문단으로 요약
        3.  **타겟 고객**: 서비스를 사용할 핵심 고객층을 구체적으로 정의
        4.  **주요 기능 상세 설명**: 요약된 각 핵심 기능에 대해, 사용자가 경험할 시나리오를 포함하여 상세히 설명
        5.  **예상 기대 효과**: 이 프로젝트가 성공했을 때 사용자 및 비즈니스 관점에서 얻을 수 있는 긍정적인 효과
        6.  **수익화 모델 제안 (선택 사항)**: 서비스에 적용할 수 있는 수익 모델 아이디어를 1~2가지 제안
        7.  **향후 로드맵**: MVP 이후 추가될 기능이나 발전 방향을 간략하게 제시

        **작성 스타일:**
        - 전문적이고 설득력 있는 톤앤매너를 유지해 주세요.
        - 마크다운(Markdown)을 사용하여 가독성 좋게 작성해 주세요. (예: `# 제목`, `## 소제목`, `- 항목`)
        - 다른 부연 설명 없이, 완성된 기획서 내용만 응답으로 생성해야 합니다.
        """

    def generate(self, final_idea: dict) -> str:
        """
        최종 아이디어를 바탕으로 Gemini를 통해 상세한 마크다운 기획서를 생성합니다.
        """
        print("Gemini AI로 최종 기획서 작성 중...")
        
        prompt = self._make_prompt(final_idea)
        
        try:
            # 더 긴 텍스트 생성을 위해 generation_config 조정 가능
            response = self.model.generate_content(prompt)
            markdown_text = response.text.strip()
            print("기획서 생성 완료.")
            return markdown_text
            
        except Exception as e:
            print(f"❌ Gemini API 호출 오류: {e}")
            return f"# 기획서 생성 실패\n\n오류가 발생했습니다: {e}"

if __name__ == '__main__':
    # 모듈 단독 테스트
    generator = PlanGenerator()
    test_final_idea = {
        "goal": "AI가 사용자의 옷장 사진을 분석하여 날씨에 맞는 데일리 코디를 추천하는 서비스",
        "target_user": "패션에 관심은 많지만 매일 아침 옷 고르기 어려워하는 20-30대 직장인 및 학생",
        "core_features": [
            "스마트폰 카메라를 이용한 의류 사진 촬영 및 자동 등록 (보유 의류 DB화)",
            "위치 기반 실시간 날씨 정보 API 연동 (기온, 강수확률 등)",
            "사용자 스타일(캐주얼, 포멀, 스트릿 등) 및 선호 색상 설정 기능",
            "AI 기반 개인화 코디 조합 추천 (상의, 하의, 아우터, 신발 등)",
            "코디 기록 저장을 위한 디지털 캘린더 기능"
        ]
    }
    
    project_plan_md = generator.generate(test_final_idea)
    
    print("\n--- Gemini가 작성한 최종 기획서 ---")
    print(project_plan_md)
    
    # 파일로 저장하여 확인
    with open("test_ai_plan.md", "w", encoding="utf-8") as f:
        f.write(project_plan_md)
    print("\n`test_ai_plan.md` 파일로 저장되었습니다.")
