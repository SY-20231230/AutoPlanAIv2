import React, { useRef } from 'react';

const ProjectHeader = ({
  projectTitle, setProjectTitle,
  editingTitle, setEditingTitle
}) => {
  const titleInputRef = useRef(null);

  const handleTitleSave = () => setEditingTitle(false);

  const handleTitleClick = () => {
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current && titleInputRef.current.focus(), 50);
  };

  return (
    <div className="header-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {editingTitle ? (
        <input
          ref={titleInputRef}
          type="text"
          value={projectTitle}
          onChange={e => setProjectTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={e => {
            if (e.key === "Enter") handleTitleSave();
          }}
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: "0.2em 0.6em",
            minWidth: 220
          }}
        />
      ) : (
        <>
          <span style={{ fontSize: "1.25rem", fontWeight: 600 }}>{projectTitle}</span>
          <button
            className="edit-btn"
            style={{
              marginLeft: 6,
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#777"
            }}
            title="제목 수정"
            onClick={handleTitleClick}
          >
            {/* 연필 SVG */}
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.232 5.232l-2.464-2.464a1 1 0 0 0-1.414 0l-7.071 7.07a1 1 0 0 0-.263.472l-1 4a1 1 0 0 0 1.213 1.213l4-1a1 1 0 0 0 .472-.263l7.07-7.07a1 1 0 0 0 0-1.415z" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};
export default ProjectHeader;