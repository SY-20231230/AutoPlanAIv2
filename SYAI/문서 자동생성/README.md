# 연구개발계획서 자동 작성 파이프라인

## 빠른 시작 (Ctrl+F5)

- 에디터에서 `main.py`를 열고 Ctrl+F5로 실행하면 터미널 대화형 모드가 시작됩니다.
  - 기획서 경로 → 기능명세서 경로 → (옵션) 유사 프로젝트 자료 → 출력 경로/모델 순서로 질문합니다.

## 수동 실행

```powershell
$env:GOOGLE_API_KEY="YOUR_KEY"
pip install -r requirements.txt
python main.py                 # 대화형 모드
python main.py --inputs a.docx b.pdf --out outputs\rd_proposal.md --model gemini-2.5-flash   # 비대화형
```

## 동작

1. 파일 로드 및 정규화 → 청크 분할
2. 섹션 플랜 JSON 생성/로드(`plans/rd_plan_sections.json`)
3. TF-IDF 기반 근거 검색(RAG 라이트)
4. 섹션별로 Gemini 호출을 분할/재시도하며 이어쓰기
5. 결과를 Markdown 저장(`outputs/rd_proposal.md`)

## 노트

- 필수: 기획서, 기능명세서 / 선택: 유사 프로젝트 자료(없으면 건너뛰기)
- 섹션 정의는 `plans/rd_plan_sections.json`에서 수정 가능
