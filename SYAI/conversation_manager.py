# -*- coding: utf-8 -*-
import os
import json
import re
from dotenv import load_dotenv
import google.generativeai as genai

class ConversationManager:
    def __init__(self):
        """
        대화 관리자 초기화.
        환경 변수에서 API 키를 로드하고 Gemini 모델을 설정합니다.
        """
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        print("ConversationManager가 활성화되었습니다. (Gemini AI 사용)")

    def _make_prompt(self, user_input: str, current_idea: dict) -> str:
        current_idea_text = json.dumps(current_idea, indent=2, ensure_ascii=False)
        return f"""
        당신은 IT 기획 회의의 노련한 진행자입니다.
        현재까지 논의된 기획안과 사용자의 새로운 요청을 바탕으로, 기획안을 어떻게 수정해야 할지 판단하고 그 결과를 JSON으로 반환해야 합니다.

        **현재 기획안:**
        ```json
        {current_idea_text}
        ```

        **사용자의 새로운 요청:**
        "{user_input}"

        **처리 규칙:**
        1.  **의도 파악**: 사용자의 요청이 '기능 추가', '기능 수정', '기능 삭제', '목표 수정', '타겟 수정' 중 어떤 것인지 파악합니다.
        2.  **데이터 수정**: 파악된 의도에 따라 현재 기획안(JSON)을 수정합니다.
            - **추가**: `core_features` 리스트에 새로운 기능 설명을 추가합니다.
            - **수정/삭제**: 요청에 맞게 `goal`, `target_user` 또는 `core_features`의 특정 항목을 변경하거나 제거합니다.
        3.  **의견 응답**: 만약 사용자의 요청이 단순 의견이거나 수정할 내용이 명확하지 않다면, 데이터를 수정하지 말고 친절하게 추가 질문을 유도하는 응답을 생성합니다.

        **출력 형식:**
        반드시 다음 두 가지 중 하나의 순수한 JSON 형식으로만 응답해야 합니다.

        **1. 기획안을 수정한 경우:**
        ```json
        {{
          "action": "update",
          "updated_idea": {{
            "goal": "...",
            "target_user": "...",
            "core_features": ["...", "..."]
          }}
        }}
        ```

        **2. 수정하지 않고 추가 질문/응답이 필요한 경우:**
        ```json
        {{
          "action": "respond",
          "response_message": "어떤 기능을 수정하고 싶으신가요? 좀 더 자세히 말씀해주세요."
        }}
        ```
        """

    def manage(self, user_input: str, current_idea: dict) -> dict:
        """
        사용자 입력을 Gemini가 해석하여 현재 아이디어를 수정하거나, 응답 메시지를 생성합니다.
        """
        print(f"Gemini AI로 사용자 피드백 분석 중: \"{user_input}\"")
        
        prompt = self._make_prompt(user_input, current_idea)
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()

            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            action_data = json.loads(response_text)
            
            if action_data.get("action") == "update":
                print("✅ 기획안이 수정되었습니다.")
                return action_data.get("updated_idea", current_idea)
            else: # action == "respond"
                print("💡 AI가 추가 질문을 생성했습니다.")
                # 사용자에게 AI의 응답을 보여주고, 아이디어는 그대로 유지
                print(f"AI: {action_data.get('response_message')}")
                return current_idea

        except Exception as e:
            print(f"❌ Gemini API 호출 또는 JSON 파싱 오류: {e}")
            print("--- Gemini 원본 응답 ---")
            try:
                print(response.text)
            except NameError:
                print("응답을 받지 못했습니다.")
            print("--------------------")
            print("AI: 죄송합니다, 요청을 처리하는 데 문제가 발생했습니다.")
            return current_idea


if __name__ == '__main__':
    # 모듈 단독 테스트
    manager = ConversationManager()
    test_idea = {
        "goal": "AI 기반 데일리 코디 추천 서비스",
        "target_user": "20-30대 직장인 및 학생",
        "core_features": ["의류 사진 자동 등록", "날씨 연동", "개인화 코디 추천"]
    }
    
    print("--- 초기 아이디어 ---")
    print(json.dumps(test_idea, indent=2, ensure_ascii=False))

    print("\n--- 대화 시나리오 1: 기능 추가 ---")
    user_message_1 = "내가 가진 옷들로만 코디를 짜주는 기능도 추가해줘"
    updated_1 = manager.manage(user_message_1, test_idea)
    print(json.dumps(updated_1, indent=2, ensure_ascii=False))

    print("\n--- 대화 시나리오 2: 단순 의견 ---")
    user_message_2 = "음.. 좀 더 세련된 느낌이면 좋겠어요."
    updated_2 = manager.manage(user_message_2, updated_1)
    # updated_2는 updated_1과 동일해야 함
    
    print("\n--- 최종 아이디어 ---")
    print(json.dumps(updated_2, indent=2, ensure_ascii=False))
