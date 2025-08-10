import React, { useState, useEffect } from 'react';
import '../styles/ProjectDetailModal.css';

const ProjectDetailModal = ({ project, onClose, onSave }) => {
  const [ideaText, setIdeaText] = useState(project.ideaText || '');
  const [draftSpec] = useState(project.draftSpec || []);
  const [finalSpec] = useState(project.finalSpec || []);
  const [team, setTeam] = useState(project.team || [{ name: '', position: '', stack: '' }]);

  const [isChanged, setIsChanged] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // 변경사항 감지: ideaText, team 중 하나라도 달라지면 true
  useEffect(() => {
    const isIdeaChanged = ideaText !== (project.ideaText || '');
    const isTeamChanged = JSON.stringify(team) !== JSON.stringify(project.team || [{ name: '', position: '', stack: '' }]);
    setIsChanged(isIdeaChanged || isTeamChanged);
    if (!isChanged) setSaveMessage('');
  }, [ideaText, team, project.ideaText, project.team, isChanged]);

  // 팀원 수정 함수
  const handleTeamChange = (index, key, value) => {
    const newTeam = [...team];
    newTeam[index][key] = value;
    setTeam(newTeam);
  };

  const addTeamMember = () => {
    setTeam([...team, { name: '', position: '', stack: '' }]);
  };

  const removeTeamMember = (index) => {
    if (team.length <= 1) return;
    const newTeam = [...team];
    newTeam.splice(index, 1);
    setTeam(newTeam);
  };

  // 최종 저장 시 프로젝트 정보 업데이트 콜백
  const handleSave = () => {
    onSave({
      ...project,
      ideaText,
      draftSpec,
      finalSpec,
      team,
    });
    setSaveMessage('변경되었습니다!');
    setIsChanged(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content large">
        <h2>프로젝트 수정</h2>

        <label>아이디어 (프롬프트)</label>
        <textarea
          className="fixed-textarea"
          rows={4}
          value={ideaText}
          onChange={e => setIdeaText(e.target.value)}
        />

        <label>기능명세서 1안</label>
        <textarea
          className="fixed-textarea"
          rows={6}
          value={JSON.stringify(draftSpec, null, 2)}
          readOnly
        />

        <label>기능명세서 2안 (최종)</label>
        <textarea
          className="fixed-textarea"
          rows={6}
          value={JSON.stringify(finalSpec, null, 2)}
          readOnly
        />

        <label>팀원 정보 수정</label>
        {team.map((member, idx) => (
          <div key={idx} className="team-member-row">
            <input
              placeholder="이름"
              value={member.name}
              onChange={e => handleTeamChange(idx, 'name', e.target.value)}
            />
            <input
              placeholder="포지션"
              value={member.position}
              onChange={e => handleTeamChange(idx, 'position', e.target.value)}
            />
            <input
              placeholder="스택"
              value={member.stack}
              onChange={e => handleTeamChange(idx, 'stack', e.target.value)}
            />
            <button onClick={() => removeTeamMember(idx)}>삭제</button>
          </div>
        ))}
        <button onClick={addTeamMember} className="add-team-btn">팀원 추가</button>

        {saveMessage && <div className="save-message">{saveMessage}</div>}

        <div className="modal-actions">
          <button onClick={handleSave} disabled={!isChanged}>저장</button>
          <button onClick={onClose} className="cancel-btn">취소</button>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailModal;