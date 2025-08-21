import React, { useEffect, useState, useCallback } from 'react';
import { Wand2, Save, Trash2, Plus, ArrowRight, PencilLine, X, Check, Info, Users } from 'lucide-react';
import api from '../../api/axiosInstance';
import "../../styles/MainHome/TeamAutoAssign.css";

/** 서버 ↔ UI 필드 매핑 유틸 */
function fromServer(m) {
  return {
    id: m.id ?? m.member_id ?? m.pk,
    name: (m.name || m.member_name || '미지정').trim(),
    position: (m.position || m.role || '').trim(),
    tech_stack: (m.tech_stack || m.skills || '').trim(),
    email: (m.email || '').trim(),
  };
}
function toServer(bodyUI) {
  const email = (bodyUI.email || '').trim();
  return {
    name: (bodyUI.name || '').trim(),
    role: (bodyUI.position || '').trim(),
    skills: (bodyUI.tech_stack || '').trim(),
    ...(email ? { email } : {}),
  };
}

/** rows → 멤버 요약 */
function groupAssignmentsByMember(rows = [], members = []) {
  const flat = rows.map((r) => {
    const m =
      members.find(mm => String(mm.id) === String(r.member_id ?? r.id)) ||
      members.find(mm => (mm.name || '').trim() === (r.member_name || r.name || '').trim());
    return {
      member_id: m?.id ?? (r.member_id ?? r.id ?? null),
      member_name: m?.name || r.member_name || r.name || '미지정',
      position: m?.position || r.position || r.role || '',
      tech_stack: m?.tech_stack || r.tech_stack || r.skills || '',
      role_piece: String(r.assigned_role || r.role || r.task || '').trim(),
    };
  });

  const map = new Map();
  for (const row of flat) {
    const key = String(row.member_id ?? row.member_name);
    const cur = map.get(key) || {
      member_name: row.member_name,
      position: row.position,
      tech_stack: row.tech_stack,
      roles: new Set(),
    };
    if (row.role_piece) cur.roles.add(row.role_piece);
    map.set(key, cur);
  }

  const order = [];
  const seen = new Set();
  for (const m of members) {
    const keyA = String(m.id);
    const keyB = String(m.name);
    if (map.has(keyA) && !seen.has(keyA)) { order.push([keyA, map.get(keyA)]); seen.add(keyA); }
    else if (map.has(keyB) && !seen.has(keyB)) { order.push([keyB, map.get(keyB)]); seen.add(keyB); }
    else {
      order.push([keyA, { member_name: m.name, position: m.position, tech_stack: m.tech_stack, roles: new Set() }]);
    }
  }

  let id = 1;
  return order.map(([, v]) => ({
    id: id++,
    member_name: v.member_name,
    position: v.position,
    tech_stack: v.tech_stack,
    assigned_role: Array.from(v.roles).join(', '),
  }));
}

const TeamAutoAssign = ({
  projectId,
  enabled = true,
  fetchMembers,
  autoAssign,
  saveAssignments,
  onNext,
}) => {
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [newMember, setNewMember] = useState({ name: '', position: '', tech_stack: '', email: '' });
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [draftEdit, setDraftEdit] = useState({ name: '', position: '', tech_stack: '', email: '' });
  const isEditing = (id) => editingId === id;

  const [detail, setDetail] = useState({ open: false, text: '', loading: false, error: null });

  // ===== 팀원 목록 로드 =====
  const loadMembers = useCallback(async () => {
    if (!enabled || !projectId) return;
    setLoading(true);
    try {
      let data = [];
      if (fetchMembers) {
        data = await fetchMembers(projectId);
      } else {
        const res = await api.get(`/project/${projectId}/team-members/`);
        data = Array.isArray(res?.data) ? res.data : (res?.data?.items || res?.data?.results || []);
      }
      const normalized = (Array.isArray(data) ? data : []).map(fromServer);
      setMembers(normalized);

      setAssignments(prev => {
        if (prev.length) return prev;
        let id = 1;
        return normalized.map(m => ({
          id: id++,
          member_name: m.name,
          position: m.position,
          tech_stack: m.tech_stack,
          assigned_role: '',
        }));
      });
    } catch (e) {
      console.error('팀원 조회 실패:', e?.response?.data || e.message);
      setMembers([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId, fetchMembers]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // ===== 팀원 추가 =====
  const handleCreateMember = async () => {
    if (!projectId) return alert('projectId가 없습니다.');
    const { name, position, tech_stack, email } = newMember;
    if (!name.trim()) return alert('이름을 입력해 주세요.');

    setCreating(true);
    try {
      const payload = toServer({ name, position, tech_stack, email });
      const res = await api.post(`/project/${projectId}/team-members/create/`, payload);
      const created = fromServer(res?.data || {});

      setMembers(prev => [...prev, created]);
      setAssignments(prev => {
        const nextId = Math.max(0, ...prev.map(a => a.id)) + 1;
        return [...prev, {
          id: nextId,
          member_name: created.name,
          position: created.position,
          tech_stack: created.tech_stack,
          assigned_role: '',
        }];
      });
      setNewMember({ name: '', position: '', tech_stack: '', email: '' });
    } catch (e) {
      console.error('팀원 추가 실패:', e?.response?.data || e.message);
      alert(e?.response?.data?.detail || e.message || '팀원 추가에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  // ===== 편집 =====
  const startEdit = (m) => {
    setEditingId(m.id);
    setDraftEdit({ name: m.name || '', position: m.position || '', tech_stack: m.tech_stack || '', email: m.email || '' });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraftEdit({ name: '', position: '', tech_stack: '', email: '' });
  };
  const saveEdit = async (id) => {
    if (!projectId) return alert('projectId가 없습니다.');
    try {
      const payload = toServer(draftEdit);
      await api.put(`/project/${projectId}/team-members/${id}/`, payload);

      setMembers(prev => prev.map(m => (m.id === id ? { ...m, ...draftEdit } : m)));

      const old = members.find(m => m.id === id);
      const oldName = old?.name;
      setAssignments(prev => prev.map(a =>
        a.member_name === oldName
          ? {
              ...a,
              member_name: draftEdit.name || a.member_name,
              position: draftEdit.position || a.position,
              tech_stack: draftEdit.tech_stack || a.tech_stack,
            }
          : a
      ));
      cancelEdit();
    } catch (e) {
      console.error('팀원 수정 실패:', e?.response?.data || e.message);
      alert(e?.response?.data?.detail || e.message || '팀원 수정에 실패했습니다.');
    }
  };

  // ===== 삭제 =====
  const deleteMember = async (id) => {
    if (!projectId) return alert('projectId가 없습니다.');
    if (!window.confirm('이 팀원을 삭제할까요?')) return;
    try {
      await api.delete(`/project/${projectId}/team-members/${id}/delete/`);
      const removed = members.find(m => m.id === id);
      setMembers(prev => prev.filter(m => m.id !== id));
      if (removed) setAssignments(prev => prev.filter(a => a.member_name !== removed.name));
    } catch (e) {
      console.error('팀원 삭제 실패:', e?.response?.data || e.message);
      alert(e?.response?.data?.detail || e.message || '팀원 삭제에 실패했습니다.');
    }
  };

  // ===== 상세 =====
  const openDetail = async (id) => {
    if (!projectId) return;
    try {
      setDetail({ open: true, text: '', loading: true, error: null });
      const res = await api.get(`/project/${projectId}/team-members/${id}/detail/`, { responseType: 'json' });
      const d = res?.data || {};
      setDetail({ open: true, text: JSON.stringify(d, null, 2), loading: false, error: null });
    } catch (e) {
      setDetail({ open: true, text: '', loading: false, error: e?.response?.data?.detail || e.message || '상세 조회 실패' });
    }
  };

  // ===== 자동 분배(멤버 단위 요약) =====
  const handleAutoAssign = async () => {
    if (!members.length) return;
    setLoading(true);
    try {
      let rows = [];
      if (autoAssign) {
        rows = await autoAssign(projectId, members);
      } else {
        const res = await api.post(`/project/${projectId}/assign-tasks/`, {
          strategy: 'auto',
          members: members.map(m => ({
            id: m.id, name: m.name, role: m.position, skills: m.tech_stack, email: m.email,
          })),
        });
        rows = Array.isArray(res?.data) ? res.data : (res?.data?.assignments || []);
      }
      setAssignments(groupAssignmentsByMember(rows, members));
    } catch (e) {
      console.error('자동 분배 실패:', e?.response?.data || e.message);
      alert(e?.response?.data?.detail || e.message || '자동 분배에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ===== 역할 분배 수동 편집 =====
  const handleRoleChange = (id, value) => {
    setAssignments(prev => prev.map(row => (row.id === id ? { ...row, assigned_role: value } : row)));
  };
  const handleMemberChange = (id, memberName) => {
    const m = members.find(x => x.name === memberName);
    setAssignments(prev => prev.map(row => (
      row.id === id
        ? { ...row, member_name: memberName, position: m?.position || '', tech_stack: m?.tech_stack || '' }
        : row
    )));
  };
  const handleDeleteRow = (id) => setAssignments(prev => prev.filter(r => r.id !== id));
  const handleAddRow = () => {
    const nextId = Math.max(0, ...assignments.map(a => a.id)) + 1;
    const m = members[0];
    setAssignments(prev => [...prev, {
      id: nextId,
      member_name: m?.name || '미지정',
      position: m?.position || '',
      tech_stack: m?.tech_stack || '',
      assigned_role: '',
    }]);
  };

  // ===== 저장 =====
  const handleSaveAssignments = async () => {
    if (!assignments.length) return alert('저장할 역할 분배가 없습니다.');
    if (!projectId) return alert('projectId가 없습니다.');
    setSaving(true);
    try {
      if (saveAssignments) {
        await saveAssignments(projectId, assignments);
      } else {
        await api.post(`/project/${projectId}/assign-tasks/`, {
          strategy: 'manual',
          assignments: assignments.map(a => ({
            name: a.member_name,
            role: a.position,
            skills: a.tech_stack,
            assigned_role: a.assigned_role,
          })),
        });
      }
      alert('역할 분배가 저장되었습니다.');
    } catch (e) {
      console.error('저장 실패:', e?.response?.data || e.message);
      alert(e?.response?.data?.detail || e.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="team-root app-card">
      {/* ===== 상단: 아이콘 + 제목 + 회색선 ===== */}
      <div className="team-header-top">
        <div className="team-title-row">
          <Users className="team-title-icon" />
          <h3>팀원 자동 분배</h3>
        </div>
      </div>

      {/* ===== 툴바: 프로젝트ID + 액션 ===== */}
      <div className="team-toolbar">
        <div className="team-project">
          <span className="label">프로젝트 ID:</span>
          <span className="value">{projectId ?? '—'}</span>
        </div>
        <div className="team-actions">
          <button
            onClick={handleAutoAssign}
            disabled={!enabled || !members.length || loading}
            className="btn-primary"
            title={!members.length ? '팀원 목록이 비어있습니다.' : '팀 자동 분배 실행'}
          >
            <Wand2 size={16} /> 자동 분배
          </button>
          <button
            onClick={handleSaveAssignments}
            disabled={!assignments.length || saving}
            className="btn-success"
          >
            <Save size={16} /> {saving ? '저장 중…' : '역할 저장'}
          </button>
        </div>
      </div>

      {loading && <div className="team-loading">로딩중...</div>}

      {/* 0) 신규 팀원 입력 */}
      <div className="team-card">
        <div className="team-card-title">팀원 추가</div>
        <div className="team-newmember-grid">
          <input
            className="team-input"
            placeholder="이름"
            value={newMember.name}
            onChange={(e)=>setNewMember(m=>({ ...m, name:e.target.value }))}
          />
          <input
            className="team-input"
            placeholder="포지션 (예: backend)"
            value={newMember.position}
            onChange={(e)=>setNewMember(m=>({ ...m, position:e.target.value }))}
          />
          <input
            className="team-input"
            placeholder="기술스택 (예: python,django,postgresql)"
            value={newMember.tech_stack}
            onChange={(e)=>setNewMember(m=>({ ...m, tech_stack:e.target.value }))}
          />
          <button
            onClick={handleCreateMember}
            disabled={creating || !newMember.name.trim()}
            className="btn-primary team-add-btn"
          >
            <Plus size={16} /> 추가
          </button>
        </div>
      </div>

      {/* 1) 팀원 표 */}
      <div className="team-card">
        <div className="team-table-header">
          <div className="th flex2">이름</div>
          <div className="th flex2">포지션</div>
          <div className="th flex3">기술스택</div>
          <div className="th w168 right">관리</div>
        </div>

        {members.length ? members.map(m => (
          <div key={m.id ?? m.name} className="team-table-row">
            <div className="td flex2 strong">
              {isEditing(m.id) ? (
                <input
                  className="team-input"
                  value={draftEdit.name}
                  onChange={(e)=>setDraftEdit(d=>({ ...d, name:e.target.value }))}
                />
              ) : m.name}
            </div>

            <div className="td flex2">
              {isEditing(m.id) ? (
                <input
                  className="team-input"
                  value={draftEdit.position}
                  onChange={(e)=>setDraftEdit(d=>({ ...d, position:e.target.value }))}
                />
              ) : m.position || '-'}
            </div>

            <div className="td flex3">
              {isEditing(m.id) ? (
                <input
                  className="team-input"
                  value={draftEdit.tech_stack}
                  onChange={(e)=>setDraftEdit(d=>({ ...d, tech_stack:e.target.value }))}
                />
              ) : m.tech_stack || '-'}
            </div>

            <div className="td w168 right">
              {isEditing(m.id) ? (
                <div className="icon-group">
                  <button className="icon-btn" title="저장" onClick={()=>saveEdit(m.id)}>
                    <Check size={16} />
                  </button>
                  <button className="icon-btn" title="취소" onClick={cancelEdit}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="icon-group">
                  <button className="icon-btn" title="상세" onClick={()=>openDetail(m.id)}>
                    <Info size={16} />
                  </button>
                  <button className="icon-btn" title="수정" onClick={()=>startEdit(m)}>
                    <PencilLine size={16} />
                  </button>
                  <button className="icon-btn icon-btn-danger" title="삭제" onClick={()=>deleteMember(m.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="team-empty">팀원이 아직 없습니다.</div>
        )}
      </div>

      {/* 2) 역할 분배 */}
      <div className="team-card mt16">
        <div className="team-table-header">
          <div className="th flex2">이름</div>
          <div className="th flex2">포지션</div>
          <div className="th flex3">기술스택</div>
          <div className="th flex3">역할</div>
          <div className="th w56 right">
            <button onClick={handleAddRow} className="icon-btn" title="행 추가">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {assignments.length ? assignments.map(row => (
          <div key={row.id} className="team-table-row">
            <div className="td flex2">
              <select
                className="team-select"
                value={row.member_name}
                onChange={(e) => handleMemberChange(row.id, e.target.value)}
              >
                {members.map(m => (
                  <option key={m.id ?? m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="td flex2">{row.position || '-'}</div>
            <div className="td flex3">{row.tech_stack || '-'}</div>

            <div className="td flex3">
              <input
                className="team-input"
                type="text"
                value={row.assigned_role}
                onChange={(e) => handleRoleChange(row.id, e.target.value)}
                placeholder="예: 할일1, 할일2"
              />
            </div>

            <div className="td w56 right">
              <button onClick={() => handleDeleteRow(row.id)} className="icon-btn icon-btn-danger" title="행 삭제">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )) : (
          <div className="team-empty">
            아직 역할 분배가 없습니다. 자동 분배를 눌러보세요.
          </div>
        )}
      </div>

      {/* 하단 다음 */}
     

      {/* 상세 모달 */}
      {detail.open && (
        <div className="modal-backdrop" onClick={()=>setDetail(s=>({ ...s, open:false }))}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <strong>팀원 상세</strong>
              <button className="icon-btn" onClick={()=>setDetail(s=>({ ...s, open:false }))}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {detail.loading && <div className="team-loading">불러오는 중…</div>}
              {detail.error && <div className="team-empty" style={{ borderStyle:'solid' }}>{detail.error}</div>}
              {!detail.loading && !detail.error && (
                <pre className="team-pre">{detail.text || '(빈 데이터)'}</pre>
              )}
            </div>
          </div>
        </div>
      )}
     <div className="btn-next">
  <button className="btn-success" onClick={onNext}>
    다음(간트차트 생성) <ArrowRight size={16} />
  </button>
</div>
    </div>
  );
};

export default TeamAutoAssign;