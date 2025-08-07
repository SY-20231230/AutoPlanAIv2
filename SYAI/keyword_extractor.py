import os
import json
import glob
import re
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

# 환경 변수 로드 및 Gemini 설정
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

STOPWORDS = {
    "기능", "프로젝트", "사용자", "시스템", "서비스", "구현", "프로그램", "정보", "관리",
    "프로세스", "결과", "지원", "설정", "활용", "작업", "목적", "요구사항", "페이지", "웹사이트",
    "사이트", "프로세스", "운영", "개발", "실행", "환경", "연동", "출력", "수집"
}

def find_latest_features_file():
    """가장 최근에 생성된 features_*.json 파일을 찾습니다."""
    existing = glob.glob("features_*.json")
    if not existing:
        return None
    existing_nums = []
    for f in existing:
        try:
            num_part = f.split("_")[-1].split(".")[0]
            if num_part.isdigit():
                existing_nums.append(int(num_part))
        except (ValueError, IndexError):
            continue
    if not existing_nums:
        return None
    latest_index = max(existing_nums)
    return f"features_{latest_index}.json"

def make_keyword_prompt(document_text):
    """키워드 추출을 위한 Gemini 프롬프트를 생성합니다."""
    return f"""
    당신은 소프트웨어 프로젝트 기획서 분석 전문가입니다.
    아래 기획서에서 GitHub에서 유사 프로젝트를 찾는 데 쓸 **구체적이고 기술적인 키워드**를 7~12개 추출해주세요.

    - 반드시 '기능', '시스템', '사용자', '프로젝트', '서비스', '구현', '프로그램'과 같은 일반적/불명확한 단어는 모두 제외.
    - 키워드는 한글 또는 영문 모두 허용하며, 기술명, 라이브러리, API, 프레임워크, 연동 서비스, 데이터 소스 등만 허용.
    - 단일 명사 또는 2~3단어 조합 가능. 예시: '여행 일정 추천', 'Google Maps API', '웹 크롤링', 'React', 'Node.js', '데이터 시각화'.
    - 추상적 단어나 너무 짧거나 불필요한 역할명은 완전히 배제하세요.
    - 반드시 순수 JSON 배열로만 출력, 주석/설명/코드블록은 절대 포함 금지.

    ---
    📄 기획서:
    {document_text}
    ---
    """

def postprocess_keywords(keywords):
    result = set()
    for kw in keywords:
        k = kw.strip().lower()
        # 한글/영문/숫자/공백/특수문자(-, .)만 허용
        if not re.match(r"^[a-zA-Z가-힣0-9 .\-]+$", k):
            continue
        if k in STOPWORDS or len(k) < 2:
            continue
        result.add(k)
    # 다시 길이순 + 가나다순 정렬
    return sorted(list(result), key=lambda x: (len(x), x))

def extract_keywords():
    latest_file = find_latest_features_file()
    if not latest_file:
        print("❌ 처리할 기획서 파일(features_*.json)을 찾을 수 없습니다.")
        return

    print(f"📄 '{latest_file}' 파일에서 키워드를 추출합니다.")
    try:
        with open(latest_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        document_content = data.get("정제기획서")
        if not document_content:
            print(f"❌ '{latest_file}' 파일에 '정제기획서' 내용이 없습니다.")
            return
        document_text = json.dumps(document_content, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"❌ '{latest_file}' 파일 로딩 실패: {e}")
        return

    print("✨ Gemini API를 호출하여 키워드를 추출하는 중입니다...")
    prompt = make_keyword_prompt(document_text)
    model = genai.GenerativeModel("gemini-2.5-flash")
    try:
        response = model.generate_content(prompt, generation_config=GenerationConfig(temperature=0.05))
        result_text = response.text.strip()
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()

        # 결과 파싱
        keywords = json.loads(result_text)
        keywords = postprocess_keywords(keywords)
        if not keywords:
            print("❌ 후처리 결과 유효한 키워드가 남지 않았습니다.")
            return

        print("\n✅ 추출된 검색 키워드(후처리 적용):")
        for keyword in keywords:
            print(f"- {keyword}")

        output_filename = "keywords.json"
        with open(output_filename, "w", encoding="utf-8") as f:
            json.dump(keywords, f, ensure_ascii=False, indent=2)
        print(f"\n💾 키워드를 '{output_filename}' 파일에 저장했습니다.")

    except json.JSONDecodeError:
        print("❌ Gemini 응답을 JSON으로 파싱하는 데 실패했습니다.")
        print("--- Gemini 원본 응답 ---")
        print(result_text)
        print("--------------------")
    except Exception as e:
        print(f"❌ 키워드 추출 중 오류 발생: {e}")

if __name__ == "__main__":
    extract_keywords()
