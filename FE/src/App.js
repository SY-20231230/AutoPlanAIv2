import React, { useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';

import Header from './components/landing/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MainHome from './pages/MainHome';
import ProtectedRoute from './components/ProtectedRoute';

import SimilarProjects from './components/MainHome/SimilarProjects';
import TeamAutoAssign from './components/MainHome/TeamAutoAssign';
import GanttChart from './components/MainHome/GanttChart';
import FinalDocView from './components/MainHome/FinalDocView';
import Sidebar from './components/MainHome/Sidebar';
import AIAssistantChat from './components/MainHome/AIAssistantChat';

import PlanningWorkflow from './components/MainHome/PlanningWorkflow';
import SpecSheetCard from './components/MainHome/SpecSheetCard';

import './styles/MainHome.css';

/* 공통 레이아웃 */
function ContentWrapper({ children }) {
  return (
    <div className="content-wrapper">
      <div className="content-inner">{children}</div>
    </div>
  );
}
function ProjectShell({ children }) {
  return (
    <div className="page-with-toolbar">
      <div className="main-grid">
        <aside className="left-rail">
          <Sidebar sidebarItems={[]} onItemClick={() => {}} />
        </aside>
        <main className="center-pane">
          <ContentWrapper>{children}</ContentWrapper>
        </main>
        <aside className="right-rail">
          <AIAssistantChat />
        </aside>
      </div>
    </div>
  );
}

/* Route Wrappers */
function SimilarPage() {
  const { projectId } = useParams();
  return (
    <ProjectShell>
      <SimilarProjects projectId={projectId} />
    </ProjectShell>
  );
}
function TeamAssignPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  return (
    <ProjectShell>
      <TeamAutoAssign
        projectId={projectId}
        onNext={() => navigate(`/project/${projectId}/gantt`)}
      />
    </ProjectShell>
  );
}
function GanttPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  return (
    <ProjectShell>
      <GanttChart projectId={projectId} onSaveGantt={() => {}} />
      <div style={{ marginTop: 12, textAlign: 'right' }}>
       
      </div>
    </ProjectShell>
  );
}
function FinalDocPage() {
  const { projectId } = useParams();
  return (
    <ProjectShell>
      <div className="app-card">
        <FinalDocView projectId={projectId} />
      </div>
    </ProjectShell>
  );
}

/* App */
function App() {
  const initialLoggedIn = useMemo(
    () => !!(localStorage.getItem('access') || localStorage.getItem('accessToken')),
    []
  );
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn);
  const [userName, setUserName] = useState(
    localStorage.getItem('username') || localStorage.getItem('userName') || ''
  );

  const handleLogin = (payload) => {
    const access = payload?.access || payload?.accessToken;
    const refresh = payload?.refresh || payload?.refreshToken;
    if (access) localStorage.setItem('access', access);
    if (refresh) localStorage.setItem('refresh', refresh);
    const finalName =
      payload?.username || payload?.userName || payload?.name || localStorage.getItem('username') || '';
    if (finalName) {
      localStorage.setItem('username', finalName);
      localStorage.setItem('userName', finalName);
    }
    setUserName(finalName);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('');
    ['access','refresh','username','accessToken','refreshToken','userName','name','email'].forEach(k => localStorage.removeItem(k));
  };

  return (
    <>
      <Header isLoggedIn={isLoggedIn} userName={userName} onLogout={handleLogout} />
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/signup" element={<Signup />} />

        {/* 보호 라우트: 메인 */}
        <Route
          path="/main"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <MainHome isLoggedIn={isLoggedIn} userName={userName} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* 프로젝트 단계 딥링크 (중복 없이 한 번씩만) */}
        <Route
          path="/project/:projectId/similar"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <SimilarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/team-assign"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <TeamAssignPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/gantt"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <GanttPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/final-doc"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <FinalDocPage />
            </ProtectedRoute>
          }
        />

        {/* 기타(기존 페이지 진입) */}
        <Route
          path="/project/:projectId/planning"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <ProjectShell><PlanningWorkflow /></ProjectShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/spec-sheet"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <ProjectShell><SpecSheetCard /></ProjectShell>
            </ProtectedRoute>
          }
        />

        {/* 루트/와일드카드 */}
        <Route
          path="/"
          element={
            isLoggedIn ? <Navigate to="/main" replace /> : <Home isLoggedIn={isLoggedIn} userName={userName} onLogout={handleLogout} />
          }
        />
        <Route path="*" element={isLoggedIn ? <Navigate to="/main" replace /> : <Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;