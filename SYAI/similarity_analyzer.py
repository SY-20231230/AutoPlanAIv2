import os
import json
import glob
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from dotenv import load_dotenv

# 환경 변수 로드 및 Gemini 설정
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def find_latest_features_file():
    """가장 최근의 features_*.json 파일을 찾습니다."""
    # keyword_extractor.py의 함수를 그대로 사용
    existing = glob.glob("features_*.json")
    if not existing:
        return None
    existing_nums = [int(f.split("_")[-1].split(".")[0]) for f in existing if f.split("_")[-1].split(".")[0].isdigit()]
    if not existing_nums:
        return None
    latest_index = max(existing_nums)
    return f"features_{latest_index}.json"

def load_data():
    """기획서와 GitHub 리포지토리 데이터를 로드합니다."""
    # 1. 기획서 로드
    plan_file = find_latest_features_file()
    if not plan_file:
        print("❌ 처리할 기획서 파일(features_*.json)을 찾을 수 없습니다.")
        return None, None
    
    try:
        with open(plan_file, "r", encoding="utf-8") as f:
            plan_data = json.load(f).get("정제기획서")
        # 기획서 내용을 하나의 텍스트로 합침
        plan_text = json.dumps(plan_data, ensure_ascii=False)
    except Exception as e:
        print(f"❌ '{plan_file}' 파일 로딩 실패: {e}")
        return None, None

    # 2. GitHub 리포지토리 데이터 로드
    try:
        with open("github_repositories.json", "r", encoding="utf-8") as f:
            repos_data = json.load(f)
    except FileNotFoundError:
        print("❌ 'github_repositories.json' 파일을 찾을 수 없습니다. 먼저 github_crawler.py를 실행해주세요.")
        return None, None
    except Exception as e:
        print(f"❌ 'github_repositories.json' 파일 로딩 실패: {e}")
        return None, None

    return plan_text, repos_data

def analyze_similarity_with_gemini(plan_text, repo_readme, repo_name):
    """Gemini를 사용하여 기획서와 README 간의 유사점과 차이점을 분석합니다."""
    print(f"    ✨ Gemini API로 '{repo_name}' 상세 분석 중...")
    
    prompt = f"""
    당신은 소프트웨어 프로젝트 분석 전문가입니다. 주어진 프로젝트 기획서와 GitHub 리포지토리의 README 내용을 비교하여, 두 프로젝트 간의 핵심적인 유사점과 차이점을 분석해주세요.

    ---
    ### 📜 원본 프로젝트 기획서 요약:
    {plan_text[:1500]} 
    ---
    ### 📄 GitHub 리포지토리 README 요약:
    {repo_readme[:1500]}
    ---

    ### ✍️ 분석 요청:
    1.  **유사점**: 두 프로젝트가 어떤 점에서 비슷한 목표, 기능, 기술 스택을 가지고 있는지 2~3가지 핵심 항목으로 요약해주세요.
    2.  **차이점**: 두 프로젝트의 목적, 구현 방식, 기능 범위 등에서 나타나는 명확한 차이점을 2~3가지 핵심 항목으로 요약해주세요.

    ### 📋 출력 형식:
    아래 형식에 맞춰 간결하게 Markdown으로 작성해주세요. 다른 설명은 추가하지 마세요.

    **✅ 유사점:**
    * 
    * 

    **❌ 차이점:**
    * 
    * 
    """
    
    model = genai.GenerativeModel("gemini-1.5-flash")
    try:
        response = model.generate_content(prompt, generation_config=GenerationConfig(temperature=0.2))
        return response.text.strip()
    except Exception as e:
        return f"❌ Gemini 분석 중 오류 발생: {e}"

def analyze_similarity():
    """TF-IDF와 코사인 유사도를 사용하여 유사도를 분석하고 결과를 파일로 저장합니다."""
    plan_text, repos_data = load_data()
    if not plan_text or not repos_data:
        return

    # README 내용이 없는 리포지토리는 분석에서 제외
    valid_repos = [repo for repo in repos_data if repo.get("readme")]
    if not valid_repos:
        print("🚫 분석할 README 내용이 있는 리포지토리가 없습니다.")
        return

    repo_readmes = [repo["readme"] for repo in valid_repos]
    
    # TF-IDF 벡터화
    # stop_words='english' 추가하여 일반적인 영어 불용어 제외
    vectorizer = TfidfVectorizer(stop_words='english')
    all_texts = [plan_text] + repo_readmes
    tfidf_matrix = vectorizer.fit_transform(all_texts)
    
    # 코사인 유사도 계산
    # 첫 번째 벡터(기획서)와 나머지 벡터들(README) 간의 유사도
    cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])
    
    # 유사도 점수를 리포지토리 정보에 추가
    for i, repo in enumerate(valid_repos):
        repo["similarity"] = cosine_sim[0][i]
        
    # 유사도 순으로 정렬
    sorted_repos = sorted(valid_repos, key=lambda x: x["similarity"], reverse=True)
    
    # Top 5 결과
    top_5_repos = sorted_repos[:5]

    # 분석 결과를 저장할 리스트
    report_lines = []
    
    # --- 터미널 및 파일 헤더 ---
    header = "🏆 프로젝트 기획서와 가장 유사한 GitHub 리포지토리 Top 5 🏆"
    print("\n" + "="*80)
    print(header)
    print("="*80 + "\n")
    report_lines.append(f"# {header}\n")

    if not top_5_repos:
        no_result_message = "유사도를 계산할 수 있는 리포지토리가 없습니다."
        print(no_result_message)
        report_lines.append(no_result_message)
    else:
        for i, repo in enumerate(top_5_repos):
            # 터미널에 진행 상황 출력
            repo_header_info = f"#{i+1}: {repo['name']} (⭐{repo['stars']})"
            print(repo_header_info)
            print(f"  - URL: {repo['url']}")
            print(f"  - 유사도 점수: {repo['similarity']:.4f}")

            # 파일에 저장할 내용 추가 (Markdown 형식)
            report_lines.append(f"## {i+1}. {repo['name']} (⭐{repo['stars']})")
            report_lines.append(f"- **URL**: <{repo['url']}>")
            report_lines.append(f"- **유사도 점수**: {repo['similarity']:.4f}")
            
            # Gemini를 이용한 심층 분석
            analysis_result = analyze_similarity_with_gemini(plan_text, repo['readme'], repo['name'])
            
            # 터미널 출력용 (들여쓰기)
            indented_analysis = "  " + analysis_result.replace("\n", "\n  ")
            print(f"  - 심층 분석:\n{indented_analysis}\n")
            
            # 파일 저장용 (원본 Markdown)
            report_lines.append(f"- **심층 분석**:\n{analysis_result}\n")
    
    # 최종 보고서 파일로 저장
    report_filename = "analysis_report.md"
    with open(report_filename, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))
        
    print(f"\n✅ 분석 보고서를 '{report_filename}' 파일로 저장했습니다.")

if __name__ == "__main__":
    analyze_similarity()
