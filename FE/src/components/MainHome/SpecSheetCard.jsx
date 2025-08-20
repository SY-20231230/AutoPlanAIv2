// src/components/MainHome/SpecSheetCard.jsx
// - finalize 시 draft_id 없을 경우 서버에서 재조회하여 보장
// - 에러 로그에 status/data/url/body 추가
// - 나머지 동작 및 UI는 기존과 동일

import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  PlusSquare,
  ArrowRight,
} from "lucide-react";
import api from "../../api/axiosInstance";
import "../../styles/MainHome/SpecSheetCard.css";

const safePretty = (v) => {
  try {
    if (typeof v === "string") return JSON.stringify(JSON.parse(v), null, 2);
    return JSON.stringify(v, null, 2);
  } catch {
    return v || "";
  }
};

const pickDraftId = (d) =>
  d?.draft_id ?? d?.RequirementDraft_id ?? d?.id ?? d?.pk ?? null;

/* Content-Disposition 에서 파일명 파싱 */
function parseFilename(disposition) {
  if (!disposition) return null;
  const utf8 = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition);
  if (utf8?.[1]) return decodeURIComponent(utf8[1].trim());
  const basic = /filename\s*=\s*"?([^"]+)"?/i.exec(disposition);
  if (basic?.[1]) return basic[1].trim();
  return null;
}

/* blob 저장 */
function saveBlob(blob, filename = "download.xlsx") {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/* ts 파라미터(YYYYMMDDHHmmss) */
function makeTs() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
}

export default function SpecSheetCard({
  spec1,
  spec2,
  onDownload1,
  onDownload2,
  onFinalize1,
  onFinalize2,
  finalized,
  finalSpec,

  projectId,
  setSpec1,
  setSpec2,
  setDraftIds,
  getJson,
  postJson,
  setBusy,
  setBusyMsg,
  onSpec1,
  onSpec2,

  similarRouteBuilder,
}) {
  const httpGet = getJson || ((url, params) => api.get(url, { params }));
  const httpPost = postJson || ((url, body = {}) => api.post(url, body));
  const navigate = useNavigate();

  // ✅ 내부 초안 ID 로컬 보관
  const [localDraftIds, setLocalDraftIds] = useState([null, null]); // [g1, g2]
  const writeDraftIds = (updater) => {
    if (typeof updater === "function") {
      setLocalDraftIds((prev) => {
        const next = updater(prev);
        setDraftIds?.(next);
        return next;
      });
    } else {
      setLocalDraftIds(updater);
      setDraftIds?.(updater);
    }
  };

  /** 초안 불러오기 (g1/g2/둘다). 에러 시 busy 유지(=대기). */
  const loadDraftsAndSet = useCallback(
    async (which) => {
      if (!projectId) return;
      try {
        setBusy?.(true);
        setBusyMsg?.("명세서 초안을 불러오는 중입니다…");

        const res = await httpGet(`/project/${projectId}/drafts/`);
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];

        const lower = (t) => (t || "").toLowerCase();
        const g1 =
          list.find((d) => lower(d.type) === "gemini_1" || lower(d.type) === "gemini1") ||
          list[0];
        const g2 =
          list.find((d) => lower(d.type) === "gemini_2" || lower(d.type) === "gemini2") ||
          list[1];

        const id1 = g1 ? pickDraftId(g1) : null;
        const id2 = g2 ? pickDraftId(g2) : null;
        writeDraftIds([id1, id2]);

        const toText = (d) =>
          d ? (d.content ? safePretty(d.content) : d.summary || "(내용 없음)") : "";

        if (which === "g1") {
          setSpec1?.(toText(g1));
        } else if (which === "g2") {
          setSpec2?.(toText(g2));
        } else {
          setSpec1?.(toText(g1));
          setSpec2?.(toText(g2));
        }

        // 성공 시에만 busy 해제
        setBusy?.(false);
        setBusyMsg?.("");
      } catch (e) {
        // 에러 시: alert/토스트 없이 대기 유지 (busy를 풀지 않음)
        console.error("loadDraftsAndSet error:", {
          status: e?.response?.status,
          data: e?.response?.data,
          url: e?.config?.url,
        });
      }
    },
    [projectId, httpGet, setSpec1, setSpec2, setBusy, setBusyMsg]
  );

  /** 1안/2안 생성. 에러 시 busy 유지(=대기) */
  const handleGenerate = async (which) => {
    if (!projectId) return;
    try {
      const msg =
        which === "g1" ? "기능명세서 1안 생성중입니다..." : "기능명세서 2안 생성중입니다...";
      // ✅ 글로벌 토스트만 사용
      setBusy?.(true);
      setBusyMsg?.(msg);

      const endpoint =
        which === "g1"
          ? `/project/${projectId}/generate-gemini1/`
          : `/project/${projectId}/refine-gemini2/`;

      const res = await httpPost(endpoint, {});
      const text =
        res?.data?.content ||
        res?.data?.summary ||
        (typeof res?.data === "string" ? res.data : JSON.stringify(res?.data, null, 2));
      const draftId = res?.data?.draft_id ?? res?.data?.id ?? null;

      if (which === "g1") {
        setSpec1?.(safePretty(text));
        writeDraftIds((prev = [null, null]) => {
          const [p1, p2] = Array.isArray(prev) ? prev : [null, null];
          return [draftId ?? p1, p2];
        });
        onSpec1?.(text, draftId);
      } else {
        setSpec2?.(safePretty(text));
        writeDraftIds((prev = [null, null]) => {
          const [p1, p2] = Array.isArray(prev) ? prev : [null, null];
          return [p1, draftId ?? p2];
        });
        onSpec2?.(text, draftId);
      }

      // 성공 시에만 busy 해제
      setBusy?.(false);
      setBusyMsg?.("");
    } catch (err) {
      // 에러 시: alert 없이 busy 유지(백엔드 완료 시까지 대기)
      console.error("handleGenerate error:", {
        status: err?.response?.status,
        data: err?.response?.data,
        url: err?.config?.url,
        body: err?.config?.data,
      });
    }
  };

  const isFinal1 = finalized && finalSpec === spec1;
  const isFinal2 = finalized && finalSpec === spec2;

  /** XLSX 다운로드. 에러 시 busy 유지(=대기). */
  const defaultDownload = async (which) => {
    if (!projectId) return;
    try {
      setBusy?.(true);
      setBusyMsg?.(`${which === "g1" ? "1안" : "2안"} 엑셀 다운로드 준비중...`);
      const ts = makeTs();
      const url = `/project/${projectId}/download/${which}/${ts}/`;
      const res = await api.get(url, { responseType: "arraybuffer" });

      const filename =
        parseFilename(res?.headers?.["content-disposition"]) ||
        (which === "g1" ? "기능명세서_1안.xlsx" : "기능명세서_2안.xlsx");

      const blob = new Blob([res.data], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveBlob(blob, filename);

      setBusy?.(false);
      setBusyMsg?.("");
    } catch (e) {
      console.error("defaultDownload error:", {
        status: e?.response?.status,
        data: e?.response?.data,
        url: e?.config?.url,
      });
      // 실패 시에도 busy 유지
    }
  };

  // ✅ finalize 시 draft_id 없으면 서버에서 재조회하여 보장
  const finalizeAndGoSimilar = async (which) => {
    if (!projectId) return;
    try {
      setBusy?.(true);
      setBusyMsg?.(`${which === "g1" ? "1안" : "2안"} 최종 확정 중...`);

      let [g1Id, g2Id] = localDraftIds;
      let draftId = which === "g1" ? g1Id : g2Id;

      if (!draftId) {
        // 한 번 더 서버에서 draft 목록을 가져와 보완
        const res = await api.get(`/project/${projectId}/drafts/`);
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        const lower = (t) => (t || "").toLowerCase();
        const g1 = list.find(d => lower(d.type) === "gemini_1" || lower(d.type) === "gemini1") || list[0];
        const g2 = list.find(d => lower(d.type) === "gemini_2" || lower(d.type) === "gemini2") || list[1];
        g1Id = g1?.draft_id ?? g1?.id ?? g1?.pk ?? g1Id;
        g2Id = g2?.draft_id ?? g2?.id ?? g2?.pk ?? g2Id;
        writeDraftIds([g1Id, g2Id]);
        draftId = which === "g1" ? g1Id : g2Id;
      }

      if (!draftId) {
        setBusy?.(false);
        setBusyMsg?.("");
        alert("초안 ID를 찾지 못했습니다. 먼저 ‘1안/2안 생성’ 또는 ‘명세서 보기’로 초안을 불러오세요.");
        return;
      }

      const body = { draft_id: Number(draftId) };
      await api.post(`/project/${projectId}/finalize/`, body);

      const path =
        typeof similarRouteBuilder === "function"
          ? similarRouteBuilder(projectId)
          : `/project/${projectId}/similar`;
      navigate(path);
    } catch (e) {
      console.error("finalizeAndGoSimilar error:", {
        status: e?.response?.status,
        data: e?.response?.data,
        url: e?.config?.url,
        body: e?.config?.data,
      });
      // 실패 시에도 busy 유지 (정책 유지)
    }
  };

  // ✅ 다음 → SimilarProjects 로 이동
  const goSimilarProjects = () => {
    const path =
      typeof similarRouteBuilder === "function"
        ? similarRouteBuilder(projectId)
        : `/project/${projectId}/similar`;
    navigate(path);
  };

  return (
    <div className="app-card specsheet-card" id="specs-card">
      <div className="app-card-header">
        <FileSpreadsheet className="app-card-header-icon" />
        <h3 className="app-card-title">기능명세서 생성</h3>
      </div>

      <div className="specsheet-grid">
        {/* 1안 */}
        <section className="specsheet-col">
          <div
            className="specsheet-col-title"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span>1안</span>
            <button
              className="btn-outline"
              onClick={() => handleGenerate("g1")}
              disabled={!projectId}
              title={projectId ? "1안 초안을 생성합니다." : "먼저 프로젝트를 생성하세요."}
            >
              <PlusSquare size={16} /> 1안 생성
            </button>
          </div>

          <pre className="content-box">
            {spec1 || "아직 생성/불러온 1안 명세서가 없습니다."}
          </pre>

          <div className="actions-row">
            <button
              onClick={() => loadDraftsAndSet("g1")}
              className="btn-outline"
              disabled={!projectId}
              title={projectId ? "서버에서 1안 초안을 불러옵니다." : "먼저 프로젝트를 생성하세요."}
            >
              1안 명세서 보기
            </button>
            <button
              onClick={onDownload1 ? () => onDownload1(projectId) : () => defaultDownload("g1")}
              className="btn-outline"
              disabled={!projectId}
              title="백엔드에서 생성된 1안 XLSX 파일을 다운로드합니다."
            >
              <Download size={16} /> 다운로드
            </button>
            <button
              onClick={onFinalize1 ? onFinalize1 : () => finalizeAndGoSimilar("g1")}
              className="btn-primary"
              disabled={!spec1 || finalized}
              style={{ background: isFinal1 ? "#14b8a6" : undefined }}
              title={isFinal1 ? "이미 최종으로 선택된 명세서입니다." : undefined}
            >
              {isFinal1 ? (
                <>
                  <CheckCircle2 size={16} /> 최종 선택된 명세서
                </>
              ) : (
                "최종 선택"
              )}
            </button>
          </div>
        </section>

        {/* 2안 */}
        <section className="specsheet-col">
          <div
            className="specsheet-col-title"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span>2안</span>
            <button
              className="btn-outline"
              onClick={() => handleGenerate("g2")}
              disabled={!projectId}
              title={projectId ? "2안 초안을 생성합니다." : "먼저 프로젝트를 생성하세요."}
            >
              <PlusSquare size={16} /> 2안 생성
            </button>
          </div>

          <pre className="content-box">
            {spec2 || "아직 생성/불러온 2안 명세서가 없습니다."}
          </pre>

          <div className="actions-row">
            <button
              onClick={() => loadDraftsAndSet("g2")}
              className="btn-outline"
              disabled={!projectId}
              title={projectId ? "서버에서 2안 초안을 불러옵니다." : "먼저 프로젝트를 생성하세요."}
            >
              2안 명세서 보기
            </button>
            <button
              onClick={onDownload2 ? () => onDownload2(projectId) : () => defaultDownload("g2")}
              className="btn-outline"
              disabled={!projectId}
              title="백엔드에서 생성된 2안 XLSX 파일을 다운로드합니다."
            >
              <Download size={16} /> 다운로드
            </button>
            <button
              onClick={onFinalize2 ? onFinalize2 : () => finalizeAndGoSimilar("g2")}
              className="btn-primary"
              disabled={!spec2 || finalized}
              style={{ background: isFinal2 ? "#14b8a6" : undefined }}
              title={isFinal2 ? "이미 최종으로 선택된 명세서입니다." : undefined}
            >
              {isFinal2 ? (
                <>
                  <CheckCircle2 size={16} /> 최종 선택된 명세서
                </>
              ) : (
                "최종 선택"
              )}
            </button>
          </div>
        </section>
      </div>

      {finalized && (
        <div className="finalized-banner">
          <CheckCircle2 size={16} /> 최종 명세서가 확정되었습니다.
        </div>
      )}

      {/* ✅ 다음 버튼 */}
      <div className="actions-row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button
          className="btn-success"
          onClick={goSimilarProjects}
          disabled={!projectId}
          title={projectId ? "유사 프로젝트 화면으로 이동합니다." : "먼저 프로젝트를 생성하세요."}
        >
          다음(유사 프로젝트 검증) <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}