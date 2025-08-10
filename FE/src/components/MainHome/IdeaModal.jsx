import React, { useState, useRef, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';

const IdeaModal = ({ open, onClose, onSave, initialValue }) => {
  const [value, setValue] = useState(initialValue || '');
  const inputRef = useRef();

  // 모달이 열릴 때 input 포커싱 & 초기값 설정
  useEffect(() => {
    if (open) {
      setValue(initialValue || '');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, initialValue]);

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{
        minWidth: 400, padding: 32, background: '#fff', borderRadius: 12, position: 'relative', zIndex: 2
      }}>
        <button
          aria-label="닫기"
          style={{
            position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', cursor: 'pointer'
          }}
          onClick={onClose}
        >
          <X size={22} />
        </button>
        <h3 style={{ fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lightbulb size={22} style={{ color: '#facc15' }} /> 아이디어 입력/수정
        </h3>
        <textarea
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="새로운 프로젝트 아이디어를 입력하세요"
          style={{
            width: '100%', minHeight: 90, padding: '0.9rem 1.2rem',
            border: '1.2px solid #d1d5db', borderRadius: 8,
            fontSize: 16, marginBottom: 22, resize: 'vertical'
          }}
        />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="modal-cancel-btn"
            style={{
              padding: '0.65rem 1.4rem',
              background: '#f4f4f5',
              border: 'none',
              borderRadius: 7,
              fontSize: 16,
              color: '#444'
            }}
          >
            취소
          </button>
          <button
            onClick={() => { if (value.trim()) { onSave(value.trim()); } }}
            className="modal-save-btn"
            style={{
              padding: '0.65rem 1.6rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              fontSize: 16,
              fontWeight: 500
            }}
          >
            저장
          </button>
        </div>
      </div>
      {/* 배경(오버레이) 클릭 시 모달 닫기 */}
      <div
        className="modal-bg"
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.16)', zIndex: 1
        }}
      />
    </div>
  );
};

export default IdeaModal;