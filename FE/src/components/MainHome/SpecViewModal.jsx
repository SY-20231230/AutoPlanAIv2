import React from 'react';
import { FileText, X, Download } from 'lucide-react';

const SpecViewModal = ({ open, onClose, title, content, onDownload }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          minWidth: 420,
          padding: 32,
          background: '#fff',
          borderRadius: 12,
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* 닫기 버튼 */}
        <button
          aria-label="닫기"
          style={{
            position: 'absolute',
            top: 16,
            right: 18,
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
          onClick={onClose}
        >
          <X size={22} />
        </button>
        {/* 제목 */}
        <h3
          style={{
            fontSize: 20,
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <FileText size={22} style={{ color: '#2563eb' }} /> {title}
        </h3>
        {/* 명세서 내용 */}
        <div
          style={{
            minHeight: 120,
            background: '#f7f7f8',
            borderRadius: 8,
            padding: '1.1rem 1.4rem',
            fontSize: 16,
            color: '#333',
            whiteSpace: 'pre-line'
          }}
        >
          {content || '기능명세서 내용이 없습니다.'}
        </div>
        {/* 버튼 영역 */}
        <div style={{ textAlign: 'right', marginTop: 18 }}>
          <button
            onClick={onDownload}
            className="modal-save-btn"
            style={{
              padding: '0.65rem 1.3rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              fontSize: 16,
              fontWeight: 500,
              marginRight: 10,
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <Download size={17} style={{ marginRight: 5 }} /> 다운로드
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
      {/* 오버레이: 클릭시 모달 닫기 */}
      <div
        className="modal-bg"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.13)',
          zIndex: 1
        }}
      />
    </div>
  );
};

export default SpecViewModal;