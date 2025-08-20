// src/components/MainHome/GanttEdit.jsx
import React, { useEffect, useState } from 'react';
import { CalendarDays, Download } from 'lucide-react';
import api, { API_BASE } from '../../api/axiosInstance';
import GanttChart from './GanttChart';
import '../../styles/MainHome/GanttEdit.css';

// 파일 다운로드용 루트 (…/api 제거)
const API_ROOT = API_BASE.replace(/\/api\/?$/, '');

const GanttEdit = ({ projectId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [docId,     setDocId]     = useState(null);
  const [busy,      setBusy]      = useState(false);

  const [tasks, setTasks] = useState([
    { id: 1, name: 'erd 설계 및 코드 작성',  start: 0, duration: 14, color: '#fbbf24', part: '백엔드' },
    { id: 2, name: '데이터 수집 및 모델 개발', start: 0, duration: 21, color: '#3b82f6', part: '하드웨어' },
    { id: 3, name: '기능명세서+UI+퍼블리싱', start: 0, duration: 28, color: '#10b981', part: '프론트엔드' },
  ]);

  // 🔎 생성 이력
  const [history, setHistory] = useState([]); // [{id, created_at, filename}, ...]

  const handleTaskChange = (id, field, value) => {
    setTasks(prev => prev.map(task => (task.id === id ? { ...task, [field]: value } : task)));
  };

  // ===== 간트차트 생성(.xlsx) =====
  const handleSaveGantt = async () => {
    if (!projectId) return alert('projectId가 없습니다.');
    if (!startDate || !endDate) return alert('시작일/마감일을 선택해주세요.');
    setBusy(true);
    try {
      // ✅ POST /api/project/{project_id}/gantt/
      const res = await api.post(`/project/${projectId}/gantt/`, {
        start_date: startDate,
        end_date: endDate,
        tasks: tasks.map(t => ({
          id: t.id,
          name: t.name,
          start_offset_days: t.start,
          duration_days: t.duration,
          part: t.part,
          color: t.color,
        })),
      });
      const newDocId = res?.data?.doc_id ?? res?.data?.id;
      if (!newDocId) throw new Error('doc_id를 찾을 수 없습니다.');
      setDocId(newDocId);
      alert('간트차트 파일이 생성되었습니다.');
      // 생성 후 이력 갱신
      await fetchHistory();
    } catch (e) {
      console.error('간트차트 생성 실패:', e?.response?.data || e.message);
      alert(e?.response?.data?.detail || e.message || '간트차트 생성에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  // ===== 생성된 파일 다운로드 =====
  const handleDownload = () => {
    if (!docId) return alert('다운로드할 문서가 없습니다.');
    // ✅ GET /api/gantt/download/{doc_id}/
    window.location.href = `${API_ROOT}/gantt/download/${docId}/`;
  };

  // ===== 생성 이력 조회 =====
  const fetchHistory = async () => {
    if (!projectId) return;
    try {
      // ✅ GET /api/project/{project_id}/gantt/list/
      const res = await api.get(`/project/${projectId}/gantt/list/`);
      const items = Array.isArray(res?.data) ? res.data : (res?.data?.results || []);
      setHistory(items);
    } catch (e) {
      console.error('간트 이력 조회 실패:', e?.response?.data || e.message);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [projectId]);

  return (
    <div className="ganttedit-container app-card">
      {/* 헤더 */}
      <div className="app-card-header">
        <CalendarDays className="app-card-header-icon" />
        <h3 className="app-card-title">간트 차트 편집</h3>
      </div>

      {/* 상단 컨트롤 바 */}
      <div className="ganttedit-controls">
        <label className="ganttedit-label">
          시작일
          <input
            className="ganttedit-date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </label>
        <label className="ganttedit-label">
          마감일
          <input
            className="ganttedit-date"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </label>

        <div className="ganttedit-actions">
          <button onClick={handleSaveGantt} disabled={busy} className="btn-primary">
            {busy ? '생성 중…' : '간트차트 생성(.xlsx)'}
          </button>
          <button onClick={handleDownload} disabled={!docId} className="btn-success">
            다운로드
          </button>
        </div>
      </div>

      {/* 태스크 간단 에디터 */}
      <div className="ganttedit-tasklist">
        {tasks.map(task => (
          <div key={task.id} className="ganttedit-taskrow">
            <div className="ganttedit-taskmeta">
              <strong className="ganttedit-part">{task.part}</strong>
              <span className="ganttedit-name">— {task.name}</span>
            </div>
            <div className="ganttedit-editors">
              <input
                className="ganttedit-inputnum"
                type="number"
                value={task.start}
                min={0}
                onChange={e => handleTaskChange(task.id, 'start', Number(e.target.value))}
                placeholder="시작(일)"
              />
              <input
                className="ganttedit-inputnum"
                type="number"
                value={task.duration}
                min={1}
                onChange={e => handleTaskChange(task.id, 'duration', Number(e.target.value))}
                placeholder="기간(일)"
              />
            </div>
          </div>
        ))}
      </div>

      {/* 간트 미리보기/동작 */}
      <GanttChart
        projectId={projectId}
        tasks={tasks}
        onSaveGantt={handleSaveGantt}
        onGenerateFinal={() => console.log('최종 문서 생성')}
      />

      {/* ===== 생성 이력 섹션 ===== */}
      <div className="ganttedit-history">
        <h4>생성 이력</h4>
        {history.length === 0 ? (
          <div className="ganttedit-history-empty">아직 생성된 간트 파일이 없습니다.</div>
        ) : (
          <ul className="ganttedit-history-list">
            {history.map((item) => {
              const id = item.doc_id || item.id || item.document_id;
              const filename = item.filename || `gantt_${id}.xlsx`;
              const createdAt = item.created_at || item.created || item.timestamp;
              return (
                <li key={id} className="ganttedit-history-item">
                  <div className="ganttedit-history-meta">
                    <strong>{filename}</strong>
                    {createdAt && <span className="ganttedit-history-date"> • {new Date(createdAt).toLocaleString()}</span>}
                  </div>
                  <button
                    className="ganttedit-history-download"
                    onClick={() => window.open(`${API_ROOT}/gantt/download/${id}/`, '_blank')}
                    title="다운로드"
                  >
                    <Download size={16} />
                    다운로드
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default GanttEdit;