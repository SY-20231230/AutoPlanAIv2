import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Clock, Download, Calendar, Wand2, Eye, SlidersHorizontal, ArrowRight } from 'lucide-react';
import api, { API_BASE } from '../../api/axiosInstance';
import '../../styles/MainHome/GanttChart.css';

/* ===== 유틸 ===== */
const toISO = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const addDaysISO = (startISO, i) => { const d = new Date(startISO); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10); };
const addDaysLabel = (startISO, i) => { const d = new Date(startISO); d.setDate(d.getDate() + i); return `${d.getMonth() + 1}/${d.getDate()}`; };
const groupBy = (arr, key) => arr.reduce((m, v) => ((m[v[key] || '기타'] ??= []).push(v), m), {});
const isDateYYYYMMDD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

/* ===== 다운로드 유틸 ===== */
const getFilenameFromCD = (cd, fallback) => {
  if (!cd) return fallback;
  const mStar = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (mStar?.[1]) return decodeURIComponent(mStar[1]);
  const m = /filename="?([^"]+)"?/i.exec(cd);
  return m?.[1] ? decodeURIComponent(m[1]) : fallback;
};
const saveBlob = (blob, suggested = 'download') => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = suggested || 'download';
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
};
const downloadById = async (id, fallbackName = 'gantt.xlsx') => {
  const res = await api.get(`/gantt/download/${id}/`, { responseType: 'blob' });
  const name = getFilenameFromCD(res?.headers?.['content-disposition'], fallbackName);
  saveBlob(res.data, name);
};
const downloadByFilename = async (filename) => {
  const res = await api.get(`/gantt/file/${encodeURIComponent(filename)}/`, { responseType: 'blob' });
  const name = getFilenameFromCD(res?.headers?.['content-disposition'], filename);
  saveBlob(res.data, name);
};
const joinPublicUrl = (raw, apiBase) => {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return raw;
  const left = (apiBase || '').replace(/\/+$/,'');
  const right = String(raw).replace(/^\/+/, '');
  return `${left}/${right}`;
};
const openPublicIfExists = async (rawUrl) => {
  const href = joinPublicUrl(rawUrl, API_BASE);
  try {
    const r = await fetch(href, { method: 'HEAD', credentials: 'include' });
    if (r.ok) { window.open(href, '_blank'); return true; }
  } catch {}
  return false;
};

/* ===== 파트별 색상 ===== */
const colorForPart = (part) => {
  if (!part) return '#9ca3af';
  if (part.includes('백엔드')) return '#a78bfa';
  if (part.includes('프론트')) return '#93c5fd';
  if (part.includes('AI') || part.includes('인공지능')) return '#60a5fa';
  if (part.includes('데이터')) return '#86efac';
  return '#9ca3af';
};

export default function GanttChart({
  projectId,
  tasks: externalTasks = [],
  startDate: externalStart = null,
  endDate: externalEnd = null,
  partsOrder,
  filename = 'gantt.csv',
  onSetDates = () => {},
  onSave = () => {},
  onSaveGantt,
}) {
  const navigate = useNavigate();
  const goFinalDoc = () => {
  if (!projectId) {
    alert("먼저 프로젝트를 생성하세요.");
    return;
  }
  navigate(`/project/${projectId}/final-doc`);
};

  /* ===== 로컬 상태 ===== */
  const [tasks, setTasks] = useState([]);
  const [startDateStr, setStartDateStr] = useState(toISO(externalStart) || toISO(new Date()));
  const [totalWeeks, setTotalWeeks] = useState(12);
  const [partsInput, setPartsInput] = useState('백엔드,프론트엔드,인공지능,운영');
  const [filePrefix, setFilePrefix] = useState('오토플랜_1차간트');
  const [dateOpen, setDateOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  /* 생성 결과 식별자 */
  const [genDocId, setGenDocId] = useState(null);
  const [genFilename, setGenFilename] = useState(null);
  const [genPublicUrl, setGenPublicUrl] = useState(null);

  /* 최신 메타(보기) */
  const [latestMeta, setLatestMeta] = useState(null);

  /* 외부 task 동기화 */
  useEffect(() => {
    if (!Array.isArray(externalTasks) || !externalTasks.length) return;
    setTasks(externalTasks.map(t => ({ ...t })));
  }, [externalTasks]);

  /* 기간 계산 */
  const totalDaysLocal = useMemo(() => Math.max(0, (Number(totalWeeks) || 0) * 7), [totalWeeks]);
  const displayEnd = useMemo(() => {
    const td = latestMeta ? latestMeta.total_weeks * 7 : totalDaysLocal;
    const base = latestMeta ? latestMeta.start_date : startDateStr;
    if (!isDateYYYYMMDD(base) || td <= 0) return '';
    return addDaysISO(base, td - 1);
  }, [startDateStr, totalDaysLocal, latestMeta]);

  /* 초기 옵션 모달 */
  useEffect(() => { if (!externalStart || !externalEnd) setDateOpen(true); }, [externalStart, externalEnd]);

  /* 스크롤 싱크 */
  const dayWidth = 40;
  const totalDays = latestMeta ? latestMeta.total_weeks * 7 : totalDaysLocal;
  const canvasWidth = totalDays * dayWidth;
  const headerScrollRef = useRef(null);
  const bodyScrollRefs = useRef([]);
  const syncScroll = (src, x) => {
    if (src !== headerScrollRef.current && headerScrollRef.current) headerScrollRef.current.scrollLeft = x;
    bodyScrollRefs.current.forEach((el) => { if (el && el !== src) el.scrollLeft = x; });
  };

  /* 보기 위치로 스크롤 */
  const chartRef = useRef(null);
  const focusChart = () => chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /* 그룹핑 */
  const grouped = useMemo(() => groupBy(tasks, 'part'), [tasks]);
  const partKeys = useMemo(() => {
    const keys = Object.keys(grouped);
    if (Array.isArray(partsOrder) && partsOrder.length) {
      const orderSet = new Set(partsOrder);
      const ordered = partsOrder.filter(k => keys.includes(k));
      const rest = keys.filter(k => !orderSet.has(k));
      return [...ordered, ...rest];
    }
    return keys;
  }, [grouped, partsOrder]);

  /* CSV */
  const generateCSV = () => {
    const header = ['part','task','start_index','duration','color'];
    const rows = [header];
    tasks.forEach(t => rows.push([t.part || '기타', t.name || '', String(Number(t.start) || 0), String(Math.max(1, Number(t.duration) || 1)), t.color || '']));
    const csv = rows.map(cols => cols.map(v => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    return csv;
  };
  const downloadCSV = () => {
    const blob = new Blob(["\uFEFF" + generateCSV()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename || 'gantt.csv';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  /* 서버 바디 구성 */
  const parseParts = (raw) => Array.isArray(raw)
    ? raw.filter(Boolean).map(String).map(s => s.trim()).filter(Boolean)
    : String(raw || '').split(',').map(s => s.trim()).filter(Boolean);

  const formValidations = () => {
    const base = startDateStr;
    if (!isDateYYYYMMDD(base)) return '시작일은 YYYY-MM-DD 형식이어야 합니다.';
    const tw = Number(totalWeeks);
    if (!Number.isInteger(tw) || tw < 1) return '총 주차(total_weeks)는 1 이상의 정수여야 합니다.';
    const partsArr = parseParts(partsInput);
    if (!partsArr.length) return '파트 목록(parts)이 비어있습니다.';
    return null;
  };

  /* 1) 생성 */
  const handleGenerate = async () => {
    if (!projectId) return;
    const err = formValidations();
    if (err) return alert(err);

    const body = {
      start_date: startDateStr,
      total_weeks: Number(totalWeeks),
      parts: parseParts(partsInput),
      ...(filePrefix?.trim() ? { filename: filePrefix.trim() } : {}),
    };

    try {
      setPosting(true);
      const res = await api.post(`/project/${projectId}/gantt/`, body);
      const data = res?.data || {};
      setGenDocId(data.doc_id || data.id || data.document_id || null);
      setGenFilename(data.filename || data.file_name || data.path_name || null);
      setGenPublicUrl(data?.files?.xlsx || data?.public_media_url || null);
      alert('간트차트를 생성했습니다. 이제 아래 버튼으로 내려가서 다운로드/보기 하세요.');
    } catch (e) {
      alert(e?.response?.data?.detail || e?.response?.data?.message || e.message || '간트 차트 생성 실패');
    } finally {
      setPosting(false);
    }
  };

  /* 2) 보기 */
  const handleViewLatest = async () => {
    if (!projectId) return;
    try {
      const res = await api.get(`/project/${projectId}/gantt/latest/tasks/`);
      const data = res?.data || {};
      if (!data?.tasks || !Array.isArray(data.tasks)) {
        alert('표시할 간트 데이터가 없습니다.');
        return;
      }
      setLatestMeta({
        gantt_id: data.gantt_id,
        start_date: data.start_date,
        total_weeks: Number(data.total_weeks || 0),
        parts: data.parts || [],
      });
      const mapped = data.tasks.map(t => ({
        id: t.id,
        part: t.part || '기타',
        name: t.feature_name || '기능',
        start: Math.max(0, (Number(t.start_week || 1) - 1) * 7),
        duration: Math.max(1, Number(t.duration_weeks || 1) * 7),
        color: colorForPart(t.part),
      }));
      setTasks(mapped);
      focusChart();
    } catch (e) {
      alert(e?.response?.data?.detail || e.message || '최신 간트 데이터를 불러오지 못했습니다.');
    }
  };

  /* 3) 엑셀 다운로드 */
  const handleDownloadXlsx = async () => {
    try {
      if (genDocId) { await downloadById(genDocId, genFilename || 'gantt.xlsx'); return; }
      if (genFilename) { await downloadByFilename(genFilename); return; }
      if (genPublicUrl) {
        const ok = await openPublicIfExists(genPublicUrl);
        if (ok) return;
      }
      alert('먼저 "간트차트 생성"을 눌러 파일을 만든 뒤 다운로드하세요.');
    } catch (e) {
      alert(e?.response?.data?.detail || e.message || '다운로드 실패');
    }
  };

  /* 타임라인 기준 */
  const timelineStart = latestMeta ? latestMeta.start_date : startDateStr;
  const canGenerate = !formValidations() && !posting;

  return (
    <div className="gantt-container app-card">
      {/* ===== 타이틀 + 구분선 ===== */}
      <div className="gantt-page-title">
        <BarChart3 className="gantt-page-title__icon" />
        <h3>간트차트</h3>
      </div>
      <div className="card-divider" />

      {/* ===== 기간 요약(위 줄) ===== */}
      <div className="gantt-summary">
        <Clock size={18} />
        <span className="gantt-date-text">
          {timelineStart} ~ {displayEnd || '—'} · 총 {(latestMeta ? latestMeta.total_weeks*7 : totalDaysLocal) || 0}일
        </span>
      </div>

      {/* ===== 버튼 4개 (아래 줄, 넓게) ===== */}
      <div className="gantt-buttons-row">
        <button className="btn-lg btn-light" onClick={() => setDateOpen(true)}>
          <SlidersHorizontal size={18} />
          간트차트 옵션 설정
        </button>

        <button className="btn-lg btn-primary" onClick={handleGenerate} disabled={!canGenerate} title="시작일·총주차·파트 설정 후 생성">
          <Wand2 size={18} />
          간트차트 생성
        </button>

        <button className="btn-lg btn-light" onClick={handleViewLatest}>
          <Eye size={18} />
          간트차트 보기
        </button>

        <button className="btn-lg btn-light" onClick={handleDownloadXlsx}>
          <Download size={18} />
          엑셀 다운로드
        </button>
      </div>

      {/* ===== 타임라인 헤더 ===== */}
      <div ref={chartRef} className="timeline-header">
        <div className="task-column">작업</div>
        <div
          className="grid-scroll"
          ref={headerScrollRef}
          onScroll={(e) => syncScroll(e.currentTarget, e.currentTarget.scrollLeft)}
        >
          <div className="grid-width" style={{ width: `${canvasWidth}px` }}>
            <div className="days-row">
              {Array.from({ length: totalDays }, (_, i) => (
                <div key={i} className="day-cell">
                  {isDateYYYYMMDD(timelineStart) ? addDaysLabel(timelineStart, i) : i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== 파트 섹션들 ===== */}
      <div className="gantt-chart">
        {Object.keys(grouped).length === 0 && (
          <div className="gantt-empty">표시할 작업이 없습니다. “간트차트 보기”를 눌러 최신 간트를 불러와 주세요.</div>
        )}

        {Object.keys(grouped).length > 0 && partKeys.map((part, idx) => (
          <div key={part} className="part-section">
            <div className="part-header">
              <span className="part-badge" style={{ background: colorForPart(part) + '22', color: '#1f2937' }}>
                {part}
              </span>
            </div>

            {(grouped[part] || []).map((task) => (
              <div key={task.id} className="task-row">
                <div className="task-name">
                  <div className="task-title">{task.name}</div>
                  <div className="task-part">{task.part}</div>
                </div>

                <div
                  className="grid-scroll"
                  ref={(el) => (bodyScrollRefs.current[idx] = el)}
                  onScroll={(e) => syncScroll(e.currentTarget, e.currentTarget.scrollLeft)}
                >
                  <div className="grid-width" style={{ width: `${canvasWidth}px` }}>
                    <div className="timeline">
                      <div
                        className="task-bar"
                        style={{
                          left: `${(Number(task.start) || 0) * 40}px`,
                          width: `${(Math.max(1, Number(task.duration) || 1)) * 40}px`,
                          backgroundColor: task.color || '#9ca3af',
                        }}
                      >
                        {(Number(task.duration) || 1)}일
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ===== 옵션 모달 ===== */}
      {dateOpen && (
        <div className="modal-backdrop" onClick={() => setDateOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h4>간트 옵션 설정</h4>

            <div className="row">
              <label>시작일 (YYYY-MM-DD)</label>
              <input type="date" value={startDateStr} onChange={(e) => setStartDateStr(e.target.value)} />
            </div>

            <div className="row">
              <label>개발 진행 기간(주차)</label>
              <input
                type="number"
                min={1}
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(Math.max(1, Number(e.target.value) || 1))}
                placeholder="예: 12"
              />
            </div>

            <div className="row">
              <label>파트 목록 (콤마로 구분)</label>
              <input
                type="text"
                value={partsInput}
                onChange={(e) => setPartsInput(e.target.value)}
                placeholder="예: 백엔드,프론트엔드,인공지능,운영"
              />
            </div>

            <div className="row">
              <label>파일명</label>
              <input
                type="text"
                value={filePrefix}
                onChange={(e) => setFilePrefix(e.target.value)}
                placeholder="예: 오토플랜_1차간트"
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn primary"
                onClick={() => {
                  const err = formValidations();
                  if (err) return alert(err);
                  onSetDates({
                    startDate: startDateStr,
                    endDate: displayEnd,
                    totalDays: latestMeta ? latestMeta.total_weeks * 7 : totalDaysLocal,
                    totalWeeks: Number(totalWeeks),
                    parts: parseParts(partsInput),
                    filename: filePrefix?.trim() || undefined,
                  });
                  setDateOpen(false);
                }}
              >
                확인
              </button>
             
        
            </div>
          </div>
        </div>
      )}
      <div className="similar-footer" style={{ textAlign: "right", marginTop: 12 }}>
  <button className="btn-success" onClick={goFinalDoc}>
    다음 (연구개발계획서 생성) <ArrowRight size={16} />
  </button>
</div>
    </div>
  );
}