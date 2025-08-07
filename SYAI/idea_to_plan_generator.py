# -*- coding: utf-8 -*-
import glob
from idea_refiner import IdeaRefiner
from idea_expander import IdeaExpander
from conversation_manager import ConversationManager
from plan_generator import PlanGenerator

def main():
    """
    전체 아이디어 기획 프로세스를 진행하는 메인 함수
    """
    print("AI: 안녕하세요! 머릿속에 있는 아이디어를 들려주세요. 제가 구체적인 기획으로 발전시켜 드릴게요.")
    
    # 0. 모듈 초기화
    refiner = IdeaRefiner()
    expander = IdeaExpander()
    conv_manager = ConversationManager()
    plan_gen = PlanGenerator()

    # 1. 아이디어 입력
    user_idea = input("You: ")
    
    # 2. 아이디어 정제
    refined_data = refiner.refine(user_idea)
    
    print("\nAI: 아이디어를 이렇게 정리해봤어요.")
    print(f"🎯 목표: {refined_data['goal']}")
    print(f"👥 타겟 사용자: {refined_data['target_user']}")
    print("✨ 주요 기능:")
    for feature in refined_data['core_features']:
        print(f"  - {feature}")

    # 3. 아이디어 확장 제안
    suggestions = expander.expand(refined_data)
    print("\nAI: 이 아이디어를 더 발전시킬 수 있는 몇 가지 제안을 드릴게요.")
    for suggestion in suggestions:
        print(f"- {suggestion}")
        
    # 4. 대화형 기획 루프
    print("\nAI: 제 제안이나 아이디어에 대해 자유롭게 의견을 주세요. (예: '기능 추가: 실시간 채팅', '완료되면 알려주세요')")
    print("AI: 대화를 끝내려면 '완료', '그만', '종료'라고 입력해주세요.")
    
    final_idea = refined_data
    while True:
        user_feedback = input("You: ")
        if user_feedback in ["완료", "그만", "종료"]:
            break
        
        final_idea = conv_manager.manage(user_feedback, final_idea)
        
        # 변경된 아이디어 현황 다시 출력
        print("\nAI: 알겠습니다. 현재까지 정리된 기획 내용은 다음과 같아요.")
        print(f"🎯 목표: {final_idea['goal']}")
        print(f"👥 타겟 사용자: {final_idea['target_user']}")
        print("✨ 주요 기능:")
        for feature in final_idea['core_features']:
            print(f"  - {feature}")
    
    # 5. 기획서 생성
    print("\nAI: 대화를 통해 아이디어가 확정되었습니다. 이 내용을 바탕으로 기획서 초안을 만들어 드릴까요? (네/아니오)")
    generate_confirm = input("You: ")
    
    if generate_confirm.lower() == '네':
        project_plan = plan_gen.generate(final_idea)
        
        # 동적 파일 이름 생성 로직
        existing_plans = glob.glob("idea_plan_*.md")
        existing_nums = []
        for f in existing_plans:
            try:
                num_part = f.split('_')[-1].split('.')[0]
                if num_part.isdigit():
                    existing_nums.append(int(num_part))
            except (ValueError, IndexError):
                continue
        
        next_index = max(existing_nums) + 1 if existing_nums else 1
        file_name = f"idea_plan_{next_index}.md"

        with open(file_name, "w", encoding="utf-8") as f:
            f.write(project_plan)
            
        print("\n--- 생성된 기획서 ---")
        print(project_plan)
        print(f"\nAI: `{file_name}` 파일로 기획서 초안을 저장했습니다.")
    else:
        print("AI: 알겠습니다. 최종 기획이 필요하시면 언제든지 다시 찾아주세요.")

if __name__ == "__main__":
    main()
