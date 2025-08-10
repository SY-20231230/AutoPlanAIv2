import React from 'react';
import { Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

const SpecSheetCard = ({
  spec1, spec2, 
  onDownload1, onDownload2,
  onFinalize1, onFinalize2,
  finalized, finalSpec
}) => (
  <div className="specsheet-card-container">
    <div className="specsheet-card">
      <div className="specsheet-header">
        <FileSpreadsheet style={{ color: "#2563eb", marginRight: 7 }} />
        <span>기능명세서 미리보기</span>
      </div>
      <div className="specsheet-body">
        <div className="specsheet-item">
          <div className="specsheet-title">1안</div>
          <pre className="specsheet-content">{spec1 || '아직 생성된 명세서가 없습니다.'}</pre>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              onClick={onDownload1}
              className="specsheet-download-btn"
              disabled={!spec1}
            >
              <Download size={16} style={{ marginRight: 5 }} /> 다운로드
            </button>
            <button
              onClick={onFinalize1}
              className="specsheet-finalize-btn"
              disabled={!spec1 || finalized}
              style={{
                background: finalized && finalSpec === spec1 ? '#14b8a6' : '#2563eb',
                color: '#fff'
              }}
            >
              {finalized && finalSpec === spec1 ? <><CheckCircle2 size={17} style={{marginRight: 3}}/>최종 선택됨</> : '최종 선택'}
            </button>
          </div>
        </div>
        <div className="specsheet-item">
          <div className="specsheet-title">2안</div>
          <pre className="specsheet-content">{spec2 || '아직 생성된 명세서가 없습니다.'}</pre>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              onClick={onDownload2}
              className="specsheet-download-btn"
              disabled={!spec2}
            >
              <Download size={16} style={{ marginRight: 5 }} /> 다운로드
            </button>
            <button
              onClick={onFinalize2}
              className="specsheet-finalize-btn"
              disabled={!spec2 || finalized}
              style={{
                background: finalized && finalSpec === spec2 ? '#14b8a6' : '#2563eb',
                color: '#fff'
              }}
            >
              {finalized && finalSpec === spec2 ? <><CheckCircle2 size={17} style={{marginRight: 3}}/>최종 선택됨</> : '최종 선택'}
            </button>
          </div>
        </div>
      </div>
      {finalized && (
        <div style={{ marginTop: 13, textAlign: 'center', color: '#14b8a6', fontWeight: 500 }}>
          <CheckCircle2 size={18} style={{marginRight: 6}}/>최종 명세서가 확정되었습니다.
        </div>
      )}
    </div>
  </div>
);

export default SpecSheetCard;