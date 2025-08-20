// src/pages/MainHome.jsx
import React, { useEffect, useState } from 'react';
import Sidebar from '../components/MainHome/Sidebar';
import PlanningWorkflow from '../components/MainHome/PlanningWorkflow';
import AIAssistantChat from '../components/MainHome/AIAssistantChat';
import SpecSheetCard from '../components/MainHome/SpecSheetCard';
import DocumentCreate from '../components/MainHome/DocumentCreate';
import GanttChart from '../components/MainHome/GanttChart';
import FinalDocView from '../components/MainHome/FinalDocView';
import SimilarProjects from '../components/MainHome/SimilarProjects';
import TeamAutoAssign from '../components/MainHome/TeamAutoAssign';
import FlowFooter from '../components/FlowFooter'; // ✅ 외부 컴포넌트 임포트

import { FileText } from 'lucide-react';
import '../styles/MainHome.css';

import api, { API_BASE } from '../api/axiosInstance';

// NOTE: StepToolbar 제거

const postJson = (url, body = {}) => api.post(url, body);
const getJson  = (url, params)    => api.get(url, { params });

const pretty = (v) => {
  try {
    if (typeof v === 'string') return JSON.stringify(JSON.parse(v), null, 2);
    return JSON.stringify(v, null, 2);
  } catch {
    return v || '';
  }
};

const pickDraftId = (d) =>
  d?.draft_id ?? d?.RequirementDraft_id ?? d?.id ?? d?.pk ?? null;

const ContentWrapper = ({ children }) => (
  <div className="content-wrapper">
    <div className="content-inner">{children}</div>
  </div>
);

/** (참고) 백엔드 stage → 프론트 stage 매핑: 복원 기능 삭제로 현재 직접 사용하진 않음 */
function mapStageToUI(stage) {
  switch ((stage || '').toLowerCase()) {
    case 'g1':
    case 'g2': return 'SPECS';
    case 'g3': return 'SIMILAR';
    case 'team': return 'TEAM';
    case 'gantt': return 'GANTT';
    case 'final':
    case 'outputs': return 'FINAL';
    case 'init':
    default: return 'IDLE';
  }
}

export default function MainHome() {
  const [sidebarItems, setSidebarItems] = useState([]);
  const [documents, setDocuments] = useState({});
  const [selectedSidebarItem, setSelectedSidebarItem] = useState(null);

  const [spec1, setSpec1] = useState('');
  const [spec2, setSpec2] = useState('');
  const [draftIds, setDraftIds] = useState([null, null]);

  const [idea, setIdea] = useState('');
  const [projectId, setProjectId] = useState(null);

  const [finalized, setFinalized] = useState(false);
  const [finalSpec, setFinalSpec] = useState('');
  const [requirementIds, setRequirementIds] = useState([]);

  // IDLE | SPECS | SIMILAR | TEAM | GANTT | FINAL
  const [stage, setStage] = useState('IDLE');
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState('');

  const [ganttDocId, setGanttDocId] = useState(null);
  const [finalDocId, setFinalDocId] = useState(null);

  // SPECS로 들어올 때 상단으로 살짝 스크롤
  useEffect(() => {
    if (stage === 'SPECS') {
      requestAnimationFrame(() => {
        document.getElementById('specs-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [stage]);

  /** ===== 초안 리스트(1안/2안) ===== */
  const loadDrafts = async (pidArg) => {
    const pid = pidArg || projectId;
    if (!pid) throw new Error('프로젝트가 없습니다. 먼저 생성해 주세요.');

    const res = await getJson(`/project/${pid}/drafts/`);
    const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('명세서 초안이 없습니다. 먼저 1안/2안을 생성하세요.');
    }

    const lower = (t) => (t || '').toLowerCase();
    const g1 = list.find((d) => lower(d.type) === 'gemini_1' || lower(d.type) === 'gemini1') || list[0];
    const g2 = list.find((d) => lower(d.type) === 'gemini_2' || lower(d.type) === 'gemini2') || list[1];

    const id1 = g1 ? (pickDraftId(g1) || null) : null;
    const id2 = g2 ? (pickDraftId(g2) || null) : null;

    setDraftIds([id1, id2]);
    setSpec1(g1 ? (g1.content ? pretty(g1.content) : (g1.summary || '(내용 없음)')) : '');
    setSpec2(g2 ? (g2.content ? pretty(g2.content) : (g2.summary || '(내용 없음)')) : '');

    return { id1, id2, g1, g2, list };
  };

  /** ===== 유사 → 간트 생성 ===== (progress/save 제거) */
  const handleSimilarConfirm = async (pidArg) => {
    const pid = pidArg || projectId;
    try {
      setBusy(true); setBusyMsg('간트차트 생성 중…');
      const body = {
        start_date: new Date().toISOString().slice(0,10),
        total_weeks: 12,
        parts: ['백엔드','프론트엔드','인공지능','운영'],
        filename: '프로젝트1차간트',
      };
      const res = await postJson(`/project/${pid}/gantt/`, body);
      const data = res.data;
      const docId = data.document_id || data.doc_id || data.id;
      setGanttDocId(docId);

      setStage('GANTT');
    } catch (e) {
      alert(`간트차트 생성 실패: ${e?.response?.data?.detail || e.message}`);
    } finally { setBusy(false); setBusyMsg(''); }
  };

  const handleGanttConfirm = async () => {
    setFinalDocId('temp-local-id');
    setStage('FINAL');
  };

  /** ===== “여기서 종료” 공통 처리 ===== */
  const finishFlow = () => {
    setStage('IDLE');
    setBusyMsg('');
  };

  /** ===== 사이드바 ===== */
  const addSidebarItem = (name, icon, content) => {
    if (!sidebarItems.some((i) => i.name === name)) {
      setSidebarItems((prev) => [...prev, { name, icon, active: false }]);
    }
    setDocuments((prev) => ({ ...prev, [name]: content }));
  };

  const handleSidebarItemClick = (item) => {
    setSelectedSidebarItem(item?.name ?? '');
    const name = (item?.name || '').toLowerCase();
    const group = (item?.group || '').toLowerCase();
    const type  = (item?.type  || '').toLowerCase();
    const looksLikeDraft =
      type === 'draft' ||
      group.includes('draft') ||
      name.includes('draft') || name.includes('초안') || name.includes('명세서');

    if (looksLikeDraft) setStage('SPECS');
  };

  /** ===== 메인 콘텐츠 렌더링 ===== */
  const renderCenter = () => {
    switch (stage) {
      case 'SPECS':
        return (
          <ContentWrapper>
            <div id="specs-card">
              <SpecSheetCard
                spec1={spec1}
                spec2={spec2}
                projectId={projectId}
                setSpec1={setSpec1}
                setSpec2={setSpec2}
                setDraftIds={setDraftIds}
                getJson={getJson}
                postJson={postJson}
                setBusy={setBusy}
                setBusyMsg={setBusyMsg}
                finalized={finalized}
                finalSpec={finalSpec}
                requirementIds={requirementIds}
              />
            </div>
          </ContentWrapper>
        );
      case 'SIMILAR':
        return (
          <ContentWrapper>
            <SimilarProjects
              projectId={projectId}
              onConfirm={() => setStage('TEAM')}
            />
          </ContentWrapper>
        );
      case 'TEAM':
        return (
          <ContentWrapper>
            <TeamAutoAssign
              projectId={projectId}
              onNext={() => handleSimilarConfirm()}
            />
          </ContentWrapper>
        );
      case 'GANTT':
        return (
          <ContentWrapper>
            <GanttChart
              ganttDocId={ganttDocId}
              onDownload={() => window.open(`${API_BASE}/gantt/download/${ganttDocId}/`, '_blank')}
            />
           
          </ContentWrapper>
        );
      case 'FINAL':
        return (
          <ContentWrapper>
            <FinalDocView
              documentId={finalDocId}
              onDownload={() => alert('최종문서 API 준비되면 다운로드 연결합니다.')}
            />
            <div style={{ textAlign:'right', marginTop:12 }} />
          </ContentWrapper>
        );
      case 'IDLE':
      default:
        return (
          <ContentWrapper>
            <div className="content-body">
              <PlanningWorkflow
                onIdeaSave={(text) => {
                  setIdea(text);
                  addSidebarItem('기획서(직접입력)', FileText, text);
                }}
                idea={idea}
                projectId={projectId}
                setProjectId={setProjectId}
                setBusy={setBusy}
                setBusyMsg={setBusyMsg}
                postJson={postJson}
                onProjectCreated={(pid)=>{ setProjectId(pid); setStage('SPECS'); }}
              />
            </div>
          </ContentWrapper>
        );
    }
  };

  /** ===== 단계별 하단 푸터 버튼 구성 ===== */
  const renderBottomFooter = () => {
    switch (stage) {
      case 'SIMILAR':
        return (
          <FlowFooter>
            <div className="left">
              <button className="btn-outline" onClick={() => setStage('SPECS')}>뒤로</button>
            </div>
            <div className="right">
              <button className="btn-secondary" onClick={() => setStage('FINAL')}>
                최종 문서로 건너뛰기
              </button>
              <button className="btn-primary" onClick={() => setStage('TEAM')}>
                팀원 분배로
              </button>
              <button className="btn-success" onClick={finishFlow}>
                여기서 종료
              </button>
            </div>
          </FlowFooter>
        );

      case 'TEAM':
        return (
          <FlowFooter>
            <div className="left">
              <button className="btn-outline" onClick={() => setStage('SIMILAR')}>뒤로</button>
            </div>
            <div className="right">
              <button className="btn-primary" onClick={() => handleSimilarConfirm()}>
                간트 차트로
              </button>
              <button className="btn-success" onClick={finishFlow}>
                완료
              </button>
            </div>
          </FlowFooter>
        );

      case 'GANTT':
        return (
          <FlowFooter>
            <div className="left">
              <button className="btn-outline" onClick={() => setStage('TEAM')}>뒤로</button>
            </div>
            <div className="right">
              <button className="btn-success" onClick={handleGanttConfirm}>
                완료 (최종문서로)
              </button>
            </div>
          </FlowFooter>
        );

      case 'FINAL':
        return (
          <FlowFooter>
            <div className="left">
              <button className="btn-outline" onClick={() => setStage('SIMILAR')}>뒤로</button>
            </div>
            <div className="right">
              <button className="btn-success" onClick={finishFlow}>
                완료
              </button>
            </div>
          </FlowFooter>
        );

      // IDLE, SPECS 등은 푸터 없음
      default:
        return null;
    }
  };

  return (
    <div className="page-with-toolbar">
      {/* StepToolbar 제거됨 */}

      <div className="main-grid">
        {busy && (
          <div className="global-toast">
            {busyMsg || '처리 중…'}
          </div>
        )}

        <aside className="left-rail">
          <Sidebar sidebarItems={sidebarItems} onItemClick={handleSidebarItemClick} />
        </aside>

        <main className="center-pane">
          {renderCenter()}

          {/* ▼ 하단 공용 푸터 (단계별 버튼 배치) */}
          {renderBottomFooter()}
        </main>

        <aside className="right-rail">
          <AIAssistantChat />
        </aside>

        {selectedSidebarItem && documents[selectedSidebarItem] && (
          <DocumentCreate
            title={selectedSidebarItem}
            content={documents[selectedSidebarItem]}
            onClose={() => setSelectedSidebarItem(null)}
          />
        )}
      </div>
    </div>
  );
}