import os
import json
import glob
import time
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

# 1. 환경설정
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# 2. 최신 기술명세서(정제기획서) 불러오기
def find_latest_features_file():
    files = glob.glob("features_*.json")
    if not files:
        return None
    nums = []
    for f in files:
        try:
            n = int(f.split("_")[-1].split(".")[0])
            nums.append(n)
        except:
            continue
    if not nums:
        return None
    return f"features_{max(nums)}.json"

features_file = find_latest_features_file()
if not features_file:
    raise RuntimeError("features_*.json 파일을 찾을 수 없습니다.")

with open(features_file, "r", encoding="utf-8") as f:
    data = json.load(f)
doc_text = json.dumps(data.get("정제기획서"), ensure_ascii=False, indent=2)

# 3. 키워드(겹친 키워드 표시용, 선택)
with open("keywords.json", "r", encoding="utf-8") as f:
    keywords = json.load(f)

# 4. 크롤러로 수집된 리포 데이터 불러오기
with open("github_repositories.json", "r", encoding="utf-8") as f:
    repos = json.load(f)

# 5. Gemini 프롬프트(상세 비교 포함, 필요시 자유롭게 수정)
def make_similarity_prompt(requirement, repo_desc, repo_readme):
    return f"""
너는 인공지능 소프트웨어 평가 전문가야.
아래 1번은 내가 만들고자 하는 소프트웨어 '기술명세서'이고,
2번은 평가 대상이 되는 깃허브 오픈소스 프로젝트의 설명 및 README야.

[평가 방법]
- 1번과 2번의 유사도를 0~10점(10점=거의 완전 유사/복붙 가능, 5점=기능 절반 정도만 유사, 0점=거의 무관)으로 평가해.
- 실제 기능/주요 기술/핵심 역할/데이터 연동/알고리즘 등 '핵심 구현 요소' 기준으로 판단.
- 리포지터리 이름, 단순 용어 중복, 표면적 문구는 점수에 영향 주지마.

[출력 형식]
점수(0~10, 정수만), 상세 비교 분석(최소 3~4줄, 아래 가이드 참고)

[상세 비교 분석 가이드]
- 내 기술명세서와 해당 리포의 ‘핵심 유사점’과 ‘차이점’을 명확히 비교하라
- 기술, 기능, AI/알고리즘, 데이터 처리, 외부 API 활용, 사용자 인터페이스 등 주요 구조/구현 방식 중심으로 분석하라
- 실제 도메인(여행/재난/카드추천 등) 차이, 활용 목적/대상, 배포 방식까지 언급
- 왜 유사하거나, 무엇이 부족한지 구체적으로 기술
- 너무 모호하게 쓰지 말고, 실질적으로 내 프로젝트에 참고할 만한 포인트/아쉬운 점까지 모두 언급
- 출력은 아래 예시 참고

[예시]
7, 
- AI 기반 핵심 기능과 외부 API(지도, 결제, 추천 등) 연동 구조가 내 명세서와 70% 이상 유사함
- 다만 이 리포는 여행 분야가 아니라 재난 대응, 안전 매뉴얼 특화에 집중되어 있음
- 나와 동일하게 Function Calling, LLM, RAG를 적극적으로 사용함
- 실제 사용자 입력 흐름과 데이터 연동 구조는 내 프로젝트에도 바로 참고 가능하나, 여행 일정 추천과 알레르기 메뉴 등 내 특화 기능은 부재함

[1] 내 기술명세서:
{requirement}

[2] 오픈소스 설명:
{repo_desc}

[3] 오픈소스 README:
{repo_readme}
"""

# 6. Gemini 평가(자동 재시도 + 백오프 + 호출 간격 최적화)
def gemini_similarity_eval(prompt, retry=10, delay=2, max_readme=3500):
    model = genai.GenerativeModel("gemini-2.5-flash")
    curr_delay = delay
    for i in range(retry):
        try:
            response = model.generate_content(prompt, generation_config=GenerationConfig(temperature=0.1))
            txt = response.text.strip()
            # 첫 줄(점수, 코멘트 분리), 나머지는 전체 코멘트
            score, comment = None, ""
            try:
                lines = [l.strip() for l in txt.splitlines() if l.strip()]
                if len(lines) > 0 and "," in lines[0]:
                    s, c = lines[0].split(",", 1)
                    score = int(s.strip())
                    comment = c.strip() + "\n" + "\n".join(lines[1:])  # 1줄+아래 상세줄 합침
                else:
                    # 만약 [점수, ...] 구조가 아니면 전체를 코멘트로 저장
                    score = None
                    comment = txt
            except Exception as ex:
                print("⚠️ Gemini 응답 파싱 오류:", txt)
            return score, comment
        except Exception as e:
            print(f"⚠️ Gemini API 에러({i+1}/{retry}회)! {curr_delay}초 후 재시도...")
            time.sleep(curr_delay)
            curr_delay = min(curr_delay * 2, 30)  # 점진적 백오프(최대 30초)
    print("❌ Gemini 평가 재시도 실패 처리.")
    return 0, "Gemini 평가 실패"

# 7. 각 리포별 평가 (긴 readme는 자동 자름, 호출 간격/slowing)
print(f"\n✨ Gemini 2.5-flash로 {len(repos)}개 리포를 평가 중... (최대 2~3초/개)")
for i, repo in enumerate(repos):
    desc = repo.get("description", "") or ""
    readme = repo.get("readme", "") or ""
    # 너무 긴 readme는 앞부분만 사용
    readme_trunc = readme[:3500] if len(readme) > 3500 else readme
    prompt = make_similarity_prompt(doc_text, desc, readme_trunc)
    score, comment = gemini_similarity_eval(prompt)
    repo["gemini_score"] = score if score is not None else 0
    repo["gemini_comment"] = comment
    # (옵션) 겹친 키워드 기록
    matched_keywords = [kw for kw in keywords if kw.lower() in (desc+readme).lower()]
    repo["matched_keywords"] = matched_keywords
    repo["matched_count"] = len(matched_keywords)
    print(f"  - {i+1}/{len(repos)}: {repo['name']} (점수: {score})")
    # 호출 간격 최적화(쿼터 보호)
    time.sleep(2)

# 8. 점수 기준 Top5 추출/저장
repos = [r for r in repos if r.get("gemini_score", 0) is not None]
repos.sort(key=lambda x: (-x["gemini_score"], -x.get("stars", 0)))
top5 = repos[:5]

print("\n===== Gemini 평가 Top5 리포 =====\n")
for i, repo in enumerate(top5, 1):
    print(f"{i}. {repo['name']} (⭐{repo['stars']})")
    print(f"   URL: {repo['url']}")
    print(f"   설명: {repo['description']}")
    print(f"   Gemini 점수: {repo['gemini_score']}점")
    print(f"   👉 겹친 키워드: {repo['matched_keywords']} ({repo['matched_count']}개)")
    print(f"   상세 분석:\n{repo['gemini_comment']}\n")

# 9. 결과 저장
with open("github_top5_similar_gemini.json", "w", encoding="utf-8") as f:
    json.dump(top5, f, ensure_ascii=False, indent=2)

print("\n✅ Gemini 평가 Top5 결과가 'github_top5_similar_gemini.json' 파일에 저장되었습니다.")
