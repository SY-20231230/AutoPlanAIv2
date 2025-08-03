import os
import json
import glob
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

# 환경 변수 로드 및 Gemini 설정
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def find_latest_features_file():
    """가장 최근에 생성된 features_*.json 파일을 찾습니다."""
    existing = glob.glob("features_*.json")
    if not existing:
        return None
    
    existing_nums = []
    for f in existing:
        try:
            # 파일 이름에서 숫자 부분만 정확히 추출
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
    아래에 제공된 기획서 내용을 바탕으로, GitHub에서 유사한 오픈소스 프로젝트(특히 크롤링, 스크레이핑 관련)를 검색하는 데 사용할 만한 핵심 **기술 키워드**를 5~10개 추출해주세요.

    - 키워드는 한글 또는 영문으로 추출하세요.
    - 시스템의 핵심 기능, 사용되는 기술, 연동되는 외부 서비스, 데이터 수집 방식 등을 중심으로 추출해야 합니다.
    - 예를 들어, '여행 추천', 'API 연동', '데이터베이스', 'React', 'Crawling', 'Scraping' 등이 좋은 키워드입니다.
    - 일반적인 단어('시스템', '기능', '사용자')는 피해주세요.

    ---
    📄 기획서 내용:
    {document_text}
    ---

    ✍️ 출력 형식:
    추출된 키워드 목록을 JSON 형식의 배열(Array)로만 출력해주세요.
    예: ["키워드1", "키워드2", "키워드3"]
    다른 설명이나 Markdown 코드 블록 없이 순수한 JSON 배열만 출력해야 합니다.
    """

def extract_keywords():
    """기획서에서 키워드를 추출하는 메인 함수입니다."""
    # 1. 최신 기획서 파일 찾기
    latest_file = find_latest_features_file()
    if not latest_file:
        print("❌ 처리할 기획서 파일(features_*.json)을 찾을 수 없습니다.")
        return

    print(f"📄 '{latest_file}' 파일에서 키워드를 추출합니다.")

    # 2. 파일 로드 및 내용 준비
    try:
        with open(latest_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        document_content = data.get("정제기획서")
        if not document_content:
            print(f"❌ '{latest_file}' 파일에 '정제기획서' 내용이 없습니다.")
            return
        
        # 기획서 내용 전체를 하나의 텍스트로 만듦
        document_text = json.dumps(document_content, ensure_ascii=False, indent=2)

    except Exception as e:
        print(f"❌ '{latest_file}' 파일 로딩 실패: {e}")
        return

    # 3. Gemini를 사용하여 키워드 추출
    print("✨ Gemini API를 호출하여 키워드를 추출하는 중입니다...")
    prompt = make_keyword_prompt(document_text)
    model = genai.GenerativeModel("gemini-2.5-flash")
    try:
        response = model.generate_content(prompt, generation_config=GenerationConfig(temperature=0.1))
        result_text = response.text.strip()
        
        # 응답에서 Markdown 코드 블록 제거
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()
        
        # 결과 파싱
        keywords = json.loads(result_text)
        
        print("\n✅ 추출된 검색 키워드:")
        for keyword in keywords:
            print(f"- {keyword}")

        # 키워드를 파일에 저장
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