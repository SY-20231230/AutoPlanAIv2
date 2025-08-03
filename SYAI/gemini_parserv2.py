import os
import json
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
import datetime
import glob
# 1. .env에서 API Key 로드
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def make_prompt(plan_text: str) -> str:
    return f'''
다음은 한 개의 소프트웨어/서비스 기획서입니다.  
당신은 이 문서를 분석하여, **기능 요구사항을 가능한 한 많이, 구체적으로, 그리고 정형화된 JSON 형식으로 추출**해야 합니다.

---

🔍 **당신의 임무**

1. 문서 전체를 끝까지 읽고, 해당 기획서에 포함된 기능을 모두 분리하여 나열하십시오.
2. 하나의 기능 안에 여러 역할이 포함되어 있더라도, **논리적으로 분리 가능한 기능은 전부 독립된 기능으로 정의**하십시오.
3. 기능은 아래 JSON 형식을 그대로 따르고, **가능한 모든 필드를 채우십시오.**

---

🧱 **기능 JSON 출력 형식**

```json
{{
  "기능ID": "FEAT-001",
  "기능명": "기능명을 간결하고 직관적으로 표현",
  "기능설명": {{
    "목적": "기능이 수행되는 이유와 필요성",
    "핵심역할": "실제로 수행하는 주된 작업 또는 처리"
  }},
  "사용자시나리오": {{
    "상황": "기능이 사용되는 사용자 상황",
    "행동": "사용자의 상호작용 방식"
  }},
  "입력값": {{
    "필수": ["필수 항목 A", "B"],
    "선택": ["선택 항목 C"],
    "형식": "예: 문자열, 숫자, 드롭다운, 날짜 등"
  }},
  "출력값": {{
    "요약정보": "간략한 출력 예",
    "상세정보": "전체 처리 결과, 세부 데이터"
  }},
  "처리방식": {{
    "단계": ["1단계", "2단계"],
    "사용모델": "예: Gemini API, 전처리기, 추천 알고리즘 등"
  }},
  "예외조건및처리": {{
    "입력누락": "처리 방식",
    "오류": "시스템 에러 발생 시 처리 방식"
  }},
  "의존성또는연동항목": ["관련 API", "외부 시스템", "라이브러리 등"],
  "기능우선순위": "높음 / 중간 / 낮음",
  "UI요소": ["입력창", "버튼", "리스트", "지도 등"],
  "테스트케이스예시": [
    "정상 입력 → 기대 결과 출력",
    "입력 누락 → 에러 메시지 출력",
    "특정 조건 → 특수 처리"
  ]
}}
📌 주의사항

기능의 수는 제한하지 마십시오. 기획서에 암시된 기능까지 모두 포함하십시오.

특정 산업/도메인에 편향되지 않게 기술 중립적 표현을 사용하십시오.

시스템에 의해 자동화 구현 가능한 단위로 기능을 정의하십시오.

함수 수준의 세분화가 가능한 경우, 분석해서 개별 기능으로 작성하십시오.
📄 **기획서 원문**

\"\"\"  
{plan_text}
\"\"\"

이제 위 기획서를 분석해 위 JSON 구조에 따라 기능 목록을 최대한 많이 생성하십시오.  
**오직 JSON 배열로만 출력하십시오. 다른 설명은 출력하지 마십시오.**
'''




# 3. Gemini 응답 함수
def generate_feature_list(plan_text: str):
    prompt = make_prompt(plan_text)
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(prompt, generation_config=GenerationConfig(temperature=0.2))

    raw = response.text.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(raw)

        # ✅ JSON 객체이거나 배열인지 확인 후 분기 처리
        if isinstance(data, dict) and "기능목록" in data:
            return data["기능목록"]
        elif isinstance(data, list):
            return data  # 이미 기능목록인 경우
        else:
            print("❌ 예상과 다른 구조:", type(data))
            return []

    except Exception as e:
        print("❌ JSON 파싱 실패:", e)
        print("🔎 원본 출력:\n", raw)
        return []

# 4. 입력 및 실행
if __name__ == "__main__":
    print("✍️ 기획서를 입력하세요 (Enter 두 번으로 종료):")
    lines = []
    while True:
        line = input()
        if line.strip() == "":
            break
        lines.append(line)
    plan_text = "\n".join(lines)

    features = generate_feature_list(plan_text)

    # 출력
    print("\n✅ 기능명세 결과 (JSON):")
    print(json.dumps(features, indent=2, ensure_ascii=False))

    existing = glob.glob("features_*.json")
    next_index = len(existing) + 1
    filename = f"features_{next_index}.json"

    # 원문 + 기능목록을 하나의 객체로 감싸서 저장
    output_data = {
        "기획서원문": plan_text.splitlines(),
        "기능목록": features
    }

    try:
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        print(f"\n💾 JSON 결과가 '{filename}' 파일에 저장되었습니다.")
    except Exception as e:
        print("❌ JSON 저장 실패:", e)