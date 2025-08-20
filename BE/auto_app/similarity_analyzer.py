# similarity_analyzer.py

import os
import json
import glob
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from dotenv import load_dotenv

# ─────────────────────────────────────────────────────────────────────────────
# 환경 변수 로드 및 Gemini 설정
# ─────────────────────────────────────────────────────────────────────────────
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY_3"))

# ─────────────────────────────────────────────────────────────────────────────
# 유틸: 최신 features_*.json 찾기
# ─────────────────────────────────────────────────────────────────────────────
def find_latest_features_file():
    existing = glob.glob("features_*.json")
    if not existing:
        return None
    existing_nums = [
        int(f.split("_")[-1].split(".")[0])
        for f in existing
        if f.split("_")[-1].split(".")[0].isdigit()
    ]
    if not existing_nums:
        return None
    latest_index = max(existing_nums)
    return f"features_{latest_index}.json"

# ─────────────────────────────────────────────────────────────────────────────
# 입력 데이터 로드
# ─────────────────────────────────────────────────────────────────────────────
def load_data():
    # 1) 기획서 로드
    plan_file = find_latest_features_file()
    if not plan_file:
        print("❌ 처리할 기획서 파일(features_*.json)을 찾을 수 없습니다.")
        return None, None

    try:
        with open(plan_file, "r", encoding="utf-8") as f:
            plan_data = json.load(f).get("정제기획서")
        plan_text = json.dumps(plan_data, ensure_ascii=False)
    except Exception as e:
        print(f"❌ '{plan_file}' 파일 로딩 실패: {e}")
        return None, None

    # 2) 후보 리포 로드
    try:
        with open("github_repositories.json", "r", encoding="utf-8") as f:
            repos_data = json.load(f)
    except FileNotFoundError:
        print("❌ 'github_repositories.json' 파일을 찾을 수 없습니다. 먼저 후보를 생성하세요.")
        return None, None
    except Exception as e:
        print(f"❌ 'github_repositories.json' 파일 로딩 실패: {e}")
        return None, None

    return plan_text, repos_data

# ─────────────────────────────────────────────────────────────────────────────
# 개별 리포지토리 심층 분석 (Gemini)
# ─────────────────────────────────────────────────────────────────────────────
def analyze_similarity_with_gemini(plan_text, repo_readme, repo_name):
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
1. **유사점**: 두 프로젝트가 어떤 점에서 비슷한 목표, 기능, 기술 스택을 가지고 있는지 2~3가지 핵심 항목으로 요약해주세요.
2. **차이점**: 두 프로젝트의 목적, 구현 방식, 기능 범위 등에서 나타나는 명확한 차이점을 2~3가지 핵심 항목으로 요약해주세요.

### 📋 출력 형식 (Markdown):
**✅ 유사점:**
* 
* 

**❌ 차이점:**
* 
* 
"""
    model = genai.GenerativeModel("gemini-2.5-flash")
    try:
        response = model.generate_content(
            prompt, generation_config=GenerationConfig(temperature=0.2)
        )
        return (response.text or "").strip()
    except Exception as e:
        return f"❌ Gemini 분석 중 오류 발생: {e}"

# ─────────────────────────────────────────────────────────────────────────────
# 메인: TF-IDF + 코사인 → Top3 선정 → 심층 분석 → MD 저장(항상 생성)
# ─────────────────────────────────────────────────────────────────────────────
def analyze_similarity():
    """TF-IDF + 코사인 유사도 기반 Top3 선정 + 심층 분석. 결과는 analysis_report.md 로 항상 저장."""
    plan_text, repos_data = load_data()
    if not plan_text or not repos_data:
        # 그래도 빈 레포트는 남겨 사용자에게 신호를 주자
        with open("analysis_report.md", "w", encoding="utf-8") as f:
            f.write("# 보고서 생성 실패\n\n필요한 입력 파일이 없습니다.")
        return

    # 0) README 있는 것만 사용
    valid_repos = [r for r in repos_data if (r.get("readme") or "").strip()]
    if not valid_repos:
        with open("analysis_report.md", "w", encoding="utf-8") as f:
            f.write("# 보고서\n\nREADME 가 있는 리포지토리가 없습니다.")
        return

    # 🔸 0-b) 분석 전 프리컷: 매칭수/스타 기준으로 상위 M개만 남김 (기본 60)
    try:
        precut_limit = int(os.getenv("SIM_ANALYZER_PRECUT", "60"))
    except Exception:
        precut_limit = 60
    valid_repos.sort(
        key=lambda x: (-int(x.get("matched_count", 0) or 0), -int(x.get("stars", 0) or 0))
    )
    valid_repos = valid_repos[:precut_limit]

    # 1) TF-IDF 벡터화
    vectorizer = TfidfVectorizer(stop_words="english")
    repo_readmes = [r["readme"] for r in valid_repos]
    all_texts = [plan_text] + repo_readmes
    tfidf_matrix = vectorizer.fit_transform(all_texts)

    # 2) 코사인 유사도(첫 벡터 vs 나머지)
    cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])
    for i, r in enumerate(valid_repos):
        r["similarity"] = float(cosine_sim[0][i])

    # 3) 정렬 후 Top 3
    sorted_repos = sorted(valid_repos, key=lambda x: x["similarity"], reverse=True)
    top_3_repos = sorted_repos[:3]

    # 4) 보고서 생성(항상 파일 생성)
    report_lines = []

    # --- 터미널 및 파일 헤더 ---
    header = "🏆 프로젝트 기획서와 가장 유사한 Github 리포지트리 Top3 🏆"
    print("\n" + "=" * 80)
    print(header)
    print("=" * 80 + "\n")
    report_lines.append(f"# {header}\n")

    if not top_3_repos:
        msg = "유사도를 계산할 수 있는 리포지토리가 없습니다."
        print(msg)
        report_lines.append(msg)
    else:
        for i, repo in enumerate(top_3_repos):
            repo_header_info = f"#{i+1}: {repo['name']} (⭐{repo.get('stars', 0)})"
            print(repo_header_info)
            print(f"  - URL: {repo['url']}")
            print(f"  - 유사도 점수: {repo['similarity']:.4f}")

            report_lines.append(f"## {i+1}. {repo['name']} (⭐{repo.get('stars', 0)})")
            report_lines.append(f"- **URL**: <{repo['url']}>")
            report_lines.append(f"- **유사도 점수**: {repo['similarity']:.4f}")

            # 🔸 심층 분석은 실패하더라도 보고서 작성을 계속
            try:
                analysis_result = analyze_similarity_with_gemini(
                    plan_text, repo.get("readme", ""), repo["name"]
                )
            except Exception as e:
                analysis_result = f"(심층 분석 실패) {e}"

            indented = "  " + (analysis_result or "").replace("\n", "\n  ")
            print(f"  - 심층 분석:\n{indented}\n")
            report_lines.append(f"- **심층 분석**:\n{analysis_result}\n")

    report_filename = "analysis_report.md"
    with open(report_filename, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))
    print(f"\n✅ 분석 보고서를 '{report_filename}' 파일로 저장했습니다.")

# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    analyze_similarity()
