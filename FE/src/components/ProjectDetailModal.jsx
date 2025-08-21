// src/components/ProjectDetailModal.jsx
import React, { useMemo, useState } from 'react';
import '../styles/ProjectDetailModal.css';

const toISO = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const daysBetween = (s, e) => {
  if (!s || !e) return null;
  const ms = (new Date(toISO(e)) - new Date(toISO(s))) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.floor(ms) + 1);
};

const shallowEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 팀 행: 이름, 포지션, 맡은 역할(duty), 역할(팀장/팀원)
const defaultTeamRow = { name: '', position: '', duty: '', role: 'LEADER' };

export default function ProjectDetailModal({ project, onClose, onSave }) {
  const isTeam = project?.mode === 'TEAM' || project?.isTeam === true;

  // 초기값 (없으면 더미로 보완)
  const init = {
    name: project?.name || project?.title || '새 프로젝트',
    startDate: project?.startDate || '',
    endDate: project?.endDate || '',
    status: project?.status || 'active', // active | completed | onhold
    files:
      Array.isArray(project?.files) && project.files.length
        ? project.files
        : [
            { name: '기획서_v1.docx', type: '기획서', uploadedAt: '2025-08-10' },
            { name: '기능명세서_1안.csv', type: '명세서', uploadedAt: '2025-08-11' },
            { name: '기능명세서_최종.csv', type: '명세서(최종)', uploadedAt: '2025-08-12' },
            { name: '최종문서.docx', type: '최종문서', uploadedAt: '2025-08-13' },
          ],
    team:
      Array.isArray(project?.team) && project.team.length
        ? project.team.map((m, idx) => ({
            name: m.name || '',
            position: m.position || '',
            duty: m.duty || m.responsibility || '',
            role:
              m.role === 'LEADER' || m.role === 'MEMBER'
                ? m.role
                : idx === 0
                ? 'LEADER'
                : 'MEMBER',
          }))
        : [{ name: '김철수', position: 'Backend', duty: 'API 설계', role: 'LEADER' }],
  };

  // 상태
  const [name, setName] = useState(init.name);
  const [startDate, setStartDate] = useState(init.startDate);
  const [endDate, setEndDate] = useState(init.endDate);
  const [status, setStatus] = useState(init.status);
  const [files, setFiles] = useState(init.files);
  const [team, setTeam] = useState(init.team);
  const [saveMessage, setSaveMessage] = useState('');

  // 변경 감지
  const isChanged = useMemo(() => {
    return !shallowEqual(
      { name, startDate, endDate, status, files, team },
      init
    );
  }, [name, startDate, endDate, status, files, team]);

  const totalDays = daysBetween(startDate, endDate);

  // 파일: 목록에서 제거만 허용(추가는 API 연동 시 붙이면 됨)
  const removeFile = (idx) => setFiles((p) => p.filter((_, i) => i !== idx));

  // 팀 편집기
  const changeTeam = (i, key, val) =>
    setTeam((prev) => prev.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));

  const setRole = (i, role) => {
    setTeam((prev) => {
      const next = prev.map((m, idx) => (idx === i ? { ...m, role } : m));
      const needLeaderConstraint = isTeam || next.length > 1;
      if (needLeaderConstraint) {
        const leaderCount = next.filter((m) => m.role === 'LEADER').length;
        if (leaderCount === 0) {
          alert('팀장은 최소 1명 이상이어야 합니다.');
          return prev;
        }
      }
      return next;
    });
  };

  const addTeam = () =>
    setTeam((prev) => [
      ...prev,
      { ...defaultTeamRow, role: prev.length === 0 ? 'LEADER' : 'MEMBER' },
    ]);

  const removeTeam = (i) => {
    setTeam((prev) => {
      if (prev.length <= 1) return prev;
      const removingLeader = prev[i].role === 'LEADER';
      const otherLeaders = prev.filter((_, idx) => idx !== i && _.role === 'LEADER').length;
      const needLeaderConstraint = isTeam || prev.length > 1;
      if (needLeaderConstraint && removingLeader && otherLeaders === 0) {
        alert('팀장은 최소 1명 이상이어야 합니다.');
        return prev;
      }
      return prev.filter((_, idx) => idx !== i);
    });
  };

  // 저장
  const handleSave = () => {
    const needLeaderConstraint = isTeam || team.length > 1;
    if (needLeaderConstraint) {
      const leaderCount = team.filter((m) => m.role === 'LEADER').length;
      if (leaderCount < 1) return alert('팀장은 최소 1명 이상이어야 합니다.');
    }
    onSave?.({
      ...project,
      name,
      startDate,
      endDate,
      status,
      files,
      team,
      mode: isTeam ? 'TEAM' : project?.mode || 'PERSONAL',
    });
    setSaveMessage('변경되었습니다!');
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content large">
        {/* 헤더 */}
        <div className="pdm-header">
          <h2 style={{ margin: 0 }}>프로젝트 수정</h2>
          <button className="pdm-close" onClick={onClose}>×</button>
        </div>

        {/* 프로젝트 기본 정보 */}
        <label>프로젝트명</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="프로젝트명을 입력하세요"
        />

        {/* 기간/상태/총기간 */}
        <div className="pdm-grid">
          <div className="pdm-col">
            <label>시작일</label>
            <input type="date" value={toISO(startDate)} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="pdm-col">
            <label>마감일</label>
            <input type="date" value={toISO(endDate)} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="pdm-col">
            <label>총 기간</label>
            <div className="pdm-static">{totalDays ? `${totalDays}일` : '-'}</div>
          </div>
          <div className="pdm-col">
            <label>진행 상태</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">진행중</option>
              <option value="completed">완료</option>
              <option value="onhold">보류</option>
            </select>
          </div>
        </div>

        {/* 저장된 파일 목록 */}
        <div className="pdm-section-title" style={{ marginTop: 10 }}>
          저장된 파일 목록
        </div>
        <div className="pdm-file-list">
          {files.length === 0 ? (
            <div className="pdm-muted">저장된 파일이 없습니다.</div>
          ) : (
            files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="pdm-file-row">
                <div className="pdm-file-main">
                  <div className="pdm-file-name">{f.name}</div>
                  <div className="pdm-file-sub">
                    {f.type || '파일'} · {f.uploadedAt || '-'}
                  </div>
                </div>
                <button
                  className="mini-btn"
                  onClick={() => removeFile(i)}
                  title="목록에서 제거"
                >
                  삭제
                </button>
              </div>
            ))
          )}
        </div>

        {/* 팀: 이름 / 포지션 / 맡은 역할 / 역할(팀장/팀원) / 삭제 */}
        <div className="pdm-section-title" style={{ marginTop: 10 }}>
          팀 정보
          <span style={{ marginLeft: 6, fontSize: 12, color: '#64748b' }}>
            (개인/팀 공통 — 역할 편집 가능)
          </span>
        </div>
        {team.map((m, idx) => (
          <div key={idx} className="team-member-row">
            <input
              placeholder="이름"
              value={m.name}
              onChange={(e) => changeTeam(idx, 'name', e.target.value)}
            />
            <input
              placeholder="포지션 (예: Backend)"
              value={m.position}
              onChange={(e) => changeTeam(idx, 'position', e.target.value)}
            />
            <input
              placeholder="맡은 역할 (예: API 설계)"
              value={m.duty}
              onChange={(e) => changeTeam(idx, 'duty', e.target.value)}
            />
            <select
              value={m.role || 'MEMBER'}
              onChange={(e) => setRole(idx, e.target.value)}
              title="역할"
            >
              <option value="LEADER">팀장</option>
              <option value="MEMBER">팀원</option>
            </select>
            <button onClick={() => removeTeam(idx)}>삭제</button>
          </div>
        ))}
        <button onClick={addTeam} className="add-team-btn">팀원 추가</button>

        {saveMessage && <div className="save-message">{saveMessage}</div>}

        {/* 액션 */}
        <div className="modal-actions">
          <button onClick={handleSave} disabled={!isChanged}>저장</button>
          <button onClick={onClose} className="cancel-btn">취소</button>
        </div>
      </div>
    </div>
  );
}