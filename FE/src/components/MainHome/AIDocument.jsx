import React from "react";
import { FileText, RefreshCw, Eye } from "lucide-react";
import "../../styles/MainHome/AIDocument.css";

export default function AIDocument({ projectId }) {
  return (
    <div className="app-card">
      <div className="app-card-header">
        <FileText className="app-card-header-icon" />
        <h3 className="app-card-title">AI 문서</h3>
      </div>

      <div className="aidoc-desc">
        프로젝트 ID: <b>{projectId ?? "—"}</b>
      </div>

      <div className="aidoc-list">
        <div className="aidoc-item">
          <div className="aidoc-name">요구사항 요약 v1.md</div>
          <div className="aidoc-actions">
            <button className="btn-outline"><Eye size={16}/> 보기</button>
            <button className="btn-outline"><RefreshCw size={16}/> 재생성</button>
          </div>
        </div>
        <div className="aidoc-item">
          <div className="aidoc-name">API 설계 초안.yaml</div>
          <div className="aidoc-actions">
            <button className="btn-outline"><Eye size={16}/> 보기</button>
            <button className="btn-outline"><RefreshCw size={16}/> 재생성</button>
          </div>
        </div>
      </div>
    </div>
  );
}