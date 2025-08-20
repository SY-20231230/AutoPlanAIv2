# -*- coding: utf-8 -*-
import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

class IdeaRefiner:
    def __init__(self):
        """
        아이디어 정제기 초기화.
        환경 변수에서 API 키를 로드하고 Gemini 모델을 설정합니다.
        """
        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY_4")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        print("IdeaRefiner가 활성화되었습니다. (Gemini AI 사용)")

    def _make_prompt(self, raw_idea: str) -> str:
        return f"""
        당신은 뛰어난 IT 기획자입니다. 사용자가 제시한 아이디어를 분석하여 체계적인 구조로 정리하는 역할을 맡았습니다.

        다음 사용자의 아이디어를 분석하여, '핵심 목표', '타겟 사용자', '주요 기능' 세 가지 항목으로 요약해 주세요.
        '주요 기능'은 최소 3개 이상 구체적으로 제시해야 합니다.

        **사용자 아이디어:**
        "{raw_idea}"

        **출력 형식:**
        반드시 아래와 같은 순수한 JSON 형식으로만 응답해야 합니다. 다른 설명은 절대 추가하지 마세요.
        {{
          "goal": "...",
          "target_user": "...",
          "core_features": [
            "...",
            "...",
            "..."
          ]
        }}
        """

    def refine(self, raw_idea: str) -> dict:
        """
        입력된 아이디어를 Gemini를 통해 분석하고 구조화된 dict로 반환합니다.
        """
        print(f"Gemini AI로 아이디어 분석 중: \"{raw_idea}\"")
        
        prompt = self._make_prompt(raw_idea)
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Gemini 응답에서 JSON 코드 블록 정리
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            refined_data = json.loads(response_text)
            print("아이디어 분석 및 구조화 완료.")
            return refined_data
            
        except Exception as e:
            print(f"❌ Gemini API 호출 또는 JSON 파싱 오류: {e}")
            print("--- Gemini 원본 응답 ---")
            try:
                print(response.text)
            except NameError:
                print("응답을 받지 못했습니다.")
            print("--------------------")
            # 실패 시 비어있는 기본 구조 반환
            return {
                "goal": "AI 분석에 실패했습니다.",
                "target_user": "AI 분석에 실패했습니다.",
                "core_features": ["오류가 발생했습니다. 다시 시도해 주세요."]
            }

if __name__ == '__main__':
    # 모듈 단독 테스트
    refiner = IdeaRefiner()
    test_idea = "AI가 내가 가진 옷들 사진을 보고 날씨에 맞춰서 어떻게 입을지 코디를 추천해주는 앱"
    refined_result = refiner.refine(test_idea)
    
    print("\n--- 정제된 아이디어 (by Gemini) ---")
    print(f"🎯 목표: {refined_result.get('goal')}")
    print(f"👥 타겟 사용자: {refined_result.get('target_user')}")
    print("✨ 주요 기능:")
    for feature in refined_result.get('core_features', []):
        print(f"  - {feature}")
