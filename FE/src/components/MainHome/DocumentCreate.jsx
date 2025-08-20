import React from "react";
import { FilePenLine, Download, Printer, Save, X } from "lucide-react";
import "../../styles/MainHome/DocumentCreate.css";

export default function DocumentCreate({
  title = "새 문서",
  content = "",
  readOnly = false,           // true면 미리보기 전용
  onChange,                   // 수정형일 때 변경 핸들러
  onSave,                     // 저장 콜백(없으면 alert)
  onClose,                    // 선택: 카드 우측 상단 닫기
  fileName = "document.txt",  // 다운로드 기본 파일명
}) {
  const [local, setLocal] = React.useState(content ?? "");

  React.useEffect(() => { setLocal(content ?? ""); }, [content]);

  const handleChange = (e) => {
    setLocal(e.target.value);
    onChange?.(e.target.value);
  };

  const handleDownload = () => {
    const blob = new Blob([local ?? ""], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName || "document.txt";
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const html = `
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>${title}</title>
          <style>
            body { font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; }
            pre { white-space: pre-wrap; line-height: 1.6; font-size: 14px; color:#0f172a; }
          </style>
        </head>
        <body>
          <h3>${title}</h3>
          <pre>${(local || "").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
        </body>
      </html>`;
    const w = window.open("", "_blank");
    if (!w) return alert("팝업이 차단되었습니다. 허용 후 다시 시도하세요.");
    w.document.open(); w.document.write(html); w.document.close();
    w.focus(); w.print();
  };

  const handleSave = () => {
    if (onSave) return onSave(local);
    alert("저장 API 연결 예정");
  };

  return (
    <div className="doccreate-container">
      <div className="app-card doccreate-card">
        <div className="app-card-header">
          <FilePenLine className="app-card-header-icon" />
          <h3 className="app-card-title">{title}</h3>
          {onClose && (
            <button className="btn-outline doccreate-close" onClick={onClose} title="닫기">
              <X size={16}/>
            </button>
          )}
        </div>

        {readOnly ? (
          <pre className="doccreate-preview">{local || "(내용 없음)"}</pre>
        ) : (
          <textarea
            className="doccreate-textarea"
            value={local}
            onChange={handleChange}
            placeholder="여기에 내용을 입력하세요…"
          />
        )}

        <div className="actions-row doccreate-actions">
          <button className="btn-outline" onClick={handlePrint} title="프린트/출력">
            <Printer size={16}/> 출력
          </button>
          <button className="btn-outline" onClick={handleDownload} title="파일로 다운로드">
            <Download size={16}/> 다운로드
          </button>
          {!readOnly && (
            <button className="btn-primary" onClick={handleSave} title="저장">
              <Save size={16}/> 저장
            </button>
          )}
        </div>
      </div>
    </div>
  );
}