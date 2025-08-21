// 📁 src/components/CTASection.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/landing/CTASection.css';

const CTASection = () => {
  const navigate = useNavigate();

  const handleStartClick = () => {
    navigate('/login');
  };

  return (
    <section className="cta">
      <h2>지금 바로 시작해보세요</h2>
      <p>프로젝트 아이디어를 실행 가능한 계획으로 바꾸는 가장 쉬운 방법</p>
      <div className="cta-buttons">
        <button className="cta-btn primary" onClick={handleStartClick}>
          무료로 시작하기
        </button>
        <button className="cta-btn secondary">
          데모 요청하기
        </button>
      </div>
    </section>
  );
};

export default CTASection;