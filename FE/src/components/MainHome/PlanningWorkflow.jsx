// src/components/MainHome/PlanningWorkflow.jsx
// 상단 import에 추가
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React, { useRef, useState } from "react";
import {
  Lightbulb, FilePlus2, ClipboardList, GitBranch, GanttChartSquare,
  FileCheck2, Upload as UploadIcon, ArrowRight, Eye, FileDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import "../../styles/MainHome/PlanningWorkflow.css";

/* --- Idea API helpers --- */
const pickMd = (p) =>
  p?.md ?? p?.markdown ?? p?.preview?.md ?? p?.preview?.markdown ?? p?.draft?.md ?? p?.draft?.markdown ?? "";

// export된 md 파일명으로 서버에서 md 원문 로드(GET). axios라 Auth 헤더 붙음.
async function ideaPreviewByFile(filename) {
  const { data } = await api.get("/idea/preview/", { params: { filename } });
  return { md: pickMd(data) || data?.md || "" };
}

// 아이디어 정제/확장 (구조 + md)
async function ideaProcess({ title, idea, options, project_id }) {
  const body = { title, idea };
  if (options) body.options = options;
  if (project_id) body.project_id = project_id;
  const { data } = await api.post("/idea/process/", body);
  return {
    ok: data?.ok !== false,
    md: pickMd(data),
    refined: data?.refined ?? data?.result?.refined ?? null,
    suggestions: data?.suggestions ?? data?.result?.suggestions ?? [],
    similar_map: data?.similar_map ?? data?.result?.similar_map ?? {},
  };
}

// 파일 생성(export)
async function ideaExport({ refined, suggestions, similar_map, filename_prefix }) {
  const body = { refined: refined || {}, suggestions: suggestions || [], similar_map: similar_map || {} };
  if (filename_prefix) body.filename_prefix = filename_prefix;
  const { data } = await api.post("/idea/export/", body);
  return {
    markdown_file: data?.markdown_file ?? data?.md_file ?? "",
    docx_file: data?.docx_file ?? data?.doc_file ?? "",
    saved_dir: data?.saved_dir ?? "",
  };
}

// axios baseURL(/api)이 있으므로 상대경로만 사용
const ideaDownloadUrl = (filename) => `/idea/download/${encodeURIComponent(filename)}/`;

// ✅ 토큰 포함 blob 다운로드
async function downloadFileBlob(filename) {
  const url = ideaDownloadUrl(filename);
  const res = await api.get(url, { responseType: "blob" });
  const disposition = res.headers?.["content-disposition"] || "";
  let suggested = filename;
  const m = disposition.match(/filename="?([^"]+)"?/i);
  if (m && m[1]) {
    try { suggested = decodeURIComponent(m[1]); } catch { suggested = m[1]; }
  }
  const blobUrl = window.URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = suggested || filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export default function PlanningWorkflow({
  projectId,
  setProjectId,
  setBusy,
  setBusyMsg,
  postJson,
  onIdeaSave,
  onSpec1,
  onSpec2,
  onGoChooseFinal,
  onGoCrawl,
  onGoGantt,
  onGoFinalDoc,
  onProjectCreated,
  onGoDocumentCreate,
  hasIdea = false,
  hasSpec1 = false,
  hasSpec2 = false,
  isFinalChosen = false,
}) {
  const navigate = useNavigate();
  const httpPost = postJson || ((url, body = {}) => api.post(url, body));

  const [hasExistingPlan, setHasExistingPlan] = useState(false);
  const [title, setTitle] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [planText, setPlanText] = useState("");

  // 파일 상태(기존 플로우)
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setFileName(f ? f.name : "");
  };
  const clearFile = () => { setFile(null); setFileName(""); };

  // 파이프라인 상태
  const [previewing, setPreviewing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [processedMd, setProcessedMd] = useState("");
  const [processedObj, setProcessedObj] = useState({ refined: null, suggestions: [], similar_map: {} });
  const [exportFilename, setExportFilename] = useState("");     // docx 또는 md(다운로드 대상)
  const [exportMdFilename, setExportMdFilename] = useState(""); // md 미리보기용 파일명
  const previewTicket = useRef(0);

  /* 기존 프로젝트 생성 로직 유지 */
  const ensureProject = async () => {
    if (projectId) return projectId;
    try {
      setBusy?.(true); setBusyMsg?.("프로젝트 생성 중...");
      const t = (title || (hasExistingPlan ? "기존 기획서" : "새 프로젝트")).trim();
      const d = ((hasExistingPlan ? planText : "") || ideaText || (fileName ? "(첨부된 기획서 파일 기반)" : "") || "프로젝트 설명").trim();
      let res;
      if (hasExistingPlan && file) {
        const fd = new FormData();
        fd.append("title", t); fd.append("description", d); fd.append("file", file, file.name);
        res = await api.post("/project/register-from-file/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        res = await httpPost("/project/", { title: t, description: d });
      }
      const pid = res?.data?.project_id ?? res?.data?.id;
      if (!pid) throw new Error("프로젝트 생성 실패");
      setProjectId?.(pid);
      return pid;
    } catch (err) {
      alert(`프로젝트 생성 실패: ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`);
      throw err;
    } finally {
      setBusy?.(false); setBusyMsg?.("");
    }
  };

  const goNext = async () => {
    try { const pid = projectId || (await ensureProject()); onProjectCreated?.(pid); } catch {}
  };

  const goDocumentCreate = async () => {
    try {
      const pid = projectId || (await ensureProject());
      if (ideaText?.trim() || title?.trim()) onIdeaSave?.(ideaText, { title });
      if (typeof onGoDocumentCreate === "function") onGoDocumentCreate(pid, { title, ideaText });
      else navigate(`/project/${pid}/document/create`, { state: { title, ideaText } });
    } catch {}
  };

  /* 미리보기: export된 md가 있으면 그걸 읽고, 없으면 process로 대체 미리보기 */
  const handlePreview = async () => {
    const token = ++previewTicket.current;
    setPreviewing(true);
    try {
      if (exportMdFilename) {
        const res = await ideaPreviewByFile(exportMdFilename);
        if (token === previewTicket.current) setProcessedMd(res?.md || "");
      } else {
        if (!title.trim() || !ideaText.trim()) return;
        const res = await ideaProcess({ title, idea: ideaText });
        if (token === previewTicket.current) {
          setProcessedMd(res?.md || "");
          setProcessedObj({
            refined: res?.refined || null,
            suggestions: res?.suggestions || [],
            similar_map: res?.similar_map || {},
          });
        }
      }
    } finally {
      setPreviewing(false);
    }
  };

  /* 파일 생성: process → export → md 미리보기 자동 로드 */
  const handleGenerateFile = async () => {
    if (!title.trim() || !ideaText.trim()) { alert("제목과 아이디어를 입력해주세요."); return; }
    setExporting(true);
    try {
      const pid = projectId || null;

      // 1) 정제/확장
      const proc = await ideaProcess({ title, idea: ideaText, project_id: pid });
      const md = (proc?.md || "").trim();
      const refined = proc?.refined || null;
      const suggestions = proc?.suggestions || [];
      const similar_map = proc?.similar_map || {};
      setProcessedMd(md);
      setProcessedObj({ refined, suggestions, similar_map });

      // 2) export
      const filename_prefix = (title || "idea_plan")
        .toLowerCase().replace(/[^a-z0-9가-힣_\- ]+/g, "").replace(/\s+/g, "_");
      const exp = await ideaExport({ refined, suggestions, similar_map, filename_prefix });

      const docx = exp?.docx_file || "";
      const mdfile = exp?.markdown_file || "";
      const primary = docx || mdfile;

      setExportFilename(primary);
      setExportMdFilename(mdfile);

      // 3) md 파일 바로 미리보기
      if (mdfile) {
        try {
          const pv = await ideaPreviewByFile(mdfile);
          setProcessedMd(pv?.md || "");
        } catch {}
      }

      alert("기획서 파일이 생성되었습니다.");
    } catch (e) {
      const detail = e?.response?.data?.error || e?.response?.data?.detail || e?.message || "파일 생성 중 오류가 발생했습니다.";
      console.error("/idea/export error:", e?.response?.data || e);
      alert(detail);
    } finally {
      setExporting(false);
    }
  };

  /* ✅ 다운로드: axios blob (Auth 포함, 새로고침 없음) */
  const handleDownloadExport = async (e) => {
    e?.preventDefault?.();
    try {
      if (!exportFilename) {
        alert("생성된 파일이 없습니다. 먼저 [기획서 파일 생성]을 눌러주세요.");
        return;
      }
      await downloadFileBlob(exportFilename);
    } catch (err) {
      // 최후의 보조 수단이 필요하면 주석 해제 (권장 X: 토큰 미포함)
      // window.open(ideaDownloadUrl(exportFilename), "_blank");
      alert("다운로드 중 오류가 발생했습니다.");
      console.error("download error", err);
    }
  };

  const canGenerateWithoutProject = hasExistingPlan ? Boolean(planText.trim() || file) : Boolean(title.trim() && ideaText.trim());
  const genDisabled = !(Boolean(projectId) || canGenerateWithoutProject);

  return (
    <div className="workflow-container app-card" id="workflow">
      {/* 헤더 */}
      <div className="workflow-header">
        <ClipboardList size={20} />
        <h2>프로젝트 생성하기</h2>
        {projectId && <span className="project-id">#{projectId}</span>}
      </div>

      {/* 단계 표시 */}
      <div className="steps-container" aria-label="진행 단계">
        <div className={`step ${hasIdea ? "active" : ""}`}><Lightbulb size={16} /><span>아이디어</span></div>
        <div className="arrow" aria-hidden>→</div>
        <div className={`step ${projectId ? "active" : ""}`}><FilePlus2 size={16} /><span>프로젝트</span></div>
        <div className="arrow" aria-hidden>→</div>
        <div className={`step ${hasSpec1 || hasSpec2 ? "active" : ""}`}><ClipboardList size={16} /><span>명세서</span></div>
        <div className="arrow" aria-hidden>→</div>
        <div className={`step ${isFinalChosen ? "active" : ""}`}><FileCheck2 size={16} /><span>최종확정</span></div>
      </div>

      {/* 입력 폼 */}
      <div className="form-container">
        <div className="form-toggle" role="tablist" aria-label="기획서 입력 방식 선택">
          <button type="button" className={!hasExistingPlan ? "active" : ""} onClick={() => setHasExistingPlan(false)}>기획서도 만들어주세요</button>
          <button type="button" className={hasExistingPlan ? "active" : ""} onClick={() => setHasExistingPlan(true)}>기획서는 있어요</button>
        </div>

        <div className="form-fields">
          <input type="text" placeholder="프로젝트 제목" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="프로젝트 제목" />

          {!hasExistingPlan ? (
            <>
              <textarea
                placeholder="아이디어를 자유롭게 작성해주세요..."
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                rows={10}
                aria-label="아이디어 입력"
              />
              <div className="action-buttons mt-8">
  <button
    type="button"
    className="btn-secondary"
    onClick={() => {
      if (ideaText?.trim() || title?.trim()) {
        onIdeaSave?.(ideaText, { title });
        alert("아이디어가 저장되었습니다.");
      } else {
        alert("아이디어와 제목을 입력해주세요.");
      }
    }}
    disabled={!title || !ideaText}
    title="현재 아이디어를 저장합니다."
  >
    <ClipboardList size={16} style={{ marginRight: 6 }} />
    아이디어 저장
  </button>

  <button
    type="button"
    className="btn-primary"
    onClick={handleGenerateFile}
    disabled={!title || !ideaText || exporting}
    title="제목/아이디어로 기획서 파일을 생성합니다."
  >
    <FilePlus2 size={16} style={{ marginRight: 6 }} />
    {exporting ? "파일 생성 중..." : "기획서 파일 생성"}
  </button>

  {/* ⛔ '기획서 미리보기' 버튼 제거 */}

  <button
    type="button"
    className="btn-secondary"
    onClick={handleDownloadExport}
    disabled={!exportFilename}
    title="생성된 기획서 파일을 다운로드합니다."
  >
    <FileDown size={16} style={{ marginRight: 6 }} />
    기획서 다운로드
  </button>
</div>
             {/* 미리보기(MD) */}
<div className="md-card">
  <div className="md-card_header">
    <span>미리보기(MD)</span>
    <small className="muted">{processedMd ? "생성된 파일 내용" : "아직 없음"}</small>
  </div>
  <div className="md-card_body">
    {processedMd ? (
      <ReactMarkdown 
        children={processedMd} 
        remarkPlugins={[remarkGfm]} 
      />
    ) : (
      <div className="md-empty">
        [기획서 파일 생성] 후 [기획서 미리보기]를 눌러 확인하세요.
      </div>
    )}
  </div>
</div>
            </>
          ) : (
            /* 기존 기획서 사용 */
            <>
              <div className="file-row">
                <label htmlFor="file-input" className="btn-secondary file-select">
                  <UploadIcon size={16} />파일 선택
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept=".txt,.md,.markdown,.csv,.json,.yml,.yaml,.log,.ini,.conf,.doc,.docx,.pdf"
                  className="visually-hidden"
                  onChange={handleFileChange}
                />
                {fileName && (
                  <span className="file-chip" role="status">
                    {fileName}
                    <button type="button" className="btn-outline file-chip-remove" onClick={clearFile}>제거</button>
                  </span>
                )}
              </div>

              <textarea
                id="existing-plan-textarea"
                placeholder="기존 기획서 내용을 붙여넣으세요... (텍스트 또는 파일 중 하나만 있어도 가능)"
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                rows={10}
                aria-label="기존 기획서 본문"
              />

              <div className="action-buttons">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => ensureProject()}
                  disabled={!!projectId}
                  title="파일 업로드(있는 경우)를 포함해 프로젝트를 생성합니다."
                >
                  {projectId ? "프로젝트 생성완료" : "프로젝트 생성"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* 다음 → SPECS로 이동 */}
        <div className="action-buttons right mt-12">
          <button
            type="button"
            className="btn-success"
            onClick={goNext}
            disabled={genDisabled && !projectId}
            title={projectId ? "명세서 화면으로 이동합니다." : "프로젝트를 생성하거나 입력을 채워주세요."}
          >
            다음(명세서로) <ArrowRight size={16} className="ml-6" />
          </button>
        </div>

        {/* 이후 단계(옵션) */}
        {(hasSpec1 || hasSpec2) && (
          <div className="next-steps">
            <button type="button" className="btn-success" onClick={() => { alert("명세서가 확정되었습니다!"); onGoChooseFinal?.(); }}>
              최종 확정
            </button>

            {isFinalChosen && (
              <div className="final-actions">
                <button type="button" className="btn-secondary" onClick={onGoCrawl}>
                  <GitBranch size={16} /> 깃허브 크롤링
                </button>
                <button type="button" className="btn-secondary" onClick={onGoGantt}>
                  <GanttChartSquare size={16} /> 간트차트
                </button>
                <button type="button" className="btn-secondary" onClick={onGoFinalDoc}>
                  <FileCheck2 size={16} /> 최종문서
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
