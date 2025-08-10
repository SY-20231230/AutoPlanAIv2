import React, { useState } from 'react';

const API = {
  addMember: (projectId) => `/api/project/${projectId}/team-members/`,
  getMembers: (projectId) => `/api/project/${projectId}/team-members/`,
  updateMember: (projectId, memberId) => `/api/project/${projectId}/team-members/${memberId}/`,
  assignTasks: (projectId) => `/api/project/${projectId}/assign-tasks/`,
};

const TeamAutoAssign = ({ projectId, enabled }) => {
  const [members, setMembers] = useState([]);
  const [roleResult, setRoleResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // 팀원 목록 불러오기
  const fetchMembers = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(API.getMembers(projectId));
      if (res.ok) {
        const data = await res.json();
        setMembers(data || []);
      }
    } catch {}
    setLoading(false);
  };

  // 팀원 역할 자동 분배
  const handleAutoAssign = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(API.assignTasks(projectId), { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setRoleResult(data);
      } else {
        alert('자동 분배 실패');
      }
    } catch {
      alert('네트워크 오류');
    }
    setLoading(false);
  };

  // 컴포넌트 마운트 시 팀원 자동 조회
  React.useEffect(() => {
    if (enabled) fetchMembers();
    // eslint-disable-next-line
  }, [enabled, projectId]);

  return (
    <div className="team-auto-assign">
      <h4>팀 자동 분배</h4>
      {loading && <div style={{ color: '#888', marginBottom: 8 }}>로딩중...</div>}
      <button className="primary-button" onClick={handleAutoAssign} disabled={!members.length || loading}>
        역할 자동 추천 및 분배
      </button>
      {/* 팀원 목록 */}
      <div className="team-members-list">
        {members.length > 0 ? (
          members.map((m, i) => (
            <div key={i} className="member-row">
              <span>{m.name} <small>({m.position}, {m.tech_stack})</small></span>
            </div>
          ))
        ) : (
          <div style={{ color: '#bbb' }}>팀원이 아직 없습니다.</div>
        )}
      </div>
      {/* 분배 결과 */}
      {roleResult && (
        <div className="team-assign-result">
          <h5>분배 결과</h5>
          <ul>
            {(roleResult.roles || []).map((r, i) => (
              <li key={i}>{r.member_name} ➔ {r.assigned_role}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TeamAutoAssign;