// src/components/MainHome/FinalDocView.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Download, FileCheck2, Loader2, FileText } from "lucide-react";
import axios from "../../api/axiosInstance";
import "../../styles/MainHome/FinalDocView.css";

/**
 * Props
 * - projectId: number | string (선택)  ← 없으면 URL 파라미터 사용
 * - draftId: number | string (선택) → 기본 선택값(확정 초안 권장)
 * - initialDocumentId: number | string (선택)
 */

// axios baseURL에서 프로토콜/호스트만 뽑아 절대 URL 만들기
function getApiOrigin() {
  try {
    const u = new URL(axios.defaults.baseURL ?? "", window.location.href);
    return `${u.protocol}//${u.host}`;
  } catch {
    return window.location.origin;
  }
}
function toAbsoluteUrl(urlLike) {
  if (!urlLike) return "";
  if (/^https?:\/\//i.test(urlLike)) return urlLike;
  const origin = getApiOrigin();
  return urlLike.startsWith("/") ? origin + urlLike : origin + "/" + urlLike;
}

export default function FinalDocView({ projectId: projectIdProp, draftId, initialDocumentId }) {
  const params = useParams();
  const rawProjectId = projectIdProp ?? params.projectId;
  const projectId = Number(rawProjectId);

  const [documentId, setDocumentId] = useState(initialDocumentId ?? null);
  const [docMeta, setDocMeta] = useState(null);
  const [docHTML, setDocHTML] = useState("");
  const [docJSON, setDocJSON] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState(
    draftId != null && draftId !== "" ? String(draftId) : ""
  );

  const hasProject = useMemo(() => Number.isFinite(projectId) && projectId > 0, [projectId]);
  const hasSelectedDraft = useMemo(() => !!selectedDraftId, [selectedDraftId]);
  const canGenerate = hasProject && hasSelectedDraft;

  const isConfirmed = (d) =>
    d?.confirmed === true || d?.is_confirmed === true || d?.status === "confirmed";

  const renderDraftOptionLabel = (d) => {
    const id = d?.draft_id ?? d?.id;
    const stage = d?.type || d?.source || d?.stage || "draft";
    const created = d?.created_at ? new Date(d.created_at).toLocaleString() : "";
    return `${stage} #${id}${isConfirmed(d) ? " · 확정" : ""}${created ? ` · ${created}` : ""}`;
  };

  const fetchDrafts = useCallback(async () => {
    if (!hasProject) return { list: [], picked: "" };
    setLoadingDrafts(true);
    setError("");
    try {
      const { data } = await axios.get(`/project/${projectId}/drafts/`);
      const arr = Array.isArray(data) ? data : data?.results || [];
      setDrafts(arr);

      if (draftId != null && draftId !== "") return { list: arr, picked: String(draftId) };

      const confirmed = arr.find((d) => isConfirmed(d));
      if (confirmed) {
        const id = confirmed.draft_id ?? confirmed.id;
        return { list: arr, picked: id != null ? String(id) : "" };
      }
      if (arr.length > 0) {
        const id = arr[0].draft_id ?? arr[0].id;
        return { list: arr, picked: id != null ? String(id) : "" };
      }
      setError("이 프로젝트에는 초안이 없습니다. 먼저 G1/G2로 초안을 생성하세요.");
      return { list: [], picked: "" };
    } catch (e) {
      if (e?.response?.status === 404) setError("프로젝트를 찾을 수 없습니다. ID 또는 권한을 확인하세요.");
      else setError(e?.response?.data?.error || "초안 목록 조회 중 오류가 발생했습니다.");
      return { list: [], picked: "" };
    } finally {
      setLoadingDrafts(false);
    }
  }, [projectId, hasProject, draftId]);

  useEffect(() => {
    if (!hasProject) return;
    (async () => {
      const { picked } = await fetchDrafts();
      if (!selectedDraftId && picked) setSelectedDraftId(picked);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError("projectId 또는 draft_id가 없습니다. 선택을 확인하세요.");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const draftNum = Number(selectedDraftId);
      if (!Number.isFinite(draftNum) || draftNum <= 0) {
        setError("유효하지 않은 draft_id 입니다.");
        return;
      }

      // ✅ 바디 없이 쿼리스트링으로 draft_id 전달 (뷰가 body 또는 query 둘 다 지원)
      const { data } = await axios.post(
        `/project/${projectId}/final-devdoc/generate/`,
        null,
        { params: { draft_id: draftNum } }
      );

      const did = data?.document_id ?? data?.id ?? null;
      setDocumentId(did);
      setDocMeta(null);
      setDocHTML("");
      setDocJSON(null);
      setDownloadUrl("");

      // 서버는 생성 시 file_url을 같이 내려줍니다. 필요하면 즉시 열 수도 있음.
      // const abs = toAbsoluteUrl(data?.file_url);
      // if (abs) window.open(abs, "_blank", "noopener");
    } catch (e) {
      if (e?.response?.status === 404) setError("프로젝트를 찾을 수 없습니다. ID 또는 권한을 확인하세요.");
      else if (e?.response?.status === 415) setError("요청 형식 오류(415). 쿼리스트링 전송이 적용됐는지 확인하세요.");
      else setError(e?.response?.data?.error || e?.response?.data?.message || "최종 문서 생성 중 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async () => {
    if (!hasProject) {
      setError("projectId가 필요합니다. 먼저 프로젝트를 선택하세요.");
      return;
    }
    setError("");
    try {
      // ✅ 백엔드는 latest.file_url(상대경로)을 반환
      const { data } = await axios.get(`/project/${projectId}/final-devdoc/files/`);
      const url = data?.latest?.file_url;
      if (!url) {
        setError("다운로드할 최종 문서가 없습니다. 먼저 생성해 주세요.");
        return;
      }
      const abs = toAbsoluteUrl(url);
      setDownloadUrl(abs);
      window.open(abs, "_blank", "noopener");
    } catch (e) {
      if (e?.response?.status === 404) setError("프로젝트를 찾을 수 없습니다. ID 또는 권한을 확인하세요.");
      else setError(e?.response?.data?.message || "문서 다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="finaldoc-card">
      {/* 헤더 */}
      <div className="workflow-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText className="finaldoc-title-icon" />
          <h2>연구개발계획서</h2>
        </div>
        <div className="finaldoc-projectpill">
          프로젝트 ID: <b>{hasProject ? String(projectId) : "—"}</b>
          <span style={{ marginLeft: 8 }}>
            / 선택 Draft: <b>{hasSelectedDraft ? String(selectedDraftId) : "—"}</b>
          </span>
        </div>
      </div>

      {/* 초안 선택 */}
      <div className="finaldoc-draftselect" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <label style={{ fontSize: 14 }}>초안 선택</label>
        <select
          value={selectedDraftId}
          onChange={(e) => setSelectedDraftId(e.target.value)}
          disabled={loadingDrafts || !hasProject || drafts.length === 0}
          className="input-select"
          style={{ minWidth: 280 }}
        >
          {drafts.length === 0 ? (
            <option value="">초안 없음</option>
          ) : (
            drafts.map((d) => {
              const id = d.draft_id ?? d.id;
              return (
                <option key={id} value={String(id)}>
                  {renderDraftOptionLabel(d)}
                </option>
              );
            })
          )}
        </select>
      </div>
       
<div className="finaldoc-actions">
  <button
    className="fd-btn fd-btn-secondary"
    onClick={handleGenerate}
    disabled={!canGenerate || creating}
    title={
      !hasProject
        ? "먼저 프로젝트를 선택하세요."
        : !hasSelectedDraft
        ? "확정된 초안을 선택하세요."
        : undefined
    }
  >
    {creating ? <Loader2 className="spin" size={16} /> : <FileCheck2 size={16} />}
    최종 문서 생성
  </button>

  <button
    className="fd-btn fd-btn-primary"
    onClick={handleDownload}
    disabled={!hasProject}
  >
    <Download size={16} />
    문서 다운로드
  </button>
</div>
   

      {error && <div className="finaldoc-alert">{error}</div>}

      {/* (선택) 프리뷰 */}
      <div className="finaldoc-preview">
        {!docMeta && !docHTML && !docJSON ? (
          <div className="finaldoc-empty">
            [초안 선택] → [최종 문서 생성] → [문서 다운로드] 순서로 진행하세요.
          </div>
        ) : null}
      </div>
    </div>
  );
}
