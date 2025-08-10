import React from 'react';
import { Lightbulb, X, Pencil } from 'lucide-react';

const IdeaViewModal = ({ open, onClose, idea, onEdit }) => {
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
        <h3 style={{ fontSize: 20, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lightbulb size={22} style={{ color: '#facc15' }} /> 아이디어 내용
        </h3>
        <div
          style={{
            minHeight: 80,
            background: '#f7f7f8',
            borderRadius: 8,
            padding: '1.1rem 1.4rem',
            fontSize: 16,
            color: '#333',
            whiteSpace: 'pre-line'
          }}
        >
          {idea || '저장된 아이디어가 없습니다.'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button
            onClick={onEdit}
            className="modal-edit-btn"
            style={{
              padding: '0.65rem 1.3rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              fontSize: 16,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 7
            }}
          >
            <Pencil size={18} /> 수정
          </button>
          <button
            onClick={onClose}
            className="modal-cancel-btn"
            style={{
              padding: '0.65rem 1.3rem',
              background: '#f4f4f5',
              border: 'none',
              borderRadius: 7,
              fontSize: 16,
              color: '#444'
            }}
          >
            닫기
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

export default IdeaViewModal;