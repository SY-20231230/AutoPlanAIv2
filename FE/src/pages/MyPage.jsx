// src/pages/MyPage.jsx
import React, { useState, useEffect } from 'react';
import { User, Trash2, Edit3, Users, Calendar, Clock, Plus, FolderPlus } from 'lucide-react';
import '../styles/MyPage.css';
import ProjectDetailModal from '../components/ProjectDetailModal';
import ProfileEditModal from '../components/MyPage/ProfileEditModal';
import TechStackModal from '../components/MyPage/TechStackModal';

import dummyProjects from '../data/dummyProjects';

const MyPage = ({ isLoggedIn, userName, onLogout }) => {
  // 프로젝트 관리 상태
  const [projects, setProjects] = useState(dummyProjects);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editProject, setEditProject] = useState(null);

  // 사용자 개인 프로필 상태 초기값 빈 객체로 변경
  const [userProfile, setUserProfile] = useState({});

  // 개인정보 변경 모달 상태
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  // 기술 스택 관리 모달 상태 (프로젝트 팀원 관리용)
  const [showTechStack, setShowTechStack] = useState(false);

  // 사용자 정보 API 호출 (마운트 시 or isLoggedIn 변경 시)
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await fetch('http://172.30.1.61:8000/api/user/profile/', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (!res.ok) {
          throw new Error('사용자 정보 불러오기 실패');
        }
        const data = await res.json();
        setUserProfile(data);
      } catch (error) {
        console.error(error);
        // 예: 토큰 만료 시 로그아웃 처리
        onLogout();
      }
    };

    if (isLoggedIn) {
      fetchUserProfile();
    } else {
      setUserProfile({});
    }
  }, [isLoggedIn, onLogout]);

  // 삭제 확인 모달 열기
  const confirmDelete = (id) => {
    setDeleteTargetId(id);
    setShowConfirmModal(true);
  };

  // 삭제 확정
  const handleDelete = () => {
    setProjects(projects.filter((proj) => proj.id !== deleteTargetId));
    setShowConfirmModal(false);
  };

  // 프로젝트 수정 열기
  const handleEdit = (proj) => {
    setEditProject(proj);
  };

  // 프로젝트 수정 저장
  const handleSaveProject = (updatedProject) => {
    setProjects(projects.map(proj => (proj.id === updatedProject.id ? updatedProject : proj)));
    setEditProject(null);
  };

  // 개인정보 변경 저장
  const handleSaveProfile = (profileData) => {
    setUserProfile(profileData);
    alert('개인정보가 저장되었습니다!');
    setShowProfileEdit(false);
  };

  // 기술 스택 저장 (프로젝트 팀원 정보 갱신)
  const handleSaveTechStack = (newTeam) => {
    if (editProject) {
      const updatedProject = { ...editProject, team: newTeam };
      handleSaveProject(updatedProject);
    }
    setShowTechStack(false);
  };

  // 통계 계산
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active' || !p.status).length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalTeamMembers = projects.reduce((acc, proj) => acc + (proj.team?.length || 0), 0);

  return (
    <div className="mypage-container">
      <div className="mypage-wrapper">
        {/* 프로필 헤더 */}
        <div className="mypage-header">
          <div className="profile-section">
            <User className="profile-avatar" />
            <div className="profile-info">
              <div className="profile-name">{userProfile.name || 'Loading...'}</div>
              <div className="profile-email">{userProfile.email || ''}</div>
              <div className="profile-actions">
                <button
                  className="profile-btn"
                  onClick={() => setShowProfileEdit(true)}
                  disabled={!userProfile.name}
                >
                  <Edit3 size={16} />
                  개인정보 변경
                </button>
                <button
                  className={`profile-btn ${!editProject ? 'secondary' : ''}`}
                  onClick={() => setShowTechStack(true)}
                  disabled={!editProject}
                  title={editProject ? "팀 기술 스택 관리" : "먼저 프로젝트 수정을 눌러주세요"}
                >
                  <Users size={16} />
                  기술 스택 관리
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 통계 섹션 */}
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-number">{totalProjects}</div>
            <div className="stat-label">전체 프로젝트</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{activeProjects}</div>
            <div className="stat-label">진행중인 프로젝트</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{completedProjects}</div>
            <div className="stat-label">완료된 프로젝트</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalTeamMembers}</div>
            <div className="stat-label">참여 팀원 수</div>
          </div>
        </div>

        {/* 프로젝트 관리 섹션 */}
        <div className="section-title">내 프로젝트 관리</div>
        
        {projects.length > 0 ? (
          <div className="projects-grid">
            {projects.map((proj) => (
              <div className="project-card" key={proj.id}>
                <div className="project-header">
                  <div className="project-title">{proj.name}</div>
                </div>
                <div className="project-description">{proj.desc || proj.description}</div>
                
                <div className="project-meta">
                  <div className="meta-item">
                    <Calendar size={16} />
                    <span className="meta-label">기간:</span>
                    <span className="meta-value">{proj.period || '미정'}</span>
                  </div>
                  <div className="meta-item">
                    <Clock size={16} />
                    <span className="meta-label">상태:</span>
                    <span className="meta-value">{proj.status === 'completed' ? '완료' : '진행중'}</span>
                  </div>
                  {proj.team && proj.team.length > 0 && (
                    <div className="meta-item">
                      <Users size={16} />
                      <span className="meta-label">팀원:</span>
                      <div className="team-members">
                        {proj.team.slice(0, 3).map((member, idx) => (
                          <span key={idx} className="member-tag">
                            {typeof member === 'string' ? member : member.name || member.role}
                          </span>
                        ))}
                        {proj.team.length > 3 && (
                          <span className="member-tag">+{proj.team.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="project-actions">
                  <button className="action-btn edit" onClick={() => handleEdit(proj)}>
                    <Edit3 size={14} />
                    수정
                  </button>
                  <button className="action-btn delete" onClick={() => confirmDelete(proj.id)}>
                    <Trash2 size={14} />
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <FolderPlus className="empty-state-icon" />
            <div className="empty-state-title">등록된 프로젝트가 없습니다</div>
            <div className="empty-state-desc">
              새로운 프로젝트를 시작해보세요. 팀원들과 함께 멋진 결과를 만들어보세요!
            </div>
            <button className="empty-state-action">
              <Plus size={16} />
              프로젝트 추가
            </button>
          </div>
        )}

        {/* 모달들 */}
        {showConfirmModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <div className="modal-title">프로젝트 삭제</div>
                <button className="modal-close" onClick={() => setShowConfirmModal(false)}>
                  ×
                </button>
              </div>
              <p>정말 이 프로젝트를 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.</p>
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowConfirmModal(false)}>
                  취소
                </button>
                <button className="modal-btn primary" onClick={handleDelete}>
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}

        {editProject && (
          <ProjectDetailModal
            project={editProject}
            onClose={() => setEditProject(null)}
            onSave={handleSaveProject}
            userProfile={userProfile}
          />
        )}

        {showProfileEdit && (
          <ProfileEditModal
            profile={userProfile}
            onClose={() => setShowProfileEdit(false)}
            onSave={handleSaveProfile}
            allowTechStackEditing={true}
          />
        )}

        {showTechStack && editProject && (
          <TechStackModal
            team={editProject.team}
            onClose={() => setShowTechStack(false)}
            onSave={handleSaveTechStack}
          />
        )}
      </div>
    </div>
  );
};

export default MyPage;