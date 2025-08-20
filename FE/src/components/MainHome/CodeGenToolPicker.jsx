import React, { useState } from "react";
import { Boxes, Wand2 } from "lucide-react";
import "../../styles/MainHome/CodeGenToolPicker.css";

const TOOLS = [
  { key: "fastapi", label: "FastAPI 스캐폴드" },
  { key: "django", label: "Django REST 템플릿" },
  { key: "react",  label: "React 컴포넌트" },
  { key: "infra",  label: "Infra IaC (Terraform)" },
];

export default function CodeGenToolPicker({ projectId, onNext }) {
  const [selected, setSelected] = useState("react");

  return (
    <div className="app-card">
      <div className="app-card-header">
        <Boxes className="app-card-header-icon" />
        <h3 className="app-card-title">코드 생성 툴 선택</h3>
      </div>

      <div className="cgtp-sub">프로젝트 ID: <b>{projectId ?? "—"}</b></div>

      <div className="cgtp-grid">
        {TOOLS.map(t => (
          <button
            key={t.key}
            className={`cgtp-item ${selected === t.key ? "active" : ""}`}
            onClick={() => setSelected(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="actions-row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button className="btn-primary" onClick={() => onNext?.(selected)}>
          <Wand2 size={16}/> 선택하고 결과 보기
        </button>
      </div>
    </div>
  );
}