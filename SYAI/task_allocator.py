import os
import json
import glob
import csv
from datetime import date, timedelta
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

def configure_gemini():
    """환경 변수를 로드하고 Gemini API를 설정합니다."""
    load_dotenv()
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.")
        return False
    genai.configure(api_key=api_key)
    return True

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

def get_project_info():
    """터미널 입력을 통해 프로젝트 정보(팀원, 기간, 시작일)를 받습니다."""
    team_members = []
    print("👥 팀원 4명의 정보(이름, 역할)를 입력해주세요.")
    print("   역할 예시: 백엔드, 프론트엔드, AI/ML, 기획, PM")
    
    for i in range(4):
        while True:
            name = input(f"   🧑‍💻 팀원 {i+1}의 이름: ").strip()
            if name: break
            print("      이름은 비워둘 수 없습니다.")
        
        while True:
            role = input(f"   ✨ {name}님의 역할: ").strip()
            if role: break
            print("      역할은 비워둘 수 없습니다.")
        
        team_members.append({"name": name, "role": role})
        print("-" * 20)

    while True:
        duration_weeks = input("🗓️ 총 개발 기간을 주(week) 단위로 입력해주세요 (예: 8): ").strip()
        if duration_weeks.isdigit() and int(duration_weeks) > 0:
            break
        print("      유효한 숫자를 입력해주세요.")

    while True:
        start_date_str = input(f"🚀 프로젝트 시작 날짜를 입력해주세요 (YYYY-MM-DD, 기본값: {date.today()}): ").strip()
        if not start_date_str:
            start_date_str = date.today().strftime('%Y-%m-%d')
        try:
            date.fromisoformat(start_date_str)
            break
        except ValueError:
            print("      잘못된 날짜 형식입니다. YYYY-MM-DD 형식으로 입력해주세요.")
    
    return team_members, int(duration_weeks), start_date_str

def make_dev_plan_prompt(document_text, team_members_text, duration_weeks, start_date):
    """개발 명세서 및 간트 차트 생성을 위한 Gemini 프롬프트를 생성합니다."""
    return f"""
    **Objective:** Create a detailed development plan and schedule based on the provided project documents.

    **Input Data:**
    1.  **Project Brief:** ```json\\n{document_text}\\n```
    2.  **Team Members:** ```json\\n{team_members_text}\\n```
    3.  **Total Duration:** {duration_weeks} weeks
    4.  **Project Start Date:** {start_date}

    **Your Task:**
    Generate a JSON object that contains two main keys: `team_task_allocation` and `gantt_chart_csv_data`.

    1.  **`team_task_allocation`**:
        - This should be an array.
        - Each object in the array represents one team member.
        - For each member, provide:
            - `member_name` and `role`.
            - `responsibilities`: A brief description of their main duties.
            - `suggested_tools`: A list of recommended technologies.
            - `assigned_tasks`: A list of specific, developer-oriented tasks assigned to this person, derived from the Project Brief.

    2.  **`gantt_chart_csv_data`**:
        - This should be an array of tasks for a Gantt chart.
        - For each task, provide:
            - `assignee`: The name and role of the person responsible.
            - `task_name`: The name of the task.
            - `duration_days`: Estimated duration in days.
            - `start_date` and `end_date`.
        - **MANDATORY RULE:** All `start_date` values MUST be on or after the Project Start Date: **{start_date}**. Do not use any other year or past dates. The schedule must be logical and respect task dependencies.

    **Output Format:**
    Provide ONLY the JSON object, with no other text or markdown.

    ```json
    {{
      "team_task_allocation": [
        {{
          "member_name": "팀원 이름",
          "role": "역할",
          "responsibilities": "핵심 책임",
          "suggested_tools": "기술 스택",
          "assigned_tasks": ["작업 1", "작업 2"]
        }}
      ],
      "gantt_chart_csv_data": [
        {{
          "assignee": "팀원 이름 (역할)",
          "task_name": "작업 1",
          "start_date": "{start_date}",
          "end_date": "YYYY-MM-DD",
          "duration_days": 3
        }}
      ]
    }}
    ```
    """

def save_dev_plan_to_csv(filename, team_allocation, gantt_data):
    """결과(개발 계획, 간트차트)를 CSV 파일로 저장합니다."""
    try:
        with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)

            # --- Gantt Chart Section ---
            writer.writerow(['--- Project Gantt Chart Data ---'])
            gantt_header = ['Assignee', 'Task Name', 'Start Date', 'End Date', 'Duration (days)']
            writer.writerow(gantt_header)
            if gantt_data:
                for task in gantt_data:
                    writer.writerow([
                        task.get('assignee'),
                        task.get('task_name'),
                        task.get('start_date'),
                        task.get('end_date'),
                        task.get('duration_days')
                    ])
            
            writer.writerow([])
            writer.writerow([])

            # --- Development Plan Section ---
            writer.writerow(['--- Development Plan by Team Member ---'])
            if team_allocation:
                for member_plan in team_allocation:
                    writer.writerow([])
                    writer.writerow([f"Member: {member_plan.get('member_name')} ({member_plan.get('role')})"])
                    writer.writerow(['Responsibilities', member_plan.get('responsibilities')])
                    writer.writerow(['Suggested Tools', member_plan.get('suggested_tools')])
                    
                    writer.writerow(['Assigned Tasks'])
                    tasks = member_plan.get('assigned_tasks', [])
                    for i, task in enumerate(tasks, 1):
                        writer.writerow([f"  {i}. {task}"])

        print(f"\n✅ 팀원별 상세 개발 계획이 '{filename}'에 성공적으로 저장되었습니다.")
    except Exception as e:
        print(f"❌ CSV 파일 저장 중 오류 발생: {e}")

def allocate_and_plan():
    """기획서 기반으로 개발 계획 및 간트 차트를 생성하는 메인 함수입니다."""
    if not configure_gemini():
        return

    # 1. 최신 기획서 파일 찾기 및 로드
    latest_file = find_latest_features_file()
    if not latest_file:
        print("❌ 처리할 기획서 파일(features_*.json)을 찾을 수 없습니다.")
        return
    
    print(f"📄 '{latest_file}' 기획서를 기반으로 작업을 시작합니다.")
    try:
        file_index = latest_file.split('_')[-1].split('.')[0]
        output_filename = f"development_plan_{file_index}.csv"

        with open(latest_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        document_content = data.get("정제기획서")
        if not isinstance(document_content, (dict, list)):
             document_content = json.loads(document_content)
        
        if not document_content:
            print(f"❌ '{latest_file}' 파일에 '정제기획서' 내용이 없습니다.")
            return
        document_text = json.dumps(document_content, ensure_ascii=False)
    except Exception as e:
        print(f"❌ 파일을 읽는 중 오류 발생: {e}")
        return

    # 2. 프로젝트 정보 입력받기
    team_members, duration_weeks, start_date = get_project_info()
    team_members_text = json.dumps(team_members, ensure_ascii=False)

    # 3. Gemini를 사용하여 개발 계획 생성
    print("\n✨ Gemini API를 호출하여 팀원별 상세 개발 계획을 생성합니다. 잠시만 기다려주세요...")
    prompt = make_dev_plan_prompt(document_text, team_members_text, duration_weeks, start_date)
    model = genai.GenerativeModel("gemini-2.5-pro")
    
    try:
        response = model.generate_content(prompt, generation_config=GenerationConfig(temperature=0.2))
        result_text = response.text.strip()

        if result_text.startswith("```json"):
            result_text = result_text[7:-3].strip()
        
        result_json = json.loads(result_text)
        team_allocation = result_json.get("team_task_allocation")
        gantt_data = result_json.get("gantt_chart_csv_data")

        # 4. 결과 저장
        if team_allocation and gantt_data:
            save_dev_plan_to_csv(output_filename, team_allocation, gantt_data)
        else:
            print("\n❌ Gemini 응답에서 필요한 데이터를 찾을 수 없어 파일을 저장하지 못했습니다.")
            print("--- Gemini 원본 응답 ---")
            print(result_text)
            print("--------------------")

    except json.JSONDecodeError as e:
        print(f"\n❌ Gemini 응답을 JSON으로 파싱하는 데 실패했습니다: {e}")
        print("--- Gemini 원본 응답 ---")
        print(result_text)
        print("--------------------")
    except Exception as e:
        print(f"\n❌ 작업 중 오류 발생: {e}")

if __name__ == "__main__":
    allocate_and_plan() 