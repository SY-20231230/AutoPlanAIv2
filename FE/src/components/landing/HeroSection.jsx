// src/components/landing/HeroSection.jsx
import React from 'react';
import '../../styles/landing/HeroSection.css';

const HeroSection = () => {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>
          Automate Your Project Planning with <span className="highlight">AI</span>
        </h1>
        <p>
          프로젝트 계획을 AI로 자동화하세요 자유 형식의 프로젝트 설명을 구조화된 요구사항으로 변환하고,
          유사한 오픈소스 프로젝트를 찾아내며, 팀원들에게 자동으로 업무를 할당합니다.
        </p>
        <div className="hero-buttons">
          <button className="btn primary">시작하기</button>
          <button className="btn secondary">설명보기</button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;