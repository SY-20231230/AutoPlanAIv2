import os
import json
import glob
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

# 1. 환경 변수 로드 및 Gemini 설정
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# 2. Gemini 프롬프트 생성 함수
def make_refine_prompt(plan_text, feature_list):
    return f"""
당신은 소프트웨어 기획서를 구조화하고 정리하는 역할을 맡았습니다.  
아래는 **원래 기획서 원문**과 그로부터 추출한 **기능 명세 목록**입니다.

이제 이 정보를 바탕으로, 더 깔끔하고 명확한 구조의 **최종 기획서 문서**를 작성하십시오.

---

📄 기획서 원문:
{plan_text}

---

🧱 기능 명세 목록:
{json.dumps(feature_list, indent=2, ensure_ascii=False)}

---

✍️ 출력 형식:

- 전체 시스템 개요
- 핵심 기능 요약
- 주요 사용자 시나리오
- 세부 기능 설명 (기능ID 기준으로 나열)
- 각 기능의 목적, 흐름, 입력/출력, 예외처리 등을 문장으로 풀어서 설명
- UI 구성 요소 제안
- 향후 확장 가능성 및 외부 연동 가능성 정리

📌 전체 내용은 문장으로 자연스럽게 작성하되, 구조화된 기술 기획서 스타일로 마무리하세요. 최종 결과물은 다른 설명이나 Markdown 코드 블록 없이, 순수한 JSON 배열 형식으로만 출력해야 합니다.
"""

# 3. 메인 실행 함수
def refine_features():
    input_file = input("📂 불러올 JSON 파일명을 입력하세요 (예: features_2.json): ").strip()

    try:
        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            plan_text = "\n".join(data["기획서원문"])
            feature_list = data["기능목록"]
    except Exception as e:
        print("❌ 입력 파일 로딩 실패:", e)
        return

    # Gemini 호출
    prompt = make_refine_prompt(plan_text, feature_list)
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(prompt, generation_config=GenerationConfig(temperature=0.2))
    result_text = response.text.strip()

    # Gemini 응답에서 JSON 코드 블록 정리 및 파싱
    if result_text.startswith("```json"):
        result_text = result_text[7:]
    if result_text.endswith("```"):
        result_text = result_text[:-3]
    result_text = result_text.strip()

    try:
        refined_json = json.loads(result_text)
    except json.JSONDecodeError as e:
        print(f"❌ Gemini 응답을 JSON으로 파싱하는 데 실패했습니다: {e}")
        print("--- Gemini 원본 응답 ---")
        print(result_text)
        print("--------------------")
        print("⚠️ 원본 텍스트를 그대로 파일에 저장합니다.")
        refined_json = result_text # 파싱 실패 시 원본 텍스트 사용


    # 저장할 파일 이름 자동 생성
    existing = glob.glob("features_*.json")
    existing_nums = [
        int(f.split("_")[1].split(".")[0])
        for f in existing
        if f.startswith("features_") and f.split("_")[1].split(".")[0].isdigit()
    ]
    next_index = max(existing_nums) + 1 if existing_nums else 1
    filename = f"features_{next_index}.json"

    # 결과 저장
    try:
        with open(filename, "w", encoding="utf-8") as f:
            json.dump({"정제기획서": refined_json}, f, ensure_ascii=False, indent=2)
        print(f"✅ 정제된 기획서가 '{filename}'에 저장되었습니다.")
    except Exception as e:
        print("❌ 파일 저장 실패:", e)

# 실행
if __name__ == "__main__":
    refine_features()
