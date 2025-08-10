// src/components/MainHome/ExtraTools.jsx
import React from 'react';
import '../../styles/MainHome/ExtraTools.css';

const ExtraTools = ({ onTeamAssign, onGanttChart }) => {
  return (
    <div className="extra-tools">
      <h3>📦 추가 도구</h3>
      <div className="extra-tool-buttons">
        <button className="tool-btn blue" onClick={onTeamAssign}>역할 분담</button>
        <button className="tool-btn purple" onClick={onGanttChart}>간트차트 생성</button>
      </div>
    </div>
  );
};

export default ExtraTools;