import React, { useState } from 'react';
import {
  ChevronRight, Upload, BarChart3, FileSpreadsheet, Users,
  Lightbulb, FileText
} from 'lucide-react';
import IdeaModal from './IdeaModal';

const PlanningWorkflow = ({
  selectedTab, setSelectedTab,
  onIdeaSave,
  idea,
  onSpecUploadClick,
  onCreateSpec1,
  onCreateSpec2,
  onShowSpec1,
  onShowSpec2,
  canCreateSpecSheet,
}) => {
  const [showIdeaModal, setShowIdeaModal] = useState(false);

  // 워크플로우 단계 안내 (existing/new 별도)
  const steps = selectedTab === 'existing'
    ? [
        { icon: <Upload className="icon-lg" />, title: '기획서 업로드', desc: '직접 작성 또는 파일 업로드' },
        { icon: <BarChart3 className="icon-lg" />, title: '기획서 분석', desc: 'USP 및 유사 기능 자동 추출' },
        { icon: <FileSpreadsheet className="icon-lg" />, title: '기능명세서 생성', desc: '명세서 1/2안 자동생성, 다운로드' },
        { icon: <Users className="icon-lg" />, title: '팀 구성', desc: '프로젝트 팀을 추천 (선택)' }
      ]
    : [
        { icon: <Lightbulb className="icon-lg" />, title: '아이디어 입력', desc: '새 아이디어를 입력하세요' },
        { icon: <FileText className="icon-lg" />, title: '기획서 생성', desc: 'AI가 기획서를 자동생성' },
        { icon: <FileSpreadsheet className="icon-lg" />, title: '기능명세서 생성', desc: '명세서 1/2안 자동생성, 다운로드' },
        { icon: <Users className="icon-lg" />, title: '팀 분배', desc: '최적화된 팀 구성을 제안 (선택)' }
      ];

  return (
    <div className="workflow-section">
      <div className="workflow-card">
        <div className="workflow-title">프로젝트 시작하기</div>
        {/* 상단 탭 */}
        <div className="workflow-tabs">
          <button
            className={`workflow-tab${selectedTab === 'existing' ? ' active' : ' inactive'}`}
            onClick={() => setSelectedTab('existing')}
          >
            기획서가 이미 있어요!
          </button>
          <button
            className={`workflow-tab${selectedTab === 'new' ? ' active' : ' inactive'}`}
            onClick={() => setSelectedTab('new')}
          >
            기획서도 만들어주세요!
          </button>
        </div>
        {/* 버튼 바 */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '22px 0 18px 0', flexWrap: 'wrap' }}>
          {selectedTab === 'existing' && (
            <>
              <button
                className="workflow-primary-btn"
                style={{ width: 120, fontSize: 15, background: '#2563eb', color: '#fff' }}
                onClick={onSpecUploadClick}
                type="button"
              >
                <Upload size={16} style={{ marginRight: 7 }} />
                기획서 업로드
              </button>
              <button
                className="workflow-primary-btn"
                style={{ background: canCreateSpecSheet ? '#facc15' : '#e4e4e7', color: '#212121', fontSize: 15, width: 110 }}
                disabled={!canCreateSpecSheet}
                onClick={onCreateSpec1}
                type="button"
              >
                1안 생성
              </button>
              <button
                className="workflow-primary-btn"
                style={{ background: canCreateSpecSheet ? '#f472b6' : '#e4e4e7', color: '#fff', fontSize: 15, width: 110 }}
                disabled={!canCreateSpecSheet}
                onClick={onCreateSpec2}
                type="button"
              >
                2안 생성
              </button>
              <button
                className="workflow-primary-btn"
                style={{ background: canCreateSpecSheet ? '#10b981' : '#e4e4e7', color: '#fff', fontSize: 15, width: 100 }}
                disabled={!canCreateSpecSheet}
                onClick={onShowSpec1}
                type="button"
              >
                1안 보기
              </button>
              <button
                className="workflow-primary-btn"
                style={{ background: canCreateSpecSheet ? '#60a5fa' : '#e4e4e7', color: '#fff', fontSize: 15, width: 100 }}
                disabled={!canCreateSpecSheet}
                onClick={onShowSpec2}
                type="button"
              >
                2안 보기
              </button>
            </>
          )}
          {selectedTab === 'new' && (
            <>
              <button
                onClick={() => setShowIdeaModal(true)}
                className="workflow-primary-btn"
                style={{ width: 120, fontSize: 15 }}
                type="button"
              >
                <Lightbulb size={17} style={{ marginRight: 6 }} />
                아이디어 입력
              </button>
              {/* 아이디어 입력 후 기획서 생성 등 추가 가능 */}
              <button
                className="workflow-primary-btn"
                style={{
                  width: 120,
                  fontSize: 15,
                  background: idea ? '#2563eb' : '#94a3b8',
                  cursor: idea ? 'pointer' : 'not-allowed',
                  opacity: idea ? 1 : 0.6
                }}
                disabled={!idea}
                //onClick={onCreateSpec} // "AI 기획서 생성" 등 향후 연결
                type="button"
              >
                <FileText size={16} style={{ marginRight: 7 }} />
                기획서 생성
              </button>
              <button
                className="workflow-primary-btn"
                style={{ background: canCreateSpecSheet ? '#facc15' : '#e4e4e7', color: '#212121', fontSize: 15, width: 110 }}
                disabled={!canCreateSpecSheet}
                onClick={onCreateSpec1}
                type="button"
              >
                1안 생성
              </button>
              <button
                className="workflow-primary-btn"
                style={{ background: canCreateSpecSheet ? '#f472b6' : '#e4e4e7', color: '#fff', fontSize: 15, width: 110 }}
                disabled={!canCreateSpecSheet}
                onClick={onCreateSpec2}
                type="button"
              >
                2안 생성
              </button>
              <button
                className="workflow-primary-btn"
                style={{ background: canCreateSpecSheet ? '#10b981' : '#e4e4e7', color: '#fff', fontSize: 15, width: 100 }}
                disabled={!canCreateSpecSheet}
                onClick={onShowSpec1}
                type="button"
              >
                1안 보기
              </button>
              <button
                className="workflow-primary-btn"
                style={{ background: canCreateSpecSheet ? '#60a5fa' : '#e4e4e7', color: '#fff', fontSize: 15, width: 100 }}
                disabled={!canCreateSpecSheet}
                onClick={onShowSpec2}
                type="button"
              >
                2안 보기
              </button>
            </>
          )}
        </div>

        {/* 아이디어 입력 모달 */}
        <IdeaModal
          open={showIdeaModal}
          onClose={() => setShowIdeaModal(false)}
          onSave={txt => {
            onIdeaSave(txt);
            setShowIdeaModal(false);
          }}
        />

        {/* 단계 안내 */}
        <div className="workflow-steps">
          {steps.map((step, idx) => (
            <div key={idx} className="workflow-step">
              <div className="workflow-step-icon">{step.icon}</div>
              <div className="workflow-step-title">{step.title}</div>
              <div className="workflow-step-desc">{step.desc}</div>
              {idx < steps.length - 1 && <ChevronRight className="workflow-arrow" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlanningWorkflow;