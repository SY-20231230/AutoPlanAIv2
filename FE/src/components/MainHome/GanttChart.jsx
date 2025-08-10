// src/components/MainHome/GanttChart.jsx
import React from 'react';
import '../../styles/MainHome/GanttChart.css';

const sampleTasks = [
  { id: 1, name: '아이디어 입력', start: 0, duration: 2 },
  { id: 2, name: '기획서 작성', start: 2, duration: 3 },
  { id: 3, name: '기능명세서 생성', start: 5, duration: 2 },
  { id: 4, name: '팀원 분배', start: 7, duration: 2 },
  { id: 5, name: '간트차트 완성', start: 9, duration: 1 },
];

const GanttChart = () => {
  return (
    <div className="gantt-container">
      <h3>간트차트</h3>
      <div className="gantt-chart">
        {sampleTasks.map(task => (
          <div key={task.id} className="gantt-row">
            <div className="gantt-label">{task.name}</div>
            <div
              className="gantt-bar"
              style={{
                marginLeft: `${task.start * 30}px`,
                width: `${task.duration * 30}px`,
              }}
            >
              {task.duration}일
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GanttChart;