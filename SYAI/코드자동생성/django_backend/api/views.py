import os
import json
from django.http import JsonResponse, HttpRequest
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from django.utils.decorators import method_decorator
import mammoth
import requests


def _convert_docx_to_markdown(file_path: str) -> str:
    with open(file_path, 'rb') as f:
        result = mammoth.convert_to_markdown(f)
        return result.value


@csrf_exempt
def upload_docs(request: HttpRequest):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    spec_file: UploadedFile | None = request.FILES.get('spec')
    plan_file: UploadedFile | None = request.FILES.get('plan')
    if not spec_file and not plan_file:
        return JsonResponse({'error': 'spec 또는 plan 파일 필요(.docx)'}, status=400)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    out = {}
    if spec_file:
        spec_path = os.path.join(settings.UPLOAD_DIR, spec_file.name)
        with open(spec_path, 'wb') as f:
            for chunk in spec_file.chunks():
                f.write(chunk)
        out['spec'] = {
            'id': spec_file.name,
            'markdown': _convert_docx_to_markdown(spec_path),
        }
    if plan_file:
        plan_path = os.path.join(settings.UPLOAD_DIR, plan_file.name)
        with open(plan_path, 'wb') as f:
            for chunk in plan_file.chunks():
                f.write(chunk)
        out['plan'] = {
            'id': plan_file.name,
            'markdown': _convert_docx_to_markdown(plan_path),
        }

    return JsonResponse({'ok': True, 'files': out})


def _call_gemini_with_retry(payload: dict, api_key: str, max_retries: int = 5):
    url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent'
    last_err = None
    for i in range(max_retries):
        try:
            res = requests.post(url, params={'key': api_key}, json=payload, timeout=60)
            if res.status_code == 200:
                return res.json()
            if res.status_code in (429, 500, 502, 503, 504):
                raise RuntimeError(f'retryable status: {res.status_code}')
            res.raise_for_status()
        except Exception as e:
            last_err = e
            backoff_ms = min(2 ** i * 500, 5000)
            import time
            time.sleep(backoff_ms / 1000.0)
    raise last_err


@csrf_exempt
def propose_tools(request: HttpRequest):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8')) if request.body else {}
        spec_md = data.get('specMarkdown')
        plan_md = data.get('planMarkdown')
        if not (spec_md or plan_md):
            return JsonResponse({'error': 'specMarkdown 또는 planMarkdown 필요'}, status=400)

        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return JsonResponse({'error': 'GEMINI_API_KEY 미설정'}, status=500)

        prompt = (
            '다음 문서를 분석하여 SQL/백엔드/프론트 생성에 유용한 툴 제안 목록을 JSON으로 출력하세요.\n\n'
            '출력 형식(JSON): { "tools": [ { "id": string, "category": "sql"|"backend"|"frontend"|"infra", "name": string, "why": string, "inputs": string[], "outputs": string[], "dependencies": string[] } ] }\n\n'
            f'명세:\n{spec_md or "(없음)"}\n\n기획:\n{plan_md or "(없음)"}\n\nJSON만 출력'
        )
        payload = {
            'contents': [{ 'role': 'user', 'parts': [{ 'text': prompt }] }],
            'generationConfig': { 'temperature': 0.2 },
        }
        result = _call_gemini_with_retry(payload, api_key)
        text = (result.get('candidates') or [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
        import re
        m = re.search(r"\{[\s\S]*\}$", text)
        json_str = m.group(0) if m else text
        return JsonResponse({'ok': True, 'suggestions': json.loads(json_str)})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def _call_gpt_oss(messages: list[dict]) -> str:
    api_base = os.environ.get('GPT_OSS_API_BASE', 'http://localhost:8000/v1')
    model = os.environ.get('GPT_OSS_MODEL', 'gpt-oss-20b')
    url = f"{api_base}/chat/completions"
    r = requests.post(url, json={ 'model': model, 'messages': messages, 'temperature': 0.1 }, timeout=120)
    r.raise_for_status()
    data = r.json()
    return ((data.get('choices') or [{}])[0].get('message') or {}).get('content', '')


def _filemap_from_plan(plan_text: str, kind_label: str) -> dict:
    sys = f"당신은 {kind_label} 코드 구조를 파일 단위로 설계합니다. JSON만 출력하세요."
    usr = (
        "다음 계획을 파일맵(JSON: {\n  \"files\": [ { \"path\": string, \"brief\": string } ]\n})으로 변환:\n\n"
        + plan_text
    )
    content = _call_gpt_oss([
        { 'role': 'system', 'content': sys },
        { 'role': 'user', 'content': usr },
    ])
    import re
    m = re.search(r"\{[\s\S]*\}$", content)
    json_str = m.group(0) if m else content
    return json.loads(json_str)


def _generate_file(path_: str, brief: str, plan_text: str) -> str:
    sys = '오직 코드만 출력합니다. 설명 금지.'
    usr = f"파일 경로: {path_}\n요구사항: {brief}\n참고 계획: {plan_text[:4000]}\n완성된 파일 전체를 출력하세요."
    return _call_gpt_oss([
        { 'role': 'system', 'content': sys },
        { 'role': 'user', 'content': usr },
    ])


@csrf_exempt
def generate_sql(request: HttpRequest):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    data = json.loads(request.body.decode('utf-8')) if request.body else {}
    plan_text = data.get('confirmedPlan')
    if not plan_text:
        return JsonResponse({'error': 'confirmedPlan 필요'}, status=400)

    os.makedirs(settings.ARTIFACT_DIR, exist_ok=True)
    target_root = os.path.join(settings.ARTIFACT_DIR, 'sql')
    os.makedirs(target_root, exist_ok=True)

    fmap = _filemap_from_plan(plan_text, 'SQL')
    for f in fmap.get('files', []):
        code = _generate_file(f['path'], f['brief'], plan_text)
        abs_path = os.path.join(target_root, f['path'])
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, 'w', encoding='utf-8') as wf:
            wf.write(code)
    return JsonResponse({'ok': True, 'files': len(fmap.get('files', []))})


@csrf_exempt
def generate_backend(request: HttpRequest):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    data = json.loads(request.body.decode('utf-8')) if request.body else {}
    plan_text = data.get('confirmedPlan')
    if not plan_text:
        return JsonResponse({'error': 'confirmedPlan 필요'}, status=400)

    os.makedirs(settings.ARTIFACT_DIR, exist_ok=True)
    target_root = os.path.join(settings.ARTIFACT_DIR, 'backend')
    os.makedirs(target_root, exist_ok=True)

    fmap = _filemap_from_plan(plan_text, '백엔드')
    for f in fmap.get('files', []):
        code = _generate_file(f['path'], f['brief'], plan_text)
        abs_path = os.path.join(target_root, f['path'])
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, 'w', encoding='utf-8') as wf:
            wf.write(code)
    return JsonResponse({'ok': True, 'files': len(fmap.get('files', []))})


@csrf_exempt
def generate_frontend(request: HttpRequest):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    data = json.loads(request.body.decode('utf-8')) if request.body else {}
    plan_text = data.get('confirmedPlan')
    if not plan_text:
        return JsonResponse({'error': 'confirmedPlan 필요'}, status=400)

    os.makedirs(settings.ARTIFACT_DIR, exist_ok=True)
    target_root = os.path.join(settings.ARTIFACT_DIR, 'frontend')
    os.makedirs(target_root, exist_ok=True)

    fmap = _filemap_from_plan(plan_text, '프론트엔드')
    for f in fmap.get('files', []):
        code = _generate_file(f['path'], f['brief'], plan_text)
        abs_path = os.path.join(target_root, f['path'])
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, 'w', encoding='utf-8') as wf:
            wf.write(code)
    return JsonResponse({'ok': True, 'files': len(fmap.get('files', []))})

