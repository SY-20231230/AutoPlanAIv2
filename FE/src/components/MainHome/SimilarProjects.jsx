import React from 'react';
import { ArrowLeft, Github } from 'lucide-react';

const SimilarProjects = ({ projects = [], loading, onBack, requirementSummary }) => {
  return (
    <div className="similar-projects-page">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: 6 }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 22, margin: 0 }}>유사 프로젝트 추천 결과</h2>
      </div>

      {/* 최종 명세서(Requirement) 요약 보여주기 */}
      {requirementSummary && (
        <div style={{
          background: '#f6fff2', border: '1px solid #d2f4ea', borderRadius: 8,
          padding: '15px 20px', marginBottom: 20, fontSize: 16, color: '#166534'
        }}>
          <strong>최종 명세서 요약:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{requirementSummary}</pre>
        </div>
      )}

      {loading ? (
        <div>추천 결과를 불러오는 중입니다...</div>
      ) : (
        <div>
          {projects && projects.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {projects.map((p, idx) => (
                <li key={p.id || idx}
                    style={{
                      border: '1px solid #e4e4e7', borderRadius: 10,
                      marginBottom: 18, padding: '18px 22px', background: '#f8fafc'
                    }}>
                  <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 7 }}>
                    {p.title || p.name}
                  </div>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'underline', fontSize: 15 }}>
                      <Github size={16} style={{ marginRight: 4 }} />
                      {p.url}
                    </a>
                  )}
                  {p.description && (
                    <div style={{ color: '#444', marginTop: 9 }}>{p.description}</div>
                  )}
                  {/* 유사도 표시 */}
                  {p.similarity && (
                    <div style={{ marginTop: 5, color: '#888', fontSize: 13 }}>
                      <strong>유사도:</strong> {Math.round(p.similarity * 100)}%
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: '#999', fontSize: 16 }}>
              추천된 유사 프로젝트가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimilarProjects;