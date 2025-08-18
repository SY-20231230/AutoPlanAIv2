import argparse
import os
import sys
import json
import time
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

# 선택적 의존성(없어도 동작, 있으면 품질↑)
# pip install chardet PyPDF2 mammoth python-docx
try:
    import chardet  # type: ignore
except Exception:
    chardet = None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--backend-base', default=None, help='백엔드 API 기본 URL. 미설정 시 로컬 단독 모드 작동')
    parser.add_argument('--propose', action='store_true', help='툴 제안 실행')
    parser.add_argument('--generate-sql', action='store_true', help='SQL 코드 생성')
    parser.add_argument('--generate-backend', action='store_true', help='백엔드 코드 생성')
    parser.add_argument('--generate-frontend', action='store_true', help='프론트 코드 생성')
    parser.add_argument('--plan-file', default=None, help='기획서 파일 경로 (txt/md/pdf/docx 등)')
    parser.add_argument('--plan-text', default=None, help='기획서/설계 텍스트 직접 입력')
    parser.add_argument('--spec-file', default=None, help='기술명세서 파일 경로 (txt/md/pdf/docx 등)')
    parser.add_argument('--spec-text', default=None, help='기술명세서 텍스트 직접 입력')
    parser.add_argument('--meta-note', default=None, help='metadata.json에 메모로 기록할 문자열')
    args = parser.parse_args()

    # .env 로드
    env_path = Path(__file__).parent / '.env'
    if load_dotenv and env_path.exists():
        load_dotenv(env_path)

    backend_base = args.backend_base or os.environ.get('BACKEND_BASE') or None

    # 백엔드(LLM) 상태 로그: Gemini/OSS/Ollama
    log_backend_status()

    # --- 입력 확보 (강화된 파서 또는 인터랙티브) ---
    interactive_mode = False
    no_inputs = not any([args.plan_text, args.plan_file, args.spec_text, args.spec_file])
    no_actions = not any([args.propose, args.generate_sql, args.generate_backend, args.generate_frontend])
    if no_inputs and no_actions:
        interactive_mode = True
        plan_md, plan_src, spec_md, spec_src = interactive_collect_inputs()
    else:
        spec_md, spec_src = resolve_text_or_path(args.spec_text, args.spec_file)
        plan_md, plan_src = resolve_text_or_path(args.plan_text, args.plan_file)

    # --- PROPOSE ---
    suggestions = None
    if interactive_mode:
        print('[interactive] 툴 제안을 수행합니다 (Gemini).')
        try:
            suggestions = local_propose(spec_md, plan_md)
            project_name_preview = infer_project_name(plan_md or spec_md) or 'Project'
            preview_root = Path('local_artifacts') / project_name_preview
            preview_root.mkdir(parents=True, exist_ok=True)
            # 비어 있을 경우 최소 구조 보정
            if not isinstance(suggestions, dict) or not suggestions.get('tools'):
                suggestions = {
                    'tools': [],
                    'note': '도움말: 제안이 비어 있습니다. 네트워크/키 확인 후 r(재추천) 또는 e(직접편집)를 사용하세요.',
                    'received': suggestions,
                }
            # 간단 요약만 저장
            summary_obj, _summary_md = build_recommendation_summary(suggestions)
            (preview_root / 'tools_recommendation.json').write_text(json.dumps(summary_obj, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f"--- 요약이 저장되었습니다: {preview_root / 'tools_recommendation.json'} ---")
        except Exception as e:
            print(f"[warn] 툴 제안 실패: {e}")
            pass
        # 제안 수정/재추천/확정
        suggestions = interactive_confirm_or_edit_suggestions(suggestions, spec_md, plan_md)
        # 확정본 저장(요약만)
        project_name_preview = infer_project_name(plan_md or spec_md) or 'Project'
        preview_root = Path('local_artifacts') / project_name_preview
        preview_root.mkdir(parents=True, exist_ok=True)
        final_obj = suggestions if isinstance(suggestions, dict) else {'tools': [], 'received': suggestions}
        summary_obj, _summary_md = build_recommendation_summary(final_obj)
        # 하나의 파일로만 유지: 확정 시에도 동일 파일명을 덮어씀
        (preview_root / 'tools_recommendation.json').write_text(json.dumps(summary_obj, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f"--- 확정 요약이 저장되었습니다: {preview_root / 'tools_recommendation.json'} ---")
    else:
        if args.propose:
            if backend_base:
                print('[propose] via backend')
                payload = {'specMarkdown': spec_md, 'planMarkdown': plan_md}
                r = http_post_json(f'{backend_base}/api/tools/propose', payload, timeout=120)
                print('status', r.get('status'))
                suggestions = r.get('json') or {'raw': (r.get('text') or '')[:1000]}
            else:
                print('[propose] local-direct (Gemini 2.5 Pro)')
                suggestions = local_propose(spec_md, plan_md)
            # 비대화형에서도 요약만 저장
            project_name_preview = infer_project_name(plan_md or spec_md) or 'Project'
            preview_root = Path('local_artifacts') / project_name_preview
            preview_root.mkdir(parents=True, exist_ok=True)
            if not isinstance(suggestions, dict) or not suggestions.get('tools'):
                suggestions = {'tools': [], 'received': suggestions}
            summary_obj, _summary_md = build_recommendation_summary(suggestions)
            (preview_root / 'tools_recommendation.json').write_text(json.dumps(summary_obj, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f"--- 요약이 저장되었습니다: {preview_root / 'tools_recommendation.json'} ---")

    # --- GENERATE ---
    if interactive_mode:
        gen_choice = interactive_select_generation_targets()
        args.generate_sql = gen_choice.get('sql', False)
        args.generate_backend = gen_choice.get('backend', False)
        args.generate_frontend = gen_choice.get('frontend', False)

    generated_any = args.generate_sql or args.generate_backend or args.generate_frontend
    artifacts_root = None
    if generated_any:
        plan_text = plan_md  # 이미 강화된 파서로 확보한 텍스트
        project_name = infer_project_name(plan_text) or 'GeneratedProject'
        artifacts_root = Path('local_artifacts') / project_name

        if backend_base:
            payload = {'confirmedPlan': plan_text}
            if args.generate_sql:
                print('[generate] SQL via backend')
                r = http_post_json(f'{backend_base}/api/generate/sql', payload, timeout=240)
                print('status', r.get('status'))
            if args.generate_backend:
                print('[generate] backend via backend')
                r = http_post_json(f'{backend_base}/api/generate/backend', payload, timeout=240)
                print('status', r.get('status'))
            if args.generate_frontend:
                print('[generate] frontend via backend')
                r = http_post_json(f'{backend_base}/api/generate/frontend', payload, timeout=240)
                print('status', r.get('status'))
        else:
            print('[generate] local-direct (Ollama/OpenAI-호환)')
            # 실행에 사용될 모델/엔드포인트 요약 로그
            oss_bases, oss_model = get_oss_candidates_and_model()
            print(f"[generate] using model={oss_model} bases={', '.join(oss_bases)}")
            if args.generate_sql:
                run_local_generation(plan_text, kind='sql', out_dir=(artifacts_root / 'SQL'), suggestions=suggestions)
            if args.generate_backend:
                run_local_generation(plan_text, kind='backend', out_dir=(artifacts_root / 'Back'), suggestions=suggestions)
            if args.generate_frontend:
                run_local_generation(plan_text, kind='frontend', out_dir=(artifacts_root / 'Front'), suggestions=suggestions)

        # 입력 원본 및 메타 저장
        save_documents(
            artifacts_root or Path('local_artifacts') / 'UnknownProject',
            plan_src_text=args.plan_text, plan_src_path=args.plan_file,
            spec_src_text=args.spec_text, spec_src_path=args.spec_file
        )

    # --- 메타데이터 저장(항상) ---
    # artifacts_root가 없으면 프로젝트명을 추론해서 기본 폴더로 저장
    if artifacts_root is None:
        project_name = infer_project_name(plan_md or spec_md) or 'Project'
        artifacts_root = Path('local_artifacts') / project_name
        artifacts_root.mkdir(parents=True, exist_ok=True)

    save_metadata(
        artifacts_root,
        meta=build_metadata(
            backend_base=backend_base,
            executed={
                'propose': bool(args.propose),
                'generate_sql': bool(args.generate_sql),
                'generate_backend': bool(args.generate_backend),
                'generate_frontend': bool(args.generate_frontend),
            },
            inputs={
                'plan': describe_input(plan_md, plan_src),
                'spec': describe_input(spec_md, spec_src),
            },
            suggestions=suggestions,
            note=args.meta_note
        )
    )

    return 0


# -------------------------- 입출력/HTTP/유틸 --------------------------

def http_post_json(url: str, payload: dict, timeout: int = 120) -> Dict[str, Any]:
    import requests
    try:
        resp = requests.post(url, json=payload, timeout=timeout)
        out = {'status': resp.status_code, 'text': resp.text}
        try:
            out['json'] = resp.json()
        except Exception:
            pass
        return out
    except Exception as e:
        return {'status': -1, 'error': str(e)}

def resolve_text_or_path(text: Optional[str], path_or_txt: Optional[str]) -> Tuple[str, Dict[str, Any]]:
    """
    반환: (텍스트, 소스기술 딕트)
    소스기술: { 'kind': 'text'|'file'|'none', 'path': str|None, 'ext': str|None, 'size': int|None }
    """
    if text:
        return text, {'kind': 'text', 'path': None, 'ext': None, 'size': len(text)}
    if not path_or_txt:
        return '', {'kind': 'none', 'path': None, 'ext': None, 'size': None}

    p = Path(path_or_txt)
    if p.exists():
        txt = read_file_to_text(p)
        size = None
        try:
            size = p.stat().st_size
        except Exception:
            pass
        return txt, {'kind': 'file', 'path': str(p), 'ext': p.suffix.lower(), 'size': size}

    # 경로가 아니면 "그냥 해당 경로의 텍스트"일 수도 → 시도
    try:
        txt = Path(path_or_txt).read_text(encoding='utf-8')
        return txt, {'kind': 'file', 'path': str(path_or_txt), 'ext': Path(path_or_txt).suffix.lower(), 'size': len(txt)}
    except Exception:
        return '', {'kind': 'none', 'path': str(path_or_txt), 'ext': None, 'size': None}

def read_file_to_text(p: Path) -> str:
    """
    강화된 파일 → 텍스트 변환:
    - .docx: mammoth(있으면) → MD / 없으면 python-docx(있으면) → 텍스트 / 둘다 없으면 안내문
    - .pdf: PyPDF2(있으면) → 텍스트 / 없으면 안내문
    - .txt/.md/.csv/.json/.log 등: 인코딩 추정(chardet 우선, 없으면 utf-8)
    - 그 외: 바이너리 best-effort 디코딩
    """
    suf = p.suffix.lower()

    # DOCX
    if suf == '.docx':
        # 1) mammoth → markdown
        try:
            import mammoth as py_mammoth  # type: ignore
            with open(p, 'rb') as f:
                result = py_mammoth.convert_to_markdown(f)
                return result.value
        except Exception:
            # 2) python-docx → plain text
            try:
                from docx import Document  # type: ignore
                doc = Document(str(p))
                return "\n".join(paragraph.text for paragraph in doc.paragraphs if paragraph.text)
            except Exception:
                return f"[DOCX 파서 부재: {p.name}]"

    # PDF
    if suf == '.pdf':
        try:
            from PyPDF2 import PdfReader  # type: ignore
            with open(p, 'rb') as f:
                reader = PdfReader(f)
                texts = []
                for page in reader.pages:
                    t = page.extract_text() or ""
                    texts.append(t)
            return "\n".join(texts).strip()
        except Exception:
            return f"[PDF 파서 부재: {p.name}]"

    # 일반 텍스트 계열
    if suf in ('.txt', '.md', '.csv', '.json', '.log'):
        try:
            raw = p.read_bytes()
            if chardet:
                det = chardet.detect(raw or b"")
                enc = det.get('encoding') or 'utf-8'
                return raw.decode(enc, errors='replace')
            return raw.decode('utf-8', errors='replace')
        except Exception:
            return ''

    # 기타 확장자: best-effort
    try:
        raw = p.read_bytes()
        if chardet:
            det = chardet.detect(raw or b"")
            enc = det.get('encoding') or 'utf-8'
            return raw.decode(enc, errors='replace')
        return raw.decode('utf-8', errors='replace')
    except Exception:
        return ''

def safe_json_text(obj: Any) -> str:
    try:
        return json.dumps(obj, ensure_ascii=False, indent=2)
    except Exception:
        return str(obj)

def sha256_of(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8', errors='replace')).hexdigest()

def describe_input(text: str, src: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'source': src,
        'length': len(text or ''),
        'sha256': sha256_of(text or '')
    }

def infer_project_name(text: str) -> str:
    if not text:
        return ''
    first_line = next((ln.strip() for ln in text.splitlines() if ln.strip()), '')
    if len(first_line) > 60:
        first_line = first_line[:60]
    safe = ''.join(ch if ch.isalnum() or ch in ' _-.' else '_' for ch in first_line)
    return safe.replace(' ', '_') or 'Project'


# -------------------------- PROPOSE / GENERATE --------------------------

def local_propose(spec_md: str, plan_md: str) -> Dict[str, Any]:
    prompt = (
        '다음 문서를 분석하여 SQL/백엔드/프론트 생성에 유용한 툴 제안 목록을 JSON으로 출력하세요.\n\n'
        '출력 형식(JSON): { "tools": [ { "id": string, "category": "sql"|"backend"|"frontend"|"infra", "name": string, "why": string, "inputs": string[], "outputs": string[], "dependencies": string[] } ] }\n\n'
        f'명세:\n{spec_md or "(없음)"}\n\n기획:\n{plan_md or "(없음)"}\n\nJSON만 출력'
    )
    text = call_gemini(prompt)
    parsed = parse_flexible_json(text)
    if not isinstance(parsed, dict):
        parsed = {'tools': [], 'raw': text}
    parsed['_raw_gemini'] = text
    parsed['source'] = 'gemini'

    # Fallback: Gemini 결과가 비었거나 tools가 없으면 로컬(OLLAMA/OSS)로 재시도
    need_fallback = (not text) or (not parsed.get('tools'))
    if need_fallback:
        sys_prompt = '다음 요구사항에 대해 오직 JSON만 반환하세요.'
        usr = (
            '다음 문서를 분석하여 SQL/백엔드/프론트 생성에 유용한 툴 제안 목록을 JSON으로 출력하세요.\n\n'
            '출력 형식(JSON): { "tools": [ { "id": string, "category": "sql"|"backend"|"frontend"|"infra", "name": string, "why": string, "inputs": string[], "outputs": string[], "dependencies": string[] } ] }\n\n'
            f'명세:\n{spec_md or "(없음)"}\n\n기획:\n{plan_md or "(없음)"}\n\nJSON만 출력'
        )
        try:
            alt = call_gpt_oss([
                {'role': 'system', 'content': sys_prompt},
                {'role': 'user', 'content': usr},
            ])
            alt_parsed = parse_flexible_json(alt)
            if isinstance(alt_parsed, dict) and alt_parsed.get('tools'):
                alt_parsed['_raw_gemini'] = text
                alt_parsed['_raw_oss'] = alt
                alt_parsed['source'] = 'ollama-fallback'
                return alt_parsed
            # 실패 시 최소 구조로 반환
            parsed['_raw_oss'] = alt
        except Exception as _:
            pass

    return parsed


def run_local_generation(plan_text: str, kind: str, out_dir: Path, suggestions: Optional[Dict[str, Any]] = None):
    out_dir.mkdir(parents=True, exist_ok=True)
    fmap = get_filemap(plan_text, kind, suggestions)
    # 파일맵 보관 (요구사항 저장)
    try:
        (out_dir / '_filemap.json').write_text(json.dumps(fmap, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f"[plan] saved filemap -> {out_dir / '_filemap.json'}")
    except Exception as e:
        print(f"[warn] failed to save filemap: {e}")
    for f in fmap.get('files', []):
        code = generate_file(f['path'], f['brief'], plan_text, suggestions)
        abs_path = out_dir / f['path']
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_text(code, encoding='utf-8')
    print(f"[local] {kind} files: {len(fmap.get('files', []))} -> {out_dir}")

def get_filemap(plan_text: str, kind_label: str, suggestions: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    # 1) Gemini(2.5 Pro 기본)로 파일맵 설계
    model_for_filemap = os.environ.get('GEMINI_MODEL_FILEMAP') or 'gemini-2.5-pro'
    prompt = (
        f"역할: 당신은 {kind_label} 코드 구조를 설계하는 아키텍트입니다.\n"
        "다음 계획을 바탕으로 생성할 파일들의 구조와 간단 요구사항을 JSON으로만 출력하세요.\n\n"
        "출력 형식(JSON): {\n  \"files\": [ { \"path\": string, \"brief\": string } ]\n}\n\n"
        f"계획:\n{plan_text[:8000]}\n\n"
        + ("참고 툴 제안(JSON):\n" + safe_json_text(suggestions)[:4000] + "\n\n" if suggestions else "")
        + "중요: 오직 JSON만. 주석/설명/코드블록 금지."
    )
    print(f"[gemini][filemap] request model={model_for_filemap}")
    try:
        text = call_gemini(prompt, model=model_for_filemap)
        # rate-limit 보호 약간의 슬립
        time.sleep(0.5)
        parsed = parse_flexible_json(text)
        if isinstance(parsed, dict) and isinstance(parsed.get('files'), list):
            return parsed
    except Exception as e:
        print(f"[warn][gemini][filemap] {type(e).__name__}: {e}")

    # 2) 폴백: OSS로 시도
    sys_prompt = f"당신은 {kind_label} 코드 구조를 파일 단위로 설계합니다. JSON만 출력하세요."
    usr = (
        "다음 계획을 파일맵(JSON: {\n  \"files\": [ { \"path\": string, \"brief\": string } ]\n})으로 변환:\n\n"
        + plan_text
    )
    if suggestions:
        usr += "\n\n참고 툴 제안(JSON):\n" + safe_json_text(suggestions)[:4000]
    print(f"[oss][filemap] request model={get_oss_candidates_and_model()[1]}")
    text = call_gpt_oss([
        {'role': 'system', 'content': sys_prompt},
        {'role': 'user', 'content': usr},
    ])
    return parse_json_tail(text)


def generate_file(path_: str, brief: str, plan_text: str, suggestions: Optional[Dict[str, Any]] = None) -> str:
    provider = os.environ.get('CODEGEN_PROVIDER', 'oss').lower().strip()
    if provider == 'gemini':
        print(f"[gemini][gen] start path={path_} model={os.environ.get('GEMINI_MODEL_CODE','gemini-2.5-pro')}")
        code = generate_file_with_gemini(path_, brief, plan_text, suggestions)
        print(f"[gemini][gen] done path={path_} bytes={len(code.encode('utf-8', errors='ignore'))}")
        return code
    # default: OSS/Ollama
    sys_prompt = '오직 코드만 출력합니다. 설명 금지.'
    usr = f"파일 경로: {path_}\n요구사항: {brief}\n참고 계획: {plan_text[:4000]}\n"
    if suggestions:
        usr += "참고 툴 제안(JSON 개요):\n" + safe_json_text(suggestions)[:1500] + "\n"
    usr += "완성된 파일 전체를 출력하세요."
    print(f"[oss][gen] start path={path_} model={get_oss_candidates_and_model()[1]}")
    code = call_gpt_oss([
        {'role': 'system', 'content': sys_prompt},
        {'role': 'user', 'content': usr},
    ])
    print(f"[oss][gen] done path={path_} bytes={len(code.encode('utf-8', errors='ignore'))}")
    return code


# ---------------- Gemini 코드 생성(레이트리밋/분할 생성) ----------------

_gemini_rl_state = { 'last_called': 0.0 }

def call_gemini_rate_limited(text: str, *, model: Optional[str] = None, max_output_tokens: Optional[int] = None) -> str:
    rpm = float(os.environ.get('GEMINI_RPM', '5'))  # 분당 요청수 제한 (기본 5)
    min_interval = 60.0 / max(rpm, 0.1)
    now = time.time()
    delta = now - _gemini_rl_state['last_called']
    if delta < min_interval:
        sleep_s = min_interval - delta
        print(f"[gemini][rate] sleep {sleep_s:.2f}s (rpm={rpm})")
        time.sleep(sleep_s)
    # 호출
    out = call_gemini_with_config(text, model=model, max_output_tokens=max_output_tokens)
    _gemini_rl_state['last_called'] = time.time()
    return out

def call_gemini_with_config(user_text: str, *, model: Optional[str] = None, max_output_tokens: Optional[int] = None) -> str:
    import requests
    api_key = os.environ.get('GOOGLE_API_KEY') or os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise RuntimeError('GEMINI_API_KEY 미설정')
    model = model or os.environ.get('GEMINI_MODEL_CODE', os.environ.get('GEMINI_MODEL', 'gemini-2.5-pro'))
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
    gen_cfg: Dict[str, Any] = {'temperature': 0.1}
    if max_output_tokens is not None:
        gen_cfg['maxOutputTokens'] = int(max_output_tokens)
    payload = {
        'contents': [{'role': 'user', 'parts': [{'text': user_text}]}],
        'generationConfig': gen_cfg
    }
    # 재시도
    last = None
    for i in range(5):
        try:
            r = requests.post(url, params={'key': api_key}, json=payload, timeout=180)
            if r.status_code == 200:
                data = r.json()
                return ((data.get('candidates') or [{}])[0].get('content') or {}).get('parts', [{}])[0].get('text', '')
            if r.status_code not in (429, 500, 502, 503, 504):
                r.raise_for_status()
            sleep_s = min(2 ** i, 8)
            print(f"[retry][gemini] codegen model={model} attempt={i+1}/5 http={r.status_code} sleep={sleep_s}s")
            time.sleep(sleep_s)
        except Exception as e:
            last = e
            sleep_s = min(2 ** i, 8)
            print(f"[retry][gemini] codegen model={model} attempt={i+1}/5 error={type(e).__name__}: {e} sleep={sleep_s}s")
            time.sleep(sleep_s)
    if last:
        raise last
    return ''

def generate_file_with_gemini(path_: str, brief: str, plan_text: str, suggestions: Optional[Dict[str, Any]]) -> str:
    # 1) 1차 시도: 한 번에 전체 생성 (max tokens 넉넉히)
    header = (
        "오직 코드만 출력합니다. 설명/주석/코드블록 금지.\n"
        f"파일 경로: {path_}\n요구사항: {brief}\n참고 계획(요약): {plan_text[:1500]}\n"
        + ("참고 툴 제안(JSON 개요):\n" + safe_json_text(suggestions)[:1200] + "\n" if suggestions else "")
        + "출력 끝에는 <EOF/> 마커를 반드시 붙이세요."
    )
    txt = call_gemini_rate_limited(header, model=os.environ.get('GEMINI_MODEL_CODE','gemini-2.5-pro'), max_output_tokens=int(os.environ.get('GEMINI_CODE_MAX_TOKENS','3500')))
    acc = txt or ''
    if '<EOF/>' in acc:
        return acc.replace('<EOF/>','').strip()
    # 2) 이어쓰기 루프
    max_iters = int(os.environ.get('GEMINI_CODE_MAX_ITERS','6'))
    for i in range(1, max_iters+1):
        tail = acc[-4000:]
        prompt_continue = (
            "이전까지 생성한 파일의 마지막 일부를 보여줍니다. 이 다음 부분부터 이어서 '코드만' 출력하세요. 앞부분을 반복 출력하지 마세요. 끝에 <EOF/>를 붙이세요.\n\n"
            f"[이전 일부]\n{tail}\n\n[이어쓰기 시작]"
        )
        chunk = call_gemini_rate_limited(prompt_continue, model=os.environ.get('GEMINI_MODEL_CODE','gemini-2.5-pro'), max_output_tokens=int(os.environ.get('GEMINI_CODE_MAX_TOKENS','3000')))
        acc += (chunk or '')
        print(f"[gemini][gen] +chunk#{i} chars={len((chunk or '').encode('utf-8','ignore'))}")
        if '<EOF/>' in (chunk or ''):
            return acc.replace('<EOF/>','').strip()
    return acc.strip()


# -------------------------- LLM 호출부 --------------------------

def call_gemini(user_text: str, model: Optional[str] = None) -> str:
    import requests
    api_key = os.environ.get('GOOGLE_API_KEY') or os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise RuntimeError('GEMINI_API_KEY 미설정')
    model = model or os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
    payload = {
        'contents': [{'role': 'user', 'parts': [{'text': user_text}]}],
        'generationConfig': {'temperature': 0.2}
    }
    # 간단 재시도
    last = None
    for i in range(5):
        try:
            r = requests.post(url, params={'key': api_key}, json=payload, timeout=120)
            if r.status_code == 200:
                data = r.json()
                return ((data.get('candidates') or [{}])[0].get('content') or {}).get('parts', [{}])[0].get('text', '')
            if r.status_code not in (429, 500, 502, 503, 504):
                r.raise_for_status()
            # 재시도 대상인 경우에만 로그 후 슬립
            sleep_s = min(2 ** i, 5)
            print(f"[retry][gemini] model={model} attempt={i+1}/5 http={r.status_code} sleep={sleep_s}s")
            time.sleep(sleep_s)
            continue
        except Exception as e:
            last = e
            sleep_s = min(2 ** i, 5)
            print(f"[retry][gemini] model={model} attempt={i+1}/5 error={type(e).__name__}: {e} sleep={sleep_s}s")
            time.sleep(sleep_s)
            continue
    if last:
        raise last
    return ''

def call_gpt_oss(messages: list[dict], *, max_retries: int = 5, base_backoff: float = 1.0) -> str:
    """
	gpt-oss/Ollama(OpenAI 호환) 호출 + 지수 백오프 재시도.
	환경변수:
	  - GPT_OSS_API_BASE, OLLAMA_API_BASE (기본 http://localhost:11434/v1 → 실패 시 http://localhost:8000/v1)
	  - GPT_OSS_MODEL, OLLAMA_MODEL (기본 llama3.1:8b)
    """
    import requests
    candidates, model = get_oss_candidates_and_model()
    # model already resolved above
    last_err = None

    for api_base in candidates:
        url = f"{api_base}/chat/completions"
        payload = {'model': model, 'messages': messages, 'temperature': 0.1}
        for attempt in range(1, max_retries + 1):
            try:
                resp = requests.post(url, json=payload, timeout=240)
                if resp.status_code == 200:
                    data = resp.json()
                    return ((data.get('choices') or [{}])[0].get('message') or {}).get('content', '')
                # 429/5xx 재시도
                if resp.status_code in (429, 500, 502, 503, 504):
                    last_err = f"HTTP {resp.status_code} @ {api_base}: {resp.text[:200]}"
                    sleep_s = min(base_backoff * (2 ** (attempt - 1)), 8.0)
                    print(f"[retry][oss] base={api_base} model={model} attempt={attempt}/{max_retries} http={resp.status_code} sleep={sleep_s}s")
                else:
                    resp.raise_for_status()
            except Exception as e:
                last_err = f"{api_base}: {e}"
                # ReadTimeout 또는 연결류 에러면 즉시 네이티브 Ollama 스트리밍 폴백 1회 시도
                if 'Read timed out' in str(e) or 'Connection' in str(e):
                    try:
                        print(f"[fallback][ollama-native] streaming via {api_base}")
                        return call_ollama_native_chat(messages, model)
                    except Exception as ee:
                        last_err = f"ollama-native: {ee}"
                sleep_s = min(base_backoff * (2 ** (attempt - 1)), 8.0)
                print(f"[retry][oss] base={api_base} model={model} attempt={attempt}/{max_retries} error={type(e).__name__}: {e} sleep={sleep_s}s")
                time.sleep(sleep_s)

    raise RuntimeError(f"gpt-oss 호출 실패 (retries={max_retries}): {last_err}")


def call_ollama_native_chat(messages: list[dict], model: Optional[str] = None, *, stream_log: bool = True) -> str:
    """Ollama 네이티브 /api/chat 스트리밍 호출. 진행 상황 로그를 단계적으로 출력."""
    import requests
    # 기본은 OLLAMA_API_BASE(예: http://localhost:11434/v1). 네이티브는 /v1 제거.
    api_base = os.environ.get('OLLAMA_API_BASE', 'http://localhost:11434/v1')
    base_native = api_base[:-3] if api_base.endswith('/v1') else api_base
    model_name = model or os.environ.get('GPT_OSS_MODEL') or os.environ.get('OLLAMA_MODEL') or 'llama3.1:8b'
    url = f"{base_native}/api/chat"
    payload = { 'model': model_name, 'messages': messages, 'stream': True }
    acc = []
    total = 0
    with requests.post(url, json=payload, stream=True, timeout=None) as resp:
        resp.raise_for_status()
        for raw in resp.iter_lines():
            if not raw:
                continue
            try:
                data = json.loads(raw.decode('utf-8', errors='ignore'))
            except Exception:
                continue
            delta = ((data.get('message') or {}).get('content')) or ''
            if delta:
                acc.append(delta)
                total += len(delta)
                if stream_log and (total % 512 < len(delta)):
                    print(f"[ollama][stream] +{len(delta)} chars (total={total})")
            # done 플래그가 오면 종료
            if data.get('done') is True:
                break
    return ''.join(acc)


def log_backend_status() -> None:
    """환경 및 서버 연결 상태를 간단히 로그로 출력"""
    # Gemini
    gemini_model = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    gemini_key_set = bool(os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY'))
    print(f"[status] gemini model={gemini_model} key={'set' if gemini_key_set else 'missing'}")

    # OSS/Ollama API 후보
    oss_base = os.environ.get('GPT_OSS_API_BASE')
    ollama_base = os.environ.get('OLLAMA_API_BASE')
    model = os.environ.get('GPT_OSS_MODEL') or os.environ.get('OLLAMA_MODEL') or 'llama3.1:8b'
    candidates, model_pref = get_oss_candidates_and_model()

    # 간단 연결 확인
    import requests
    for base in candidates:
        try:
            r = requests.get(f"{base}/models", timeout=3)
            ok = (r.status_code == 200)
            print(f"[status] oss base={base} ok={ok} model_pref={model_pref}")
        except Exception as e:
            print(f"[status] oss base={base} error={type(e).__name__}: {e}")


def get_oss_candidates_and_model() -> Tuple[list, str]:
    env_bases = []
    for k in ['GPT_OSS_API_BASE', 'OLLAMA_API_BASE']:
        v = os.environ.get(k)
        if v:
            env_bases.append(v.rstrip('/'))
    if env_bases:
        seen = set()
        candidates = []
        for base in env_bases:
            if base not in seen:
                candidates.append(base)
                seen.add(base)
    else:
        candidates = ['http://localhost:11434/v1', 'http://localhost:8000/v1']
    model = os.environ.get('GPT_OSS_MODEL') or os.environ.get('OLLAMA_MODEL') or 'llama3.1:8b'
    return candidates, model


# -------------------------- 파싱/저장 --------------------------

def parse_json_tail(text: str) -> Dict[str, Any]:
    import re
    m = re.search(r"\{[\s\S]*\}$", text)
    s = m.group(0) if m else text
    try:
        return json.loads(s)
    except Exception:
        return {'raw': text}

def parse_flexible_json(text: str) -> Any:
    """
    코드블록(```json ... ```) 또는 앞뒤 설명이 섞인 출력에서 JSON 부분만 최대한 파싱.
    실패 시 원문 반환.
    """
    import re
    # 1) ```json ... ``` 블록 우선 추출
    m = re.search(r"```json\s*([\s\S]*?)```", text, flags=re.IGNORECASE)
    if m:
        body = m.group(1)
        try:
            return json.loads(body)
        except Exception:
            pass
    # 2) 마지막 중괄호 블록 시도
    m2 = re.search(r"\{[\s\S]*\}$", text)
    if m2:
        s = m2.group(0)
        try:
            return json.loads(s)
        except Exception:
            pass
    # 3) 대괄호 단독 루트 시도
    m3 = re.search(r"\[[\s\S]*\]$", text)
    if m3:
        s = m3.group(0)
        try:
            return json.loads(s)
        except Exception:
            pass
    return {'raw': text}


def parse_freeform_recommendation(text: str) -> Optional[Dict[str, Dict[str, Optional[str]]]]:
    """
    자유형 입력 예시를 파싱:
      - "sql은 MySQL, backend는 Django, frontend는 React, ai는 Gemini"
      - 줄바꿈/쉼표 구분 허용, 이유는 '이유:' 접두로 붙여줄 수 있음
    반환 구조: {'sql': {'recommendation': str, 'reason': str|None}, ...}
    """
    lowered = text.strip()
    if not lowered:
        return None
    import re
    # 구분자로 줄바꿈/쉼표/세미콜론 허용
    parts = re.split(r"[\n,;]+", lowered)
    out: Dict[str, Dict[str, Optional[str]]] = {}
    key_map = {
        'sql': 'sql', '데이터베이스': 'sql', 'db': 'sql',
        'backend': 'backend', '백엔드': 'backend', '서버': 'backend',
        'frontend': 'frontend', '프론트': 'frontend', '프론트엔드': 'frontend', '클라이언트': 'frontend',
        'ai': 'ai', '인공지능': 'ai', '모델': 'ai'
    }
    for raw in parts:
        s = raw.strip()
        if not s:
            continue
        # 패턴: "키 는/은 값 (이유: ...)" / "키: 값 (이유: ...)"
        m = re.match(r"^([^:은는\s]+)\s*[:은는]\s*(.+)$", s)
        if not m:
            continue
        k_raw, v_raw = m.group(1).strip().lower(), m.group(2).strip()
        k = key_map.get(k_raw)
        if not k:
            continue
        reason = None
        m2 = re.search(r"\(\s*이유\s*:\s*(.*?)\)\s*$", v_raw)
        if m2:
            reason = m2.group(1).strip()
            v = v_raw[:m2.start()].strip()
        else:
            v = v_raw.strip()
        if v:
            out.setdefault(k, {})['recommendation'] = v
        if reason:
            out.setdefault(k, {})['reason'] = reason
    return out if out else None

def save_documents(root_out: Path, *, plan_src_text: Optional[str], plan_src_path: Optional[str],
                   spec_src_text: Optional[str], spec_src_path: Optional[str]):
    root_out.mkdir(parents=True, exist_ok=True)

    # 기획서 저장
    if plan_src_text:
        (root_out / 'plan.txt').write_text(plan_src_text, encoding='utf-8')
    if plan_src_path and Path(plan_src_path).exists():
        dst = root_out / Path(plan_src_path).name
        try:
            import shutil
            shutil.copy2(plan_src_path, dst)
        except Exception:
            try:
                (root_out / 'plan.txt').write_text(Path(plan_src_path).read_text(encoding='utf-8'), encoding='utf-8')
            except Exception:
                pass

    # 기술명세서 저장
    if spec_src_text:
        (root_out / 'spec.txt').write_text(spec_src_text, encoding='utf-8')
    if spec_src_path and Path(spec_src_path).exists():
        dst = root_out / Path(spec_src_path).name
        try:
            import shutil
            shutil.copy2(spec_src_path, dst)
        except Exception:
            try:
                (root_out / 'spec.txt').write_text(Path(spec_src_path).read_text(encoding='utf-8'), encoding='utf-8')
            except Exception:
                pass

def build_metadata(*, backend_base: Optional[str], executed: Dict[str, bool],
                   inputs: Dict[str, Dict[str, Any]], suggestions: Optional[Dict[str, Any]],
                   note: Optional[str]) -> Dict[str, Any]:
    from datetime import datetime, timezone
    meta = {
        'created_at': datetime.now(timezone.utc).isoformat(),
        'backend_base': backend_base,
        'executed': executed,
        'inputs': inputs,
        'models': {
            'gemini': {
                'used': True if suggestions is not None else False,
                'name': os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
            },
            'gpt_oss': {
                'api_base': os.environ.get('GPT_OSS_API_BASE', 'http://localhost:8000/v1'),
                'model': os.environ.get('GPT_OSS_MODEL', 'gpt-oss-20b')
            }
        },
        'env': {
            'python': sys.version.split()[0],
        },
        'note': note
    }
    # 제안 요약(크면 생략)
    if suggestions:
        try:
            meta['propose_preview'] = json.dumps(suggestions, ensure_ascii=False)[:2000]
        except Exception:
            meta['propose_preview'] = str(suggestions)[:2000]
    return meta

def save_metadata(root_out: Path, meta: Dict[str, Any]):
    root_out.mkdir(parents=True, exist_ok=True)
    (root_out / 'metadata.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')


# -------------------------- 인터랙티브 유틸 --------------------------

def normalize_tools_for_summary(tools_in: list) -> list:
    """
    요약 용도로 툴 카테고리를 보정합니다.
    - DB 계열: PostgreSQL/MySQL 등은 sql
    - 백엔드 프레임워크: Django/Spring/NestJS/Express/FastAPI 등은 backend
    - 프론트: React/Next/Vue/Nuxt/Angular/Svelte 등은 frontend
    - AI 모델/플랫폼: Gemini/GPT/Llama/Claude 등은 ai
    - 인프라/외부서비스: Google Maps/Mapbox/Redis/Kafka/Puppeteer 등은 infra
    """
    if not isinstance(tools_in, list):
        return []
    normalized = []
    db_keywords = ['postgres', 'postgre', 'mysql', 'mariadb', 'maria', 'sqlite', 'mssql', 'sql server', 'oracle', 'cockroach', 'timescaledb', 'snowflake', 'bigquery']
    orm_keywords = ['prisma', 'typeorm', 'sequelize', 'hibernate', 'jpa', 'ef core']
    be_keywords = ['django', 'fastapi', 'flask', 'spring', 'spring boot', 'node', 'express', 'nestjs', 'nestjs', 'koa', '.net', 'asp.net', 'laravel', 'rails', 'gin', 'fiber', 'echo', 'ktor', 'quarkus', 'micronaut', 'go']
    fe_keywords = ['react', 'next', 'vue', 'nuxt', 'angular', 'svelte', 'solid', 'astro']
    ai_keywords = ['gemini', 'gpt', 'llama', 'mistral', 'claude', 'openai', 'ollama', 'generative', 'model']
    infra_keywords = ['google maps', 'mapbox', 'redis', 'kafka', 'rabbitmq', 'puppeteer', 'celery']

    for t in tools_in:
        if not isinstance(t, dict):
            continue
        name = (t.get('name') or '').lower()
        why = (t.get('why') or '').lower()
        text = f"{name} {why}"
        norm = dict(t)
        norm_cat = (t.get('category') or '').lower().strip()

        def any_in(keys: list) -> bool:
            return any(k in text for k in keys)

        if any_in(ai_keywords):
            norm_cat = 'ai'
        elif any_in(be_keywords):
            norm_cat = 'backend'
        elif any_in(fe_keywords):
            norm_cat = 'frontend'
        elif any_in(db_keywords):
            norm_cat = 'sql'
        elif any_in(infra_keywords):
            norm_cat = 'infra'
        # ORM은 sql이 아니라 backend 도구로 본다
        if any_in(orm_keywords):
            norm_cat = 'backend'

        norm['norm_category'] = norm_cat
        normalized.append(norm)
    return normalized

def build_recommendation_summary(suggestions: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
    """
    suggestions.tools 배열에서 카테고리별 대표 1개를 뽑아 간단 요약 생성
    - SQL: sql
    - Backend: backend
    - Frontend: frontend
    - AI(Model): tools 내에서 AI/LLM/Gemini/Ollama 등 키워드 기반 추천(있으면)
    반환: (요약 JSON, 요약 Markdown)
    """
    tools = suggestions.get('tools') if isinstance(suggestions, dict) else None
    if not isinstance(tools, list):
        tools = []
    tools_n = normalize_tools_for_summary(tools)

    def first_by_category(cat: str) -> Optional[Dict[str, Any]]:
        orm_keywords = ['prisma', 'typeorm', 'sequelize', 'hibernate', 'jpa', 'ef core']
        for t in tools_n:
            if not isinstance(t, dict):
                continue
            if t.get('norm_category') != cat:
                continue
            name = (t.get('name') or '').lower()
            if cat == 'sql' and any(k in name for k in orm_keywords):
                # ORM은 DB 추천에서 제외
                continue
            return t
        # 보정된 목록에서 없으면 원본 카테고리로라도 시도
        for t in tools:
            if not isinstance(t, dict):
                continue
            if t.get('category') == cat:
                return t
        return None

    sql_t = first_by_category('sql')
    be_t = first_by_category('backend')
    fe_t = first_by_category('frontend')

    def detect_ai_normalized(tools_list: list) -> Optional[Dict[str, Any]]:
        for t in tools_list:
            if isinstance(t, dict) and t.get('norm_category') == 'ai':
                return t
        return None

    ai_t = detect_ai_normalized(tools_n)

    summary_json = {
        'sql': {
            'recommendation': (sql_t or {}).get('name') or None,
            'reason': (sql_t or {}).get('why') or None,
        },
        'backend': {
            'recommendation': (be_t or {}).get('name') or None,
            'reason': (be_t or {}).get('why') or None,
        },
        'frontend': {
            'recommendation': (fe_t or {}).get('name') or None,
            'reason': (fe_t or {}).get('why') or None,
        },
        'ai': {
            'recommendation': (ai_t or {}).get('name') or None,
            'reason': (ai_t or {}).get('why') or None,
        }
    }

    def line(title: str, item: Dict[str, Optional[str]]) -> str:
        rec = item.get('recommendation') or '-'
        why = item.get('reason') or '-'
        return f"- **{title}**: {rec}\n  - **이유**: {why}\n"

    md = (
        "## 기술 스택 간단 추천\n\n"
        + line('SQL', summary_json['sql'])
        + line('Backend', summary_json['backend'])
        + line('Frontend', summary_json['frontend'])
        + line('AI(Model)', summary_json['ai'])
    )

    return summary_json, md

def interactive_collect_inputs() -> Tuple[str, Dict[str, Any], str, Dict[str, Any]]:
    print('=== 입력 수집 ===')
    # 기획서
    plan_text = ''
    plan_src: Dict[str, Any] = {'kind': 'none', 'path': None, 'ext': None, 'size': None}
    while True:
        choice = input('기획서 입력 방식을 선택하세요 [1: 직접 입력, 2: 파일 경로, Enter: 건너뛰기]: ').strip()
        if choice == '1':
            print('기획서 내용을 입력하고 빈 줄에서 Enter 두 번으로 종료하세요:')
            plan_text = read_multiline_from_stdin()
            plan_src = {'kind': 'text', 'path': None, 'ext': None, 'size': len(plan_text)}
            break
        elif choice == '2':
            p = input('기획서 파일 경로를 입력하세요: ').strip().strip('"').strip("'")
            plan_text = read_file_to_text(Path(p))
            plan_src = {'kind': 'file', 'path': p, 'ext': Path(p).suffix.lower(), 'size': None}
            break
        elif choice == '':
            break
        else:
            print('유효하지 않은 선택입니다.')
    # 기능명세서
    spec_text = ''
    spec_src: Dict[str, Any] = {'kind': 'none', 'path': None, 'ext': None, 'size': None}
    while True:
        choice = input('기능명세서 입력 방식을 선택하세요 [1: 직접 입력, 2: 파일 경로, Enter: 건너뛰기]: ').strip()
        if choice == '1':
            print('기능명세서 내용을 입력하고 빈 줄에서 Enter 두 번으로 종료하세요:')
            spec_text = read_multiline_from_stdin()
            spec_src = {'kind': 'text', 'path': None, 'ext': None, 'size': len(spec_text)}
            break
        elif choice == '2':
            p = input('기능명세서 파일 경로를 입력하세요: ').strip().strip('"').strip("'")
            spec_text = read_file_to_text(Path(p))
            spec_src = {'kind': 'file', 'path': p, 'ext': Path(p).suffix.lower(), 'size': None}
            break
        elif choice == '':
            break
        else:
            print('유효하지 않은 선택입니다.')
    return plan_text, plan_src, spec_text, spec_src


def read_multiline_from_stdin() -> str:
    lines = []
    blank_in_a_row = 0
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line.strip() == '':
            blank_in_a_row += 1
            if blank_in_a_row >= 2:
                break
        else:
            blank_in_a_row = 0
        lines.append(line)
    return "\n".join(lines).strip()


def interactive_confirm_or_edit_suggestions(suggestions: Optional[Dict[str, Any]], spec_md: str, plan_md: str) -> Optional[Dict[str, Any]]:
    while True:
        act = input('제안을 어떻게 할까요? [y: 그대로 진행, r: 재추천, e: 직접편집, s: 건너뛰기]: ').strip().lower()
        if act in ('y', ''):
            return suggestions
        if act == 's':
            return None
        if act == 'r':
            try:
                override_hint = input('재추천 힌트(선택): ').strip()
                prompt_extra = ("\n\n추가 힌트:\n" + override_hint) if override_hint else ''
                text = call_gemini(
                    '다음 문서를 분석하여 SQL/백엔드/프론트 생성에 유용한 툴 제안 목록을 JSON으로 출력하세요.\n\n'
                    '출력 형식(JSON): { "tools": [ { "id": string, "category": "sql"|"backend"|"frontend"|"infra", "name": string, "why": string, "inputs": string[], "outputs": string[], "dependencies": string[] } ] }\n\n'
                    f'명세:\n{spec_md or "(없음)"}\n\n기획:\n{plan_md or "(없음)"}\n\nJSON만 출력' + prompt_extra
                )
                suggestions = parse_flexible_json(text)
                print('--- 재제안 결과(JSON) ---')
                print(json.dumps(suggestions, ensure_ascii=False, indent=2))
            except Exception as e:
                print(f"[warn] 재추천 실패: {e}")
                continue
            continue
        if act == 'e':
            print('제안 JSON을 붙여넣으세요. 또는 자유형으로 입력하세요 (예: "sql은 MySQL, backend는 Django, frontend는 React, ai는 Gemini"). 빈 줄 두 번으로 종료합니다:')
            text = read_multiline_from_stdin()
            # 1) JSON 파싱 시도
            try:
                obj = json.loads(text)
                suggestions = obj
                print('--- 편집된 제안(JSON)이 적용되었습니다 ---')
                print(json.dumps(suggestions, ensure_ascii=False, indent=2))
                return suggestions
            except Exception:
                pass
            # 2) 자유형 파싱 시도 → 요약 구조 → 최소 suggestions 변환
            summary = parse_freeform_recommendation(text)
            if summary:
                tools = []
                def add(cat: str, id_: str):
                    rec = (summary.get(cat) or {}).get('recommendation')
                    if rec:
                        tools.append({
                            'id': id_, 'category': cat, 'name': rec,
                            'why': (summary.get(cat) or {}).get('reason') or ''
                        })
                add('sql', 'sql-freeform')
                add('backend', 'backend-freeform')
                add('frontend', 'frontend-freeform')
                add('ai', 'ai-freeform')
                # 중요: 자유형 입력은 즉시 요약 파일도 갱신해 사용자가 결과를 확인할 수 있게 함
                proj = infer_project_name(plan_md or spec_md) or 'Project'
                root = Path('local_artifacts') / proj
                root.mkdir(parents=True, exist_ok=True)
                tmp_suggestions = {'tools': tools}
                summary_obj, _ = build_recommendation_summary(tmp_suggestions)
                (root / 'tools_recommendation.json').write_text(json.dumps(summary_obj, ensure_ascii=False, indent=2), encoding='utf-8')
                suggestions = {'tools': tools, '_edited_from_freeform': True, '_freeform_raw': text}
                print('--- 자유형 입력이 적용되었습니다 ---')
                print(json.dumps(suggestions, ensure_ascii=False, indent=2))
                return suggestions
            print('[warn] 인식 가능한 형식이 아닙니다. 다시 시도하거나 r(재추천)을 사용하세요.')
            continue
        print('유효하지 않은 선택입니다.')


def interactive_select_generation_targets() -> Dict[str, bool]:
    print('=== 생성 대상 선택 ===')
    def yn(prompt: str, default_yes: bool = True) -> bool:
        ans = input(f"{prompt} [{'Y/n' if default_yes else 'y/N'}]: ").strip().lower()
        if ans == '':
            return default_yes
        return ans.startswith('y')
    return {
        'sql': yn('SQL 생성할까요?', True),
        'backend': yn('백엔드 생성할까요?', True),
        'frontend': yn('프론트엔드 생성할까요?', True),
    }

# -------------------------- 엔트리 --------------------------

if __name__ == '__main__':
    sys.exit(main())
