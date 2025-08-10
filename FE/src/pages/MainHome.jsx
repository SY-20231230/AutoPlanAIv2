// src/pages/MainHome.jsx

import React, { useState, useRef } from 'react';
import Sidebar from '../components/MainHome/Sidebar';
import ProjectHeader from '../components/MainHome/ProjectHeader';
import PlanningWorkflow from '../components/MainHome/PlanningWorkflow';
import DocumentPanel from '../components/MainHome/DocumentPanel';
import AIAssistantChat from '../components/MainHome/AIAssistantChat';
import IdeaModal from '../components/MainHome/IdeaModal';
import IdeaViewModal from '../components/MainHome/IdeaViewModal';
import SpecSheetCard from '../components/MainHome/SpecSheetCard';
import UploadModal from '../components/MainHome/UploadModal';
import DocumentViewModal from '../components/MainHome/DocumentViewModal';
import SimilarProjects from '../components/MainHome/SimilarProjects';
import GanttChart from '../components/MainHome/GanttChart';
import { FileText } from 'lucide-react';
import '../styles/MainHome.css';

const API_BASE = 'http://192.168.100.45:8000/api';

const getAccessToken = () =>
  localStorage.getItem('access') || localStorage.getItem('accessToken') || '';

const authHeaders = () => {
  const t = getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// 공통 POST(JSON) 유틸
const postJson = (url, body = {}) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });

// JSON 문자열 보기 좋게
const pretty = (v) => {
  try {
    if (typeof v === 'string') {
      const obj = JSON.parse(v);
      return JSON.stringify(obj, null, 2);
    }
    return JSON.stringify(v, null, 2);
  } catch {
    return v || '';
  }
};

// drafts 응답에서 id 뽑기 (백엔드 키 호환)
const pickDraftId = (d) =>
  d?.draft_id ?? d?.RequirementDraft_id ?? d?.id ?? d?.pk ?? null;

const MainHome = () => {
  const [sidebarItems, setSidebarItems] = useState([]);
  const [documents, setDocuments] = useState({});
  const [selectedSidebarItem, setSelectedSidebarItem] = useState(null);

  const [spec1, setSpec1] = useState('');
  const [spec2, setSpec2] = useState('');
  const [draftIds, setDraftIds] = useState([null, null]); // [gemini_1, gemini_2]

  const [showIdeaViewModal, setShowIdeaViewModal] = useState(false);
  const [showIdeaEditModal, setShowIdeaEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef();

  const [idea, setIdea] = useState('');
  const [selectedTab, setSelectedTab] = useState('existing');

  const [projectTitle, setProjectTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [projectId, setProjectId] = useState(null);

  const [finalized, setFinalized] = useState(false);
  const [finalSpec, setFinalSpec] = useState('');
  const [requirementIds, setRequirementIds] = useState([]);

  const [recommendLoading, setRecommendLoading] = useState(false);
  const [similarProjects, setSimilarProjects] = useState([]);
  const [showSimilarPage, setShowSimilarPage] = useState(false);

  const [ganttDocId, setGanttDocId] = useState(null);
  const [showGanttPage, setShowGanttPage] = useState(false);

  // 사이드바/문서
  const addSidebarItem = (name, icon, content) => {
    if (!sidebarItems.some((i) => i.name === name)) {
      setSidebarItems((prev) => [...prev, { name, icon, active: false }]);
    }
    setDocuments((prev) => ({ ...prev, [name]: content }));
  };

  // 프로젝트 생성
  const handleTextSpecSubmit = async (txt) => {
    if (!projectTitle) return alert('프로젝트명을 입력하세요.');
    try {
      const res = await fetch(`${API_BASE}/project/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          title: projectTitle,
          description: txt || idea || '프론트에서 입력한 기획서 본문',
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        alert(`프로젝트 생성 실패: ${res.status} ${errText}`);
        return;
      }
      const data = await res.json();
      const pid = data.project_id || data.id;
      setProjectId(pid);
      localStorage.setItem('lastProjectId', String(pid));

      // 상태 리셋
      setSpec1('');
      setSpec2('');
      setDraftIds([null, null]);
      setFinalized(false);
      setFinalSpec('');
      setRequirementIds([]);
      setSimilarProjects([]);
      setShowSimilarPage(false);
      setGanttDocId(null);
      setShowGanttPage(false);

      addSidebarItem(`${projectTitle}_기획서`, FileText, txt || '(본문 없음)');
      setShowUploadModal(false);
      alert(`프로젝트가 생성되었습니다! ID: ${pid}`);
    } catch (e) {
      alert(`프로젝트 생성 중 오류: ${e.message}`);
    }
  };

  // 파일 업로드 input 트리거
  const handleSpecUploadClick = () => {
    setShowUploadModal(false);
    fileInputRef.current?.click();
  };

  // 파일 업로드 핸들러
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && /\.(docx?|DOCX?)$/.test(file.name)) {
      setSpec1('');
      setSpec2('');
      addSidebarItem(
        `${projectTitle}_기획서`,
        FileText,
        `업로드한 파일명: ${file.name}\n(실제 파싱/분석 내용은 연동 시 반영)`
      );
    } else {
      alert('doc/docx 파일만 업로드 가능합니다.');
    }
  };

  // 사이드바 아이템 클릭 → name으로 저장 (문서 매칭용)
  const handleSidebarItemClick = (item) => {
    setSelectedSidebarItem(item?.name ?? '');
  };

  // 1안 생성
  const handleGenerateSpec1 = async () => {
    if (!projectId) return alert('프로젝트를 먼저 업로드하세요!');
    try {
      const res = await postJson(`${API_BASE}/project/${projectId}/generate-gemini1/`);
      if (!res.ok) {
        const errText = await res.text();
        alert(`1안 생성 실패: ${res.status} ${errText}`);
        return;
      }
      alert('기능명세서 1안 생성 완료!');
    } catch (e) {
      alert(`1안 생성 오류: ${e.message}`);
    }
  };

  // 2안 생성
  const handleGenerateSpec2 = async () => {
    if (!projectId) return alert('프로젝트를 먼저 업로드하세요!');
    try {
      const res = await postJson(`${API_BASE}/project/${projectId}/refine-gemini2/`);
      if (!res.ok) {
        const errText = await res.text();
        alert(`2안 생성 실패: ${res.status} ${errText}`);
        return;
      }
      alert('기능명세서 2안 생성 완료!');
    } catch (e) {
      alert(`2안 생성 오류: ${e.message}`);
    }
  };

  // drafts 불러오기 (항상 최신 2개를 상태에 반영)
  const loadDrafts = async () => {
    const res = await fetch(`${API_BASE}/project/${projectId}/drafts/`, {
      method: 'GET',
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`명세서 조회 실패: ${res.status} ${errText}`);
    }
    const drafts = await res.json();
    if (!Array.isArray(drafts) || drafts.length === 0) {
      throw new Error('명세서 초안이 없습니다. 먼저 1안/2안을 생성하세요.');
    }

    // 정렬: gemini_1 먼저, 그 다음 gemini_2
    const g1 = drafts.find((d) => (d.type || '').toLowerCase() === 'gemini1') || drafts[0];
    const g2 = drafts.find((d) => (d.type || '').toLowerCase() === 'gemini2') || drafts[1];

    setDraftIds([pickDraftId(g1) || null, pickDraftId(g2) || null]);
    setSpec1(g1 ? (g1.content ? pretty(g1.content) : (g1.summary || '(내용 없음)')) : '');
    setSpec2(g2 ? (g2.content ? pretty(g2.content) : (g2.summary || '(내용 없음)')) : '');

    return { drafts, g1, g2 };
  };

  // 1안/2안 보기 버튼
  const handleShowSpec1 = async () => {
    if (!projectId) return alert('프로젝트를 먼저 업로드하세요!');
    try { await loadDrafts(); } catch (e) { alert(e.message); }
  };
  const handleShowSpec2 = handleShowSpec1; // 둘 다 최신으로 묶어 갱신

  // ✅ 최종 확정 전용 (제미나이3는 여기서 돌리지 않음)
  const finalizeOnly = async (draftIdx, content) => {
    if (!projectId) return alert('프로젝트 ID가 없습니다.');
    if (!content) return alert('확정할 명세서 내용이 없습니다. 먼저 명세서를 조회하세요.');

    let draftId = draftIds[draftIdx];
    try {
      if (!draftId) {
        const { g1, g2 } = await loadDrafts();
        draftId = [pickDraftId(g1), pickDraftId(g2)][draftIdx];
        if (!draftId) throw new Error('해당 순번의 draft_id를 찾지 못했습니다.');
      }

      // 정수화(400 방지)
      draftId = parseInt(draftId, 10);
      if (!Number.isFinite(draftId)) {
        return alert('draft_id가 유효하지 않습니다.');
      }

      const fin = await postJson(`${API_BASE}/project/${projectId}/finalize/`, { draft_id: draftId });
      if (!fin.ok) {
        const errText = await fin.text();
        alert(`최종 확정 실패: ${fin.status} ${errText}`);
        return;
      }
      const result = await fin.json();
      setFinalized(true);
      setFinalSpec(content);
      setRequirementIds(result.requirement_ids || []);
      alert('최종 기능 명세서로 저장 완료!');
    } catch (e) {
      alert(e.message);
    }
  };

  // Spec 카드에 내려줄 확정 버튼
  const handleFinalize1 = () => finalizeOnly(0, spec1);
  const handleFinalize2 = () => finalizeOnly(1, spec2);

  // ✅ 유사성 검사 버튼을 눌렀을 때만 제미나이3 실행
  const handleRecommendProjects = async () => {
    if (!projectId || !finalized) {
      alert('먼저 명세서를 확정하세요.');
      return;
    }
    setRecommendLoading(true);
    try {
      // 1) 추천 실행 (415 방지: Content-Type 명시)
      const run = await postJson(`${API_BASE}/project/${projectId}/similar-projects/`, {});
      if (!run.ok) {
        const errText = await run.text();
        setRecommendLoading(false);
        return alert(`유사 프로젝트 실행 실패: ${run.status} ${errText}`);
      }

      // 2) 결과 조회
      const list = await fetch(`${API_BASE}/project/${projectId}/similar-projects/list/`, {
        method: 'GET',
        headers: { ...authHeaders() }
      });
      if (!list.ok) {
        const errText = await list.text();
        setRecommendLoading(false);
        return alert(`유사 프로젝트 결과 조회 실패: ${list.status} ${errText}`);
      }

      const data = await list.json();
      setSimilarProjects(data.projects || data || []);
      setShowSimilarPage(true);
      setRecommendLoading(false);
    } catch (e) {
      setRecommendLoading(false);
      alert(`유사 프로젝트 추천 실패: ${e.message}`);
    }
  };

  // 간트차트 생성 (필수 바디 포함)
  const handleGanttCreate = async () => {
    if (!projectId || !finalized) {
      alert('먼저 명세서를 확정하세요.');
      return;
    }
    const body = {
      start_date: new Date().toISOString().slice(0, 10), // 오늘
      total_weeks: 12,
      parts: ['백엔드', '프론트엔드', '인공지능', '서류'],
      filename: `${projectTitle || '프로젝트'}_간트`,
    };

    try {
      const res = await postJson(`${API_BASE}/project/${projectId}/gantt/`, body);
      if (!res.ok) {
        const errText = await res.text();
        alert(`간트차트 생성 실패: ${res.status} ${errText}`);
        return;
      }
      const data = await res.json();
      const docId = data.document_id || data.doc_id || data.id;
      setGanttDocId(docId);
      setShowGanttPage(true);
    } catch (e) {
      alert(`간트차트 생성 실패: ${e.message}`);
    }
  };

  const handleGanttDownload = async (docId) => {
    try {
      window.open(`${API_BASE.replace('/api', '')}/gantt/download/${docId}/`, '_blank');
    } catch {
      alert('간트차트 다운로드 오류');
    }
  };

  // 프로젝트 삭제
  const handleDeleteProject = async () => {
    if (!projectId) return alert('삭제할 프로젝트가 없습니다.');
    if (!window.confirm('정말 프로젝트를 삭제할까요?')) return;
    try {
      const res = await fetch(`${API_BASE}/project/${projectId}/`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
      });
      if (!res.ok) {
        const errText = await res.text();
        alert(`프로젝트 삭제 실패: ${res.status} ${errText}`);
        return;
      }
      alert('프로젝트가 삭제되었습니다.');
      // 상태 리셋
      setProjectId(null);
      setProjectTitle('');
      setSpec1('');
      setSpec2('');
      setDraftIds([null, null]);
      setFinalized(false);
      setFinalSpec('');
      setRequirementIds([]);
      setSidebarItems([]);
      setDocuments({});
      setSimilarProjects([]);
      setShowSimilarPage(false);
      setGanttDocId(null);
      setShowGanttPage(false);
    } catch (e) {
      alert(`프로젝트 삭제 오류: ${e.message}`);
    }
  };

  // 명세서 다운로드
  const handleDownload = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="main-container">
      {/* 🔧 클릭 핸들러 수정: name으로 키를 맞춰야 함 */}
      <Sidebar sidebarItems={sidebarItems} onItemClick={handleSidebarItemClick} />
      <div className="main-content">
        {showSimilarPage ? (
          <SimilarProjects
            projects={similarProjects}
            loading={recommendLoading}
            onBack={() => setShowSimilarPage(false)}
          />
        ) : showGanttPage ? (
          <GanttChart
            ganttDocId={ganttDocId}
            onDownload={handleGanttDownload}
            onBack={() => setShowGanttPage(false)}
          />
        ) : (
          <div className="content-area">
            <div className="content-header">
              <div className="header-content">
                <ProjectHeader
                  projectTitle={projectTitle}
                  setProjectTitle={setProjectTitle}
                  editingTitle={editingTitle}
                  setEditingTitle={setEditingTitle}
                />
                {projectId && (
                  <button
                    style={{
                      marginLeft: 20,
                      background: '#e74c3c',
                      color: '#fff',
                      border: 0,
                      borderRadius: 6,
                      padding: '7px 15px',
                      fontWeight: 600
                    }}
                    onClick={handleDeleteProject}
                  >
                    프로젝트 삭제
                  </button>
                )}
              </div>
            </div>

            <div className="content-body">
              <PlanningWorkflow
                selectedTab={selectedTab}
                setSelectedTab={setSelectedTab}
                onIdeaSave={setIdea}
                idea={idea}
                onSpecUploadClick={() => setShowUploadModal(true)}
                onCreateSpec1={handleGenerateSpec1}
                onCreateSpec2={handleGenerateSpec2}
                onShowSpec1={handleShowSpec1}
                onShowSpec2={handleShowSpec2}
                canCreateSpecSheet={!!projectId}
              />

              <SpecSheetCard
                spec1={spec1}
                spec2={spec2}
                onDownload1={() => handleDownload(spec1, '명세서1안.csv')}
                onDownload2={() => handleDownload(spec2, '명세서2안.csv')}
                onFinalize1={handleFinalize1}
                onFinalize2={handleFinalize2}
                finalized={finalized}
                finalSpec={finalSpec}
                requirementIds={requirementIds}
              />

              {finalized && (
                <div style={{ margin: '20px 0', textAlign: 'right', display: 'flex', gap: 14, justifyContent: 'flex-end' }}>
                  <button
                    className="recommend-btn"
                    style={{ padding: '10px 25px', fontSize: 16, background: '#9d4edd', color: '#fff', border: 0, borderRadius: 7 }}
                    onClick={handleRecommendProjects}
                    disabled={recommendLoading}
                  >
                    {recommendLoading ? '추천중...' : '유사 프로젝트 추천받기'}
                  </button>

                  <button
                    className="gantt-btn"
                    style={{ padding: '10px 25px', fontSize: 16, background: '#00b894', color: '#fff', border: 0, borderRadius: 7 }}
                    onClick={handleGanttCreate}
                  >
                    간트차트 생성하기
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
              />

              <div className="content-grid">
                <DocumentPanel />
              </div>
            </div>
          </div>
        )}
        <div className="ai-panel">
          <AIAssistantChat />
        </div>
      </div>

      <UploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onTextSubmit={handleTextSpecSubmit}
        onFileUpload={handleSpecUploadClick}
      />

      <IdeaViewModal
        open={showIdeaViewModal}
        idea={idea}
        onClose={() => setShowIdeaViewModal(false)}
        onEdit={() => {
          setShowIdeaViewModal(false);
          setTimeout(() => setShowIdeaEditModal(true), 150);
        }}
      />

      <IdeaModal
        open={showIdeaEditModal}
        initialValue={idea}
        onSave={(val) => {
          setIdea(val);
          setShowIdeaEditModal(false);
        }}
        onClose={() => setShowIdeaEditModal(false)}
      />

      {selectedSidebarItem && documents[selectedSidebarItem] && (
        <DocumentViewModal
          title={selectedSidebarItem}
          content={documents[selectedSidebarItem]}
          onClose={() => setSelectedSidebarItem(null)}
        />
      )}
    </div>
  );
};

export default MainHome;
