// src/components/MainHome/DocumentViewModal.jsx
import React from 'react';

const DocumentViewModal = ({ title, content, onClose }) => (
  <div className="modal-backdrop">
    <div className="modal-content">
      <h3>{title}</h3>
      <pre style={{whiteSpace: 'pre-wrap'}}>{content}</pre>
      <button onClick={onClose}>닫기</button>
    </div>
  </div>
);

export default DocumentViewModal;