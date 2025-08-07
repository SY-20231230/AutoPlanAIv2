import os
import json
import time
import itertools
from github import Github, RateLimitExceededException, UnknownObjectException
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드
load_dotenv()

def get_github_instance():
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        print("⚠️ 경고: GitHub 토큰이 설정되지 않았습니다. API 요청 제한이 매우 낮을 수 있습니다.")
        print("     .env 파일에 'GITHUB_TOKEN=your_personal_access_token'을 추가해주세요.")
        return Github()
    return Github(token)

def search_repositories(g, keywords, max_repos_per_query=5):
    all_repos = {}

    # 1) 단일 키워드 검색
    for keyword in keywords:
        query = f'"{keyword}" in:readme,description'
        try:
            repositories = g.search_repositories(query, sort="stars", order="desc")
            print(f"🔍 [단일] 쿼리: '{query}'")
            print(f"  - '{keyword}' 키워드로 {repositories.totalCount}개의 리포를 찾았습니다. 상위 {max_repos_per_query}개를 추가합니다.")
            count = 0
            for repo in repositories:
                if repo.id not in all_repos:
                    all_repos[repo.id] = repo
                    count += 1
                    if count >= max_repos_per_query:
                        break
            time.sleep(2)
        except RateLimitExceededException:
            print("❌ Rate limit 초과. 대기...")
            break
        except Exception as e:
            print(f"❌ 검색 오류: {e}")
            continue

    # 2) 2개 키워드씩 조합 검색
    for combo in itertools.combinations(keywords, 2):
        combo_query = " ".join([f'"{kw}"' for kw in combo])
        query = f"{combo_query} in:readme,description"
        try:
            repositories = g.search_repositories(query, sort="stars", order="desc")
            print(f"🔍 [복수] 쿼리: '{query}'")
            print(f"  - {combo} 조합으로 {repositories.totalCount}개의 리포를 찾았습니다. 상위 {max_repos_per_query}개를 추가합니다.")
            count = 0
            for repo in repositories:
                if repo.id not in all_repos:
                    all_repos[repo.id] = repo
                    count += 1
                    if count >= max_repos_per_query:
                        break
            time.sleep(2)
        except RateLimitExceededException:
            print("❌ Rate limit 초과. 대기...")
            break
        except Exception as e:
            print(f"❌ 검색 오류: {e}")
            continue

    print(f"\n📊 총 {len(all_repos)}개의 고유한 리포지토리를 수집했습니다.")
    return list(all_repos.values())


def get_readme_content(repo):
    try:
        readme = repo.get_readme()
        content = readme.decoded_content.decode("utf-8")
        return content
    except UnknownObjectException:
        return None
    except Exception as e:
        print(f"      - ❗️ README를 가져오는 중 오류 발생 ({repo.full_name}): {e}")
        return None

def keyword_match_count(text, keywords):
    text = (text or "").lower()
    return sum(1 for kw in keywords if kw.lower() in text)

def matched_keywords_list(text, keywords):
    text = (text or "").lower()
    return [kw for kw in keywords if kw.lower() in text]

def crawl_github():
    try:
        with open("keywords.json", "r", encoding="utf-8") as f:
            keywords = json.load(f)
    except FileNotFoundError:
        print("❌ 'keywords.json' 파일을 찾을 수 없습니다. 먼저 keyword_extractor.py를 실행해주세요.")
        return

    print("🔑 키워드 로드 완료:", keywords)
    g = get_github_instance()
    repos = search_repositories(g, keywords)
    if not repos:
        print("🚫 처리할 리포지토리가 없습니다.")
        return

    crawled_data = []
    print("\n📂 각 리포지토리의 README.md 파일 수집 및 키워드 매칭을 시작합니다...")

    for i, repo in enumerate(repos):
        print(f"  - ({i+1}/{len(repos)}) 처리 중: {repo.full_name} (⭐{repo.stargazers_count})")
        time.sleep(1)
        readme_content = get_readme_content(repo)
        combined = (repo.description or "") + "\n" + (readme_content or "")
        match_count = keyword_match_count(combined, keywords)
        matched_list = matched_keywords_list(combined, keywords)
        if match_count >= 2:  # *** 2개 이상 겹치면 저장! ***
            crawled_data.append({
                "name": repo.full_name,
                "url": repo.html_url,
                "stars": repo.stargazers_count,
                "description": repo.description,
                "readme": readme_content,
                "matched_keywords": matched_list,
                "matched_count": match_count
            })
            print(f"      - ✅ {match_count}개 키워드 겹침 → 저장")
        else:
            print(f"      - ❌ 키워드 {match_count}개 겹침(2개 미만) → 저장 안함")

    output_filename = "github_repositories.json"
    with open(output_filename, "w", encoding="utf-8") as f:
        json.dump(crawled_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ (키워드 2개 이상 겹친) {len(crawled_data)}개 리포만 '{output_filename}'에 저장했습니다.")

if __name__ == "__main__":
    crawl_github()
