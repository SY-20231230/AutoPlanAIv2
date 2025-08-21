import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../api/axiosInstance';
import { 
  Download, Wand2, Eye, ArrowRight,
  ChevronDown, ChevronRight, FileText, Search, RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from "react-router-dom";
import '../../styles/MainHome/SimilarProjects.css';

/* ---------- helpers ---------- */
const safePretty = (v) => {
  try {
    if (typeof v === 'string') return JSON.stringify(JSON.parse(v), null, 2);
    if (v && typeof v === 'object') return JSON.stringify(v, null, 2);
    return v ?? '';
  } catch {
    return v ?? '';
  }
};
const pickText = (item) =>
  item?.content ?? item?.body ?? item?.details ?? item?.description ?? item?.summary ?? '';

const orderValue = (it) => {
  const cands = [
    it?.order, it?.sequence, it?.seq, it?.index, it?.position,
    it?.sort_order, it?.sort, it?.step, it?.priority, it?.id,
  ];
  for (const v of cands) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return Number.MAX_SAFE_INTEGER;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 특정 URL에서 텍스트 응답을 안전하게 추출 */
async function getTextFrom(url) {
  try {
    const res = await api.get(url, {
      responseType: 'text',
      transformResponse: [d => d],
    });
    if (typeof res?.data === 'string' && res.data.trim().length > 0) return res.data;
  } catch (e) {
    throw e;
  }
  const res2 = await api.get(url);
  const d = res2?.data;
  if (!d) return '';
  if (typeof d === 'string') return d;
  return d.markdown ?? d.text ?? d.content ?? d.body ?? JSON.stringify(d, null, 2);
}

/* ---------- 공용 Card ---------- */
function Card({ title, right = null, children }) {
  return (
    <div className="similar-card">
      <div className="similar-card-head">
        <h4 className="title">{title}</h4>
        <div style={{ display: 'inline-flex', gap: 8 }}>{right}</div>
      </div>
      {children}
    </div>
  );
}

/* ---------- 토글 행(최종 기능/MD 결과 공용) ---------- */
function ToggleRow({ title, children, defaultOpen = false, maxHeight = 420 }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="similar-toggle-head"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="similar-toggle-title">{title}</span>
      </button>

      {open && (
        <div className="similar-toggle-body" style={{ maxHeight, overflow: 'auto' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------- Markdown 프리뷰 패널 ---------- */
function MarkdownViewer({ text }) {
  const [mode, setMode] = useState('preview'); // 'preview' | 'raw'

  if (!text) return null;

  return (
    <div className="md-wrapper">
      <div className="md-toolbar">
        <div className="spacer" />
        <div className="segmented">
          
        </div>
      </div>

      {mode === 'preview' ? (
        <div className="md-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {text}
          </ReactMarkdown>
        </div>
      ) : (
        <pre className="similar-toggle-pre">{text}</pre>
      )}
    </div>
  );
}

/* ---------- 페이지 ---------- */
export default function SimilarProjects({ projectId }) {
  const [loadingConfirmed, setLoadingConfirmed] = useState(true);
  const [errorConfirmed, setErrorConfirmed] = useState(null);
  const [finalRequirements, setFinalRequirements] = useState([]);

  const [postBusy, setPostBusy] = useState(false);
  const [getBusy, setGetBusy]   = useState(false);

  const [mdLoading, setMdLoading] = useState(false);
  const [mdError, setMdError] = useState(null);
  const [mdText, setMdText] = useState('');
  const [mdFilename, setMdFilename] = useState('latest.md');

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const cancelRef = useRef(false);
  const navigate = useNavigate();
  const isNonEmpty = (v) => Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim().length);

  // ===== 확정 기능 명세 GET =====
  const fetchConfirmed = useCallback(async () => {
    try {
      setLoadingConfirmed(true);
      setErrorConfirmed(null);
      const res = await api.get(`/project/${projectId}/requirements/confirmed/`);
      const data = res?.data;
      const items = Array.isArray(data) ? data : (data?.results || data?.items || []);
      const normalized = (items || [])
        .map((it) => {
          const text = pickText(it);
          return {
            ...it,
            __displayText: safePretty(text),
            __order__: orderValue(it),
          };
        })
        .sort((a, b) => a.__order__ - b.__order__);
      if (!cancelRef.current) setFinalRequirements(normalized);
    } catch (e) {
      if (!cancelRef.current) {
        setErrorConfirmed(e?.message || '확정된 기능 명세서를 불러오지 못했습니다.');
        setFinalRequirements([]);
      }
    } finally {
      if (!cancelRef.current) setLoadingConfirmed(false);
    }
  }, [projectId]);

  // ===== 최신 MD RAW GET =====
  const fetchLatestReportMd = useCallback(async (opts = {}) => {
    const { retries = 0 } = opts;
    const candidatePaths = [
      `/project/${projectId}/reports/latest/raw/`,
      `/project/${projectId}/similar-projects/latest/raw/`,
      `/project/${projectId}/reports/latest/`,
      `/project/${projectId}/similar-projects/report/`,
    ];

    try {
      setMdLoading(true);
      setMdError(null);

      let text = '';
      let lastErr = null;
      for (const p of candidatePaths) {
        try {
          text = await getTextFrom(p);
          if (text && typeof text === 'string') {
            lastErr = null;
            break;
          }
        } catch (e) {
          lastErr = e;
          if (e?.response?.status !== 404) throw e;
        }
      }

      if (lastErr && lastErr?.response?.status === 404) {
        if (retries < 2) {
          await sleep(1000);
          if (!cancelRef.current) {
            return await fetchLatestReportMd({ retries: retries + 1 });
          }
          return;
        }
        throw Object.assign(new Error('보고서가 아직 생성되지 않았습니다.'), { code: 'NO_REPORT_404' });
      }

      if (!cancelRef.current) {
        setMdText(text || '');
        setMdFilename('latest.md');
      }
    } catch (e) {
      if (!cancelRef.current) {
        const is404 = e?.response?.status === 404 || e?.code === 'NO_REPORT_404';
        const message = is404
          ? '아직 생성된 유사성 보고서가 없습니다. 먼저 “생성하기”를 눌러주세요.'
          : (e?.response?.data?.detail || e.message || '유사성 보고서를 불러오지 못했습니다.');
        setMdError(message);
        setMdText('');
      }
    } finally {
      if (!cancelRef.current) setMdLoading(false);
    }
  }, [projectId]);

  // ===== 생성하기 =====
  const handleCreateSimilar = useCallback(async () => {
    if (!projectId || postBusy) return;
    try {
      setPostBusy(true);
      setMdText('');
      setMdError(null);

      setToastMsg('유사성 프로젝트를 검색하는 중입니다…');
      setToastOpen(true);

      await api.post(`/project/${projectId}/similar-projects/`, {});
      await fetchLatestReportMd({ retries: 0 });

      setTimeout(() => setToastOpen(false), 2000);
    } catch (e) {
      if (!cancelRef.current) {
        setMdError(e?.response?.data?.detail || e.message || '유사성 분석 시작에 실패했습니다.');
        setMdText('');
        setTimeout(() => setToastOpen(false), 1500);
      }
    } finally {
      if (!cancelRef.current) setPostBusy(false);
    }
  }, [projectId, postBusy, fetchLatestReportMd]);

  // ===== 결과보기 =====
  const handleViewSimilar = useCallback(async () => {
    if (!projectId || getBusy) return;
    setGetBusy(true);

    setToastMsg('유사성 결과를 불러오는 중…');
    setToastOpen(true);

    await fetchLatestReportMd({ retries: 0 });

    setGetBusy(false);
    setTimeout(() => setToastOpen(false), 1500);
  }, [projectId, getBusy, fetchLatestReportMd]);

  // ===== MD 저장 =====
  const downloadMd = useCallback(() => {
    if (!mdText) return;
    const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mdFilename || 'similar_report.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [mdText, mdFilename]);

 const goTeamAssign = () => {
    navigate(`/project/${projectId}/team-assign`);
  };


  // 초기 로드
  useEffect(() => {
    cancelRef.current = false;
    fetchConfirmed();
    return () => { cancelRef.current = true; };
  }, [fetchConfirmed]);

  return (
    <div className="similar-root">
      {toastOpen && (
        <div className="similar-toast" role="status" aria-live="polite">
          {toastMsg || '처리 중…'}
        </div>
      )}

      {/* 카드 1: 최종 기능 명세서 */}
      <Card
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FileText size={18} color="#2563eb" /> 최종 기능 명세서
          </span>
        }
        right={loadingConfirmed ? <span className="badge-light">불러오는 중…</span> : null}
      >
        {errorConfirmed && (
          <div className="similar-empty" style={{ borderStyle: 'solid' }}>{errorConfirmed}</div>
        )}
        {!loadingConfirmed && (finalRequirements?.length ?? 0) === 0 && !errorConfirmed && (
          <div className="similar-empty">확정된 기능 명세가 없습니다.</div>
        )}
        {!loadingConfirmed && (finalRequirements?.length ?? 0) > 0 && (
          <div>
            {finalRequirements.map((req, idx) => (
              <ToggleRow
                key={req.id || `${req.feature_name || 'feature'}-${idx}`}
                title={`최종기능_${idx + 1}${req.feature_name ? ` · ${req.feature_name}` : ''}`}
                defaultOpen={false}
                maxHeight={320}
              >
                <pre className="similar-toggle-pre">
                  {isNonEmpty(req.__displayText) ? req.__displayText : ''}
                </pre>
              </ToggleRow>
            ))}
          </div>
        )}
      </Card>

      {/* 카드 2: 유사성 검증 */}
      <Card
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Search size={18} color="#2563eb" /> 유사성 검증
          </span>
        }
        right={
          <>
            <button className="btn-outline" onClick={handleCreateSimilar} disabled={postBusy}>
              {postBusy ? <RefreshCw size={14} className="spin" /> : <Wand2 size={14} color="#2563eb" />}
              {postBusy ? ' 생성 중…' : ' 생성하기'}
            </button>
            <button className="btn-outline" onClick={handleViewSimilar} disabled={getBusy}>
              {getBusy || mdLoading
                ? <RefreshCw size={14} className="spin" />
                : <Eye size={14} color="#2563eb" />}
              {getBusy || mdLoading ? ' 불러오는 중…' : ' 결과보기'}
            </button>
          </>
        }
      >
        <div style={{ marginTop: 12 }}>
          {(mdLoading && !postBusy && !getBusy) && <div className="similar-empty">보고서 불러오는 중…</div>}
          {mdError && <div className="similar-empty" style={{ borderStyle: 'solid' }}>{mdError}</div>}

          {mdText && !mdLoading && !mdError && (
            <>
              <ToggleRow title="유사성 검증 결과" defaultOpen={true} maxHeight={420}>
                <MarkdownViewer text={mdText} />
              </ToggleRow>
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <button className="btn-outline" onClick={downloadMd}>
                  <Download size={14} /> .md 저장
                </button>
              </div>
            </>
          )}
        </div>

        <div className="similar-footer" style={{ textAlign: "right", marginTop: 12 }}>
           <button className="btn-success" onClick={goTeamAssign}>
          다음 (팀원 역할 분배) <ArrowRight size={16} />
        </button>
        </div>
      </Card>
    </div>
  );
}