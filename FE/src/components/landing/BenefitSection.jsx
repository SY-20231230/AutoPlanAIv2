// 📁 src/components/BenefitSection.jsx
import React from 'react';
import '../../styles/landing/BenefitSection.css';
import { FaCheckCircle } from 'react-icons/fa';

const benefits = [
  '모호한 요구사항 제거로 실수 방지',
  '오픈소스 탐색 시간 절약',
  '역할 기반 팀원 업무 자동 매칭',
];

const BenefitSection = () => {
  return (
    <section className="features">
      <h2>AI로 수작업을 80% 줄여보세요</h2>
      <p className="features-sub">정확하고 빠르게 프로젝트를 시작할 수 있습니다</p>
      <div className="features-grid">
        {benefits.map((item, index) => (
          <div className="feature-card" key={index}>
            <FaCheckCircle size={32} color="#10b981" />
            <p style={{ marginTop: '1rem' }}>{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BenefitSection;