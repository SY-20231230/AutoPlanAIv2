// 📁 src/components/Features.jsx
import React from 'react';
import '../../styles/landing/Features.css';
import { FaRegFileAlt, FaTasks, FaProjectDiagram, FaFileExport } from 'react-icons/fa';

const features = [
  {
    icon: <FaRegFileAlt size={40} color="#2563eb" />,
    title: '기능 요구사항 자동 생성',
    desc: '아이디어를 기반으로 기능 명세를 자동으로 생성합니다.',
  },
  {
    icon: <FaProjectDiagram size={40} color="#2563eb" />,
    title: '오픈소스 프로젝트 탐색',
    desc: '유사한 오픈소스를 자동으로 탐색하고 점수화합니다.',
  },
  {
    icon: <FaTasks size={40} color="#2563eb" />,
    title: '스마트 업무 분담',
    desc: '팀원 역할과 전문성을 고려해 업무를 자동 할당합니다.',
  },
  {
    icon: <FaFileExport size={40} color="#2563eb" />,
    title: '다양한 형식으로 내보내기',
    desc: '요구사항을 PDF, Word, Markdown 등으로 변환합니다.',
  },
];

const Features = () => {
  return (
    <section className="features">
      <h2>강력한 AI 기반 기능들</h2>
      <p className="features-sub">프로젝트 기획 과정을 혁신하는 다양한 기능을 제공합니다</p>
      <div className="features-grid">
        {features.map((f, i) => (
          <div className="feature-card" key={i}>
            <div className="icon-circle">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;