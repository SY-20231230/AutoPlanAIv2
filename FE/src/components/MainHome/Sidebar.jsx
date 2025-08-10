import React from 'react';

const Sidebar = ({ sidebarItems, onItemClick }) => (
  <div className="sidebar">
    <div className="sidebar-header">
      {/* 추가 기능 버튼 등 필요시 여기에 */}
    </div>
    <div className="sidebar-content">
      <div className="sidebar-section-title">최근 생성한 자료</div>
      {sidebarItems.map((item, index) => (
        <div
          key={index}
          className="sidebar-item"
          onClick={() => onItemClick(item)}
          style={{ cursor: 'pointer' }}
        >
          <item.icon className="icon-sm" />
          <span className="sidebar-item-text">{item.name}</span>
        </div>
      ))}
    </div>
  </div>
);

export default Sidebar;