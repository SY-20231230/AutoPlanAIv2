// src/components/MainHome/Sidebar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Folder, ChevronRight, ChevronDown, Trash2, FileText,
  Image as ImageIcon, Code as CodeIcon, Music as MusicIcon,
  Loader2, AlertTriangle, ExternalLink, Download as DownloadIcon, RefreshCw
} from 'lucide-react';
import api, { API_BASE } from '../../api/axiosInstance';

const API_ROOT = API_BASE.replace(/\/api\/?$/, '');

/* 🔵 [i18n] 그룹 라벨 한국어 매핑 */
const translateGroupLabel = (raw) => {
  const s = (raw || '').toLowerCase().trim();

  if (s.includes('draft')) return '기능 명세서'; // 드래프트 전체 그룹
  if (s.includes('requirement') && (s.includes('confirm') || s.includes('final') || s.includes('approved'))) {
    return '최종 기능 명세서'; // 확정 요건 그룹
  }
  if (s.includes('requirement')) return '기능 명세서'; // 일반 요건도 화면상 "기능 명세서"로
  if (s.includes('similar')) return '유사 프로젝트';
  if (s.includes('output')) return '산출물';
  if (s.includes('team') || s.includes('member')) return '팀원정보';
  if (s.includes('gantt')) return '간트차트';
  return raw || '';
};

/* 🔵 자식 아이템 라벨 한국어화(+인덱스) */
const makeChildLabel = (groupLabel, node, fallbackPrefix, index = 0) => {
  const s = (groupLabel || '').toLowerCase();
  const t = (node?.type || '').toLowerCase();
  const base = node?.label || '';

  const isRequirement = s.includes('requirement');
  const isConfirmed = isRequirement && (s.includes('confirm') || s.includes('final') || s.includes('approved'));

  // ✅ 확정된 기능 명세서 → 최종기능_1, _2, ...
  if (isConfirmed) {
    return `최종기능_${(index ?? 0) + 1}`;
  }

  // 드래프트/요건 계열(확정 아닌 경우)
  if (s.includes('draft') || isRequirement) {
    if (t.includes('gemini_1') || t === 'gemini1') return '기능명세서_1안';
    if (t.includes('gemini_2') || t === 'gemini2') return '기능명세서_2안';
    // 라벨 힌트 추정
    if (/1\s*안/i.test(base)) return '기능명세서_1안';
    if (/2\s*안/i.test(base)) return '기능명세서_2안';
    return base || `${fallbackPrefix || '기능 명세서'} #${node.id ?? ''}`;
  }

  if (s.includes('gantt')) return base || `간트차트 #${node.id}`;
  if (s.includes('team') || s.includes('member')) return base || `팀원 #${node.id}`;
  if (s.includes('similar')) return base || node.href || `유사 프로젝트 #${node.id}`;
  if (s.includes('output')) return base || node.file_path || `산출물 #${node.id}`;

  return base || `${fallbackPrefix || '항목'} #${node.id ?? ''}`;
};

const Sidebar = ({
  onOpenOverview,
  onOpenGroup,
  onOpenDraft,
  onOpenRequirement,
  onOpenMember,
  onOpenOutputs,
  onOpenGanttList,
}) => {
  const [tree, setTree] = useState([]);                   // [{ project_id, title, children:[groups...] }]
  const [openProject, setOpenProject] = useState({});     // { [projectId]: boolean }
  const [openGroup, setOpenGroup] = useState({});         // { [`${projectId}:${label}`]: boolean }
  const [loading, setLoading] = useState(false);
  const [errorTop, setErrorTop] = useState(null);

  const [deleting, setDeleting] = useState({});           // { [projectId]: boolean }

  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, project: null });
  const menuRef = useRef(null);
  const fetchedRef = useRef(false);

  // ---------- utils ----------
  const safeMsg = (e, fallback) =>
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.message ||
    fallback;

  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      setErrorTop(null);
      const res = await api.get('/sidebar/tree/');
      const projects = res.data?.projects ?? [];
      setTree(projects);
      // 신규 프로젝트는 기본 열림
      const nextOpen = {};
      projects.forEach(p => {
        const pid = p.project_id;
        if (openProject[pid] === undefined) nextOpen[pid] = true;
        else nextOpen[pid] = openProject[pid];
      });
      setOpenProject(nextOpen);
    } catch (e) {
      setErrorTop(safeMsg(e, '프로젝트 트리를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [openProject]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchTree();
  }, [fetchTree]);

  // 바깥 클릭/ESC/스크롤: 컨텍스트 메뉴 닫기
  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenu((m) => ({ ...m, visible: false }));
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenu((m) => ({ ...m, visible: false })); };
    const onScroll = () => setMenu((m) => ({ ...m, visible: false }));
    window.addEventListener('click', onClickOutside);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('click', onClickOutside);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  const handleContextMenu = (e, project) => {
    e.preventDefault();
    setMenu({ visible: true, x: e.clientX, y: e.clientY, project });
  };

  const handleDelete = async () => {
    const p = menu.project;
    setMenu((m) => ({ ...m, visible: false }));
    if (!p) return;
    if (!window.confirm(`프로젝트 “${p.title || p.name || p.project_id}”을(를) 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;

    const pid = p.project_id;
    try {
      setDeleting((m) => ({ ...m, [pid]: true }));
      // DELETE /project/<project_id>/
      await api.delete(`/project/${pid}/`);
      // 로컬 상태 제거
      setTree(prev => prev.filter(x => x.project_id !== pid));
      const nextOpen = { ...openProject }; delete nextOpen[pid]; setOpenProject(nextOpen);
    } catch (e) {
      alert(safeMsg(e, '삭제 중 오류가 발생했습니다.'));
    } finally {
      setDeleting((m) => ({ ...m, [pid]: false }));
      fetchTree(); // 재동기화
    }
  };

  // ─────────────────────────────────────────────
  // 그룹 children 교체 유틸 (지정 프로젝트/그룹 인덱스)
  // ─────────────────────────────────────────────
  const replaceGroupChildren = (projectId, groupIdx, newChildren) => {
    setTree(prev => prev.map(p => {
      if (p.project_id !== projectId) return p;
      const children = (p.children || []).map((g, i) =>
        i === groupIdx ? { ...g, children: newChildren } : g
      );
      return { ...p, children };
    }));
  };

  // ---------- click actions ----------
  const emit = (name, detail) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  };

  const onProjectClick = async (project) => {
    // 토글 & 오버뷰 열기
    const pid = project.project_id;
    setOpenProject((m) => ({ ...m, [pid]: !m[pid] }));
    try {
      const res = await api.get(`/project/${pid}/overview/`);
      if (onOpenOverview) onOpenOverview(res.data);
      else emit('sidebar:overview', { projectId: pid, data: res.data });
    } catch (e) {
      // 오버뷰는 실패해도 트리 자체는 유지
      console.warn('overview error:', e);
    }
  };

  // 🔄 그룹 토글 시, 펼칠 때 count > children.length 이면 group.url 로 전체 children 추가 로드
  const onGroupToggle = async (projectId, group, groupIdx) => {
    const key = `${projectId}:${group.label}`;
    const next = !openGroup[key];
    setOpenGroup((m) => ({ ...m, [key]: next }));

    if (!next) return; // 접는 경우는 무시

    try {
      const listed = Array.isArray(group.children) ? group.children.length : 0;
      const total = typeof group.count === 'number' ? group.count : listed;

      if (group.url && total > listed) {
        // 필요 시 limit 파라미터로 강제 풀 리스트 요청
        const res = await api.get(group.url /* , { params: { limit: 999 } } */);
        const items = Array.isArray(res.data?.items)
          ? res.data.items
          : (res.data?.results || res.data?.children || []);

        if (items?.length) {
          replaceGroupChildren(projectId, groupIdx, items);
        }
      }
    } catch (e) {
      console.warn('그룹 전체 로드 실패:', e?.response?.data || e.message);
    }
  };

  const onGroupMore = async (projectId, group) => {
    // 그룹 url로 전체/상세 페이지 이동(콜백 또는 이벤트)
    try {
      const res = await api.get(group.url);
      const payload = { projectId, group, data: res.data };
      if (onOpenGroup) onOpenGroup(payload);
      else emit('sidebar:group', payload);
    } catch (e) {
      alert(safeMsg(e, '그룹 목록을 불러오지 못했습니다.'));
    }
  };

  const onDraftClick = async (projectId, draft) => {
    try {
      const res = await api.get(`/project/${projectId}/drafts/${draft.id}/`);
      const payload = { projectId, draft, data: res.data };
      if (onOpenDraft) onOpenDraft(payload);
      else emit('sidebar:draft', payload);
    } catch (e) {
      alert(safeMsg(e, '드래프트 상세를 불러오지 못했습니다.'));
    }
  };

  const onRequirementClick = async (reqId) => {
    try {
      const res = await api.get(`/requirements/${reqId}/`);
      const payload = { reqId, data: res.data };
      if (onOpenRequirement) onOpenRequirement(payload);
      else emit('sidebar:requirement', payload);
    } catch (e) {
    alert(safeMsg(e, '요건 상세를 불러오지 못했습니다.'));
    }
  };

  const onGanttClick = (projectId, node) => {
    const href = node.download_url?.startsWith('http')
      ? node.download_url
      : `${API_ROOT}${node.download_url || ''}`;
    if (href) window.open(href, '_blank');
    else alert('다운로드 링크가 없습니다.');
  };

  const onMemberClick = async (projectId, member) => {
    try {
      const res = await api.get(`/project/${projectId}/team-members/${member.id}/`);
      const payload = { projectId, memberId: member.id, data: res.data };
      if (onOpenMember) onOpenMember(payload);
      else emit('sidebar:member', payload);
    } catch (e) {
      alert(safeMsg(e, '팀원 상세를 불러오지 못했습니다.'));
    }
  };

  const onSimilarProjectClick = (node) => {
    const href = node.href;
    if (!href) { alert('외부 링크가 없습니다.'); return; }
    window.open(href, '_blank', 'noopener');
  };

  const onOutputClick = async (projectId, node) => {
    // 서버 정책에 맞게 파일 다운로드/뷰 처리
    if (node.file_path) {
      // 힌트가 download_hint면 그것을 우선 시도
      const direct = node.download_hint || node.file_path;
      const href = direct.startsWith('http') ? direct : `${API_ROOT}/${direct}`.replace(/([^:]\/)\/+/g, '$1');
      window.open(href, '_blank');
      return;
    }
    try {
      const res = await api.get(`/project/${projectId}/outputs/`);
      const payload = { projectId, data: res.data };
      if (onOpenOutputs) onOpenOutputs(payload);
      else emit('sidebar:outputs', payload);
    } catch (e) {
      alert(safeMsg(e, '산출물 목록을 불러오지 못했습니다.'));
    }
  };

  // ---------- icon helpers ----------
  const pickFileIcon = (label = '') => {
    const lower = label.toLowerCase();
    if (/\.(png|jpg|jpeg|gif|webp)$/.test(lower)) return ImageIcon;
    if (/\.(mp3|wav|ogg)$/.test(lower)) return MusicIcon;
    if (/\.(js|ts|tsx|jsx|py|java|c|cpp|cs|go|rs)$/.test(lower)) return CodeIcon;
    return FileText;
  };

  // ---------- render ----------
  return (
    <div
      className="sidebar"
      style={{
        /* ✅ 폭 고정 */
        width: 260,
        minWidth: 260,
        maxWidth: 260,
        /* ✅ flex 환경에서 크기 고정 */
        flex: '0 0 260px',

        borderRight: '1px solid #e5e7eb',
        height: '100vh',
        background: '#f9fafb',
        overflowY: 'auto'
      }}
    >
      <div className="sidebar-content" style={{ padding: 10 }}>
        <div className="sidebar-section-title" style={{ fontWeight: 700, marginBottom: 8, display:'flex', alignItems:'center', gap:8 }}>
          프로젝트
          <button
            title="새로고침"
            onClick={fetchTree}
            style={{ marginLeft:'auto', background:'transparent', border:'none', cursor:'pointer' }}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8 }}>
            <Loader2 size={16} className="spin" /> 트리를 불러오는 중...
          </div>
        )}
        {errorTop && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, color: '#b91c1c' }}>
            <AlertTriangle size={16} /> {errorTop}
          </div>
        )}

        {!loading && !errorTop && tree.map((project) => {
          const pid = project.project_id;
          const isOpen = !!openProject[pid];
          const isDeleting = !!deleting[pid];
          const groups = project.children || [];

          return (
            <div key={pid} className="sidebar-project" style={{ opacity: isDeleting ? 0.5 : 1 }}>
              {/* Project Header */}
              <div
                className="sidebar-item sidebar-project-header"
                onClick={() => !isDeleting && onProjectClick(project)}
                onContextMenu={(e) => !isDeleting && handleContextMenu(e, project)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 4px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  userSelect: 'none',
                }}
                title={isDeleting ? '삭제 중...' : (project.title || `Project #${pid}`)}
              >
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Folder size={18} />
                <span className="sidebar-item-text">{project.title || `Project #${pid}`}</span>
                {isDeleting && <Loader2 size={14} className="spin" style={{ marginLeft: 'auto' }} />}
              </div>

              {/* Groups */}
              {isOpen && (
                <div className="sidebar-files" style={{ marginLeft: 24 }}>
                  {groups.map((group, gi) => {
                    const gkey = `${pid}:${group.label}`;
                    const gOpen = !!openGroup[gkey];
                    const count = typeof group.count === 'number' ? group.count : undefined;

                    // 🔵 화면 표시는 한국어, 내부 로직은 원문 라벨 기준
                    const displayLabel = translateGroupLabel(group.label);
                    const rawLower = (group.label || '').toLowerCase();

                    return (
                      <div key={`${gkey}-${gi}`} style={{ marginBottom: 2 }}>
                        {/* Group header */}
                        <div
                          className="sidebar-item sidebar-group-header"
                          onClick={() => onGroupToggle(pid, group, gi)}
                          title={`${displayLabel}${count !== undefined ? ` (${count})` : ''}`}
                          style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 0', cursor:'pointer' }}
                        >
                          {gOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <span className="sidebar-item-text" style={{ fontWeight: 600 }}>
                            {displayLabel}{count !== undefined ? ` (${count})` : ''}
                          </span>
                          {/* More/list button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); onGroupMore(pid, group); }}
                            title="전체 보기"
                            style={{ marginLeft:'auto', background:'transparent', border:'none', cursor:'pointer' }}
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>

                        {/* Group children */}
                        {gOpen && Array.isArray(group.children) && group.children.length > 0 && (
                          <div style={{ marginLeft: 18 }}>
                            {group.children.map((node, ni) => {
                              const commonStyle = { display:'flex', alignItems:'center', gap:6, padding:'3px 0', cursor:'pointer' };

                              if (rawLower.includes('draft')) {
                                // draft
                                return (
                                  <div
                                    key={`draft-${node.id ?? ni}-${ni}`}
                                    className="sidebar-item sidebar-file"
                                    onClick={() => onDraftClick(pid, node)}
                                    style={commonStyle}
                                  >
                                    <FileText size={16} />
                                    <span className="sidebar-item-text">
                                      {makeChildLabel(group.label, node, '기능 명세서', ni)}
                                    </span>
                                  </div>
                                );
                              }

                              if (rawLower.includes('requirement')) {
                                // requirement (confirmed / non-confirmed)
                                return (
                                  <div
                                    key={`req-${node.id ?? ni}-${ni}`}
                                    className="sidebar-item sidebar-file"
                                    onClick={() => onRequirementClick(node.id)}
                                    style={commonStyle}
                                  >
                                    <FileText size={16} />
                                    <span className="sidebar-item-text">
                                      {makeChildLabel(group.label, node, '기능 명세서', ni)}
                                    </span>
                                  </div>
                                );
                              }

                              if (rawLower.includes('gantt')) {
                                // gantt
                                return (
                                  <div
                                    key={`gantt-${node.id ?? ni}-${ni}`}
                                    className="sidebar-item sidebar-file"
                                    onClick={() => onGanttClick(pid, node)}
                                    style={commonStyle}
                                    title="다운로드"
                                  >
                                    <DownloadIcon size={16} />
                                    <span className="sidebar-item-text">
                                      {makeChildLabel(group.label, node, '간트차트', ni)}
                                    </span>
                                  </div>
                                );
                              }

                              if (rawLower.includes('team')) {
                                // member
                                return (
                                  <div
                                    key={`mem-${node.id ?? ni}-${ni}`}
                                    className="sidebar-item sidebar-file"
                                    onClick={() => onMemberClick(pid, node)}
                                    style={commonStyle}
                                  >
                                    <FileText size={16} />
                                    <span className="sidebar-item-text">
                                      {makeChildLabel(group.label, node, '팀원', ni)}
                                    </span>
                                  </div>
                                );
                              }

                              if (rawLower.includes('similar')) {
                                // similar project (external)
                                return (
                                  <div
                                    key={`sp-${node.id ?? ni}-${ni}`}
                                    className="sidebar-item sidebar-file"
                                    onClick={() => onSimilarProjectClick(node)}
                                    style={commonStyle}
                                    title="GitHub로 이동"
                                  >
                                    <ExternalLink size={16} />
                                    <span className="sidebar-item-text">
                                      {makeChildLabel(group.label, node, '유사 프로젝트', ni)}
                                    </span>
                                  </div>
                                );
                              }

                              if (rawLower.includes('output')) {
                                // output
                                const Icon = pickFileIcon(node.label || node.file_path || '');
                                return (
                                  <div
                                    key={`out-${node.id ?? ni}-${ni}`}
                                    className="sidebar-item sidebar-file"
                                    onClick={() => onOutputClick(pid, node)}
                                    style={commonStyle}
                                  >
                                    <Icon size={16} />
                                    <span className="sidebar-item-text">
                                      {makeChildLabel(group.label, node, '산출물', ni)}
                                    </span>
                                  </div>
                                );
                              }

                              // fallback
                              return (
                                <div
                                  key={`node-${ni}`}
                                  className="sidebar-item sidebar-file"
                                  style={{ ...commonStyle, opacity: 0.7 }}
                                  title="지원되지 않는 그룹 타입"
                                >
                                  <FileText size={16} />
                                  <span className="sidebar-item-text">{node.label || `항목 #${ni}`}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {groups.length === 0 && (
                    <div style={{ padding: '4px 0', color: '#6b7280' }}>그룹이 없습니다</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 컨텍스트 메뉴 */}
      {menu.visible && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: menu.y, left: menu.x, background: '#fff',
            border: '1px solid #e5e7eb', boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
            borderRadius: 8, padding: 6, zIndex: 9999, minWidth: 170,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDelete}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            <Trash2 size={16} /> 프로젝트 삭제
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

/* 선택: 아이콘 로딩용 CSS
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } } */