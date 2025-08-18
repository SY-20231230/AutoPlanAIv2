### 로컬 통합 테스트 가이드

- 목적: Hugging Face 로컬 gpt-oss(OpenAI 호환) + 백엔드(Node 또는 Django) + 클라이언트 호출 플로우를 한 번에 검증
- 전제: 백엔드(Node 8080 또는 Django 8081) 중 하나가 기동 중, gpt-oss OpenAI 호환 서버가 `http://localhost:8000/v1` 로 기동 중

#### 1) 환경 변수

- 백엔드(Node): `backend/.env` 작성
- 백엔드(Django): `django_backend/.env` 작성
- 클라이언트: `local_test/.env` 작성

예시(local_test/.env):

```
BACKEND_BASE=http://localhost:8081
USE_DJANGO=true
```

#### 2) vLLM로 로컬 gpt-oss 서버 예시

- Python 환경에서 다음 실행(모델은 원하는 gpt-oss HF repo/path로 교체)

```
python -m vllm.entrypoints.openai.api_server --host 0.0.0.0 --port 8000 --model <hf_repo_or_local_path>
```

#### 3) 테스트 클라이언트 실행

- 가상환경 사용 권장(선택)

```
cd local_test
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
```

- 호출

```
python test_client.py --propose --generate-backend --plan-file sample_plan.txt
```

- 옵션
  - `--backend-base http://localhost:8081` (미지정 시 .env BACKEND_BASE 사용)
  - `--propose` 툴 제안 호출(입력은 샘플 텍스트 사용)
  - `--generate-sql` | `--generate-backend` | `--generate-frontend`
  - `--plan-file sample_plan.txt` 컨펌된 설계 텍스트로 사용

#### 4) 산출물 위치

- Node: `backend/artifacts/*`
- Django: `django_backend/artifacts/*`

주의: Gemini 키가 없으면 `--propose` 생략하고 `--generate-*`만 실행해도 됩니다.


