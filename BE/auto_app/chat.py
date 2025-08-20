import os
import sys

try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    load_dotenv = None  # optional

try:
    import google.generativeai as genai  # type: ignore
except Exception as exc:
    print("google-generativeai 패키지가 설치되어 있지 않습니다.\n"
          "설치: pip install -r requirements.txt", file=sys.stderr)
    raise


SYSTEM_INSTRUCTION_KO = (
    "역할: 일반 대화 코파일럿 + 툴 추천자 + 요구정의 코치.\n"
    "원칙:\n"
    "1) 사용자의 의도를 한 줄로 재확인하고, 필요한 제약 1~2개만 짧게 질문한다.\n"
    "2) 툴/스택 추천 시 대안·장단점·선택 기준·권장 시나리오를 간결한 불릿으로 제시한다.\n"
    "3) 아이디어 탐색은 확장(최대 3개) → 수렴(1개) 구조로 제안한다.\n"
    "4) 문서화 요청 시 PRD/Spec/Summary를 섹션으로 출력하고, 수용기준은 Given/When/Then 형식을 사용한다.\n"
    "5) 항상 한국어로 응답한다. 외부 근거/링크는 요청 시에만 포함한다.\n"
    "6) 정보가 부족하거나 모호하면 1~3개의 구체 질문을 먼저 한다.\n"
    "출력: 1~2줄 요약 → 본문 → 다음 액션 2~3개."
)


def configure_api_key() -> str:
    if load_dotenv is not None:
        load_dotenv()
    api_key = os.environ.get("GEMINI_API_KEY_4", "").strip()
    if not api_key:
        print("환경변수 GEMINI_API_KEY가 설정되어 있지 않습니다.")
        print("PowerShell 예시:  $env:GEMINI_API_KEY=\"YOUR_KEY\"")
        print("또는 .env 파일에 GEMINI_API_KEY=... 를 설정하세요.")
        sys.exit(1)
    return api_key


def build_model(api_key: str):
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=SYSTEM_INSTRUCTION_KO,
    )
    chat = model.start_chat(history=[])
    return chat


def main() -> None:
    api_key = configure_api_key()
    chat = build_model(api_key)

    print("AutoplanAI 터미널 챗봇 (Gemini)\n"
          "일반 대화·툴 추천·아이디어 탐색을 도와드립니다.\n"
          "대화를 끝내려면 '종료'라고 입력하세요.\n")

    # 첫 인사
    try:
        greeting = chat.send_message("안녕하세요! 무엇을 도와드릴까요?")
        print(f"AI> {greeting.text}")
    except Exception:
        print("AI> 안녕하세요! 무엇을 도와드릴까요?")

    while True:
        try:
            user_input = input("You> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n종료합니다.")
            break

        if not user_input:
            continue

        if user_input == "종료":
            print("종료합니다.")
            break

        try:
            response = chat.send_message(user_input)
            print(f"AI> {response.text}")
        except Exception as exc:
            print("AI> 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
            print(f"(detail: {exc})")


if __name__ == "__main__":
    main()


