import React from "react";
import { FileCode2, Download, ArrowLeft } from "lucide-react";
import "../../styles/MainHome/CodeGenOutputs.css";

export default function CodeGenOutputs({ projectId, onBack }) {
  const samples = [
    { name: "api/routes/users.py",  lines: 42 },
    { name: "api/routes/tasks.py",  lines: 58 },
    { name: "frontend/src/App.jsx", lines: 120 },
  ];
  return (
    <div className="app-card">
      <div className="app-card-header">
        <FileCode2 className="app-card-header-icon" />
        <h3 className="app-card-title">코드 생성 결과</h3>
      </div>

      <div className="cgo-sub">프로젝트 ID: <b>{projectId ?? "—"}</b></div>

      <div className="cgo-list">
        {samples.map(f => (
          <div className="cgo-item" key={f.name}>
            <div className="cgo-name">{f.name}</div>
            <div className="cgo-meta">{f.lines} lines</div>
          </div>
        ))}
      </div>

      <div className="actions-row" style={{ justifyContent:"space-between", marginTop:12 }}>
        <button className="btn-outline" onClick={onBack}><ArrowLeft size={16}/> 툴 선택으로</button>
        <button className="btn-primary" onClick={() => alert("ZIP 다운로드 연결 예정")}>
          <Download size={16}/> ZIP 다운로드
        </button>
      </div>
    </div>
  );
}