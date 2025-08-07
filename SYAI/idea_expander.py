# -*- coding: utf-8 -*-
import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

class IdeaExpander:
    def __init__(self):
        """
        아이디어 확장기 초기화.
        환경 변수에서 API 키를 로드하고 Gemini 모델을 설정합니다.
        """
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        print("IdeaExpander가 활성화되었습니다. (Gemini AI 사용)")

    def _make_prompt(self, refined_data: dict) -> str:
        refined_text = json.dumps(refined_data, indent=2, ensure_ascii=False)
        return f"""
        당신은 상상력이 풍부한 IT 서비스 기획자입니다.
        아래에 제시된 정리된 아이디어를 바탕으로, 이 서비스를 더욱 매력적으로 만들 수 있는 창의적이고 구체적인 확장 아이디어 3가지를 제안해 주세요.

        **현재 아이디어:**
        ```json
        {refined_text}
        ```

        **제안 조건:**
        - 사용자의 흥미를 유발할 만한 혁신적인 기능이어야 합니다.
        - 각 제안은 한 문장의 명확한 기능 설명 형태여야 합니다.
        - 비즈니스 모델이나 수익화와 관련된 아이디어도 좋습니다.

        **출력 형식:**
        반드시 아래와 같은 순수한 JSON 형식으로만 응답해야 합니다. 다른 설명은 절대 추가하지 마세요.
        {{
          "suggestions": [
            "1. (제안 1)",
            "2. (제안 2)",
            "3. (제안 3)"
          ]
        }}
        """

    def expand(self, refined_data: dict) -> list[str]:
        """
        정제된 아이디어를 Gemini에게 전달하여 확장 아이디어 제안을 받습니다.
        """
        print("Gemini AI로 확장 아이디어 생성 중...")
        
        prompt = self._make_prompt(refined_data)
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()

            # Gemini 응답에서 JSON 코드 블록 정리
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            suggestions_data = json.loads(response_text)
            print("확장 아이디어 생성 완료.")
            return suggestions_data.get("suggestions", [])
            
        except Exception as e:
            print(f"❌ Gemini API 호출 또는 JSON 파싱 오류: {e}")
            print("--- Gemini 원본 응답 ---")
            try:
                print(response.text)
            except NameError:
                print("응답을 받지 못했습니다.")
            print("--------------------")
            return ["AI 제안 생성에 실패했습니다. 다시 시도해 주세요."]


if __name__ == '__main__':
    # 모듈 단독 테스트
    expander = IdeaExpander()
    test_refined_data = {
        "goal": "AI가 사용자의 옷장 사진을 분석하여 날씨에 맞는 데일리 코디를 추천하는 서비스",
        "target_user": "패션에 관심은 많지만 매일 아침 옷 고르기 어려워하는 20-30대 직장인 및 학생",
        "core_features": [
            "스마트폰 카메라를 이용한 의류 사진 촬영 및 자동 등록",
            "위치 기반 실시간 날씨 정보 연동",
            "사용자 스타일(캐주얼, 포멀 등) 설정 기능",
            "AI 기반 개인화 코디 조합 추천"
        ]
    }
    
    suggestions = expander.expand(test_refined_data)
    
    print("\n--- Gemini가 제안하는 확장 아이디어 ---")
    for suggestion in suggestions:
        print(f"- {suggestion}")
