import React, { useState } from 'react';
import '../../styles/MainHome/UploadModal.css';

const UploadModal = ({ open, onClose, onTextSubmit, onFileUpload }) => {
  const [text, setText] = useState('');

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>기획서 입력</h3>
        <textarea
          rows={6}
          placeholder="직접 입력하거나 파일을 업로드할 수 있어요."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="modal-buttons">
          <button onClick={() => onTextSubmit(text)}>입력 완료</button>
          <button onClick={onFileUpload}>파일 업로드</button>
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;