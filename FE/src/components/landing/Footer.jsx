import React from 'react';
import '../../styles/landing/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-left">
          <h3>Auto Plan AI</h3>
          <p>프로젝트 기획을 자동화하는 지능형 서비스</p>
        </div>
        <div className="footer-links">
          <div>
            <h4>서비스</h4>
            <ul>
              <li>기능 소개</li>
              <li>요금제</li>
              <li>문서화 도구</li>
            </ul>
          </div>
          <div>
            <h4>회사</h4>
            <ul>
              <li>회사 소개</li>
              <li>블로그</li>
              <li>채용</li>
            </ul>
          </div>
          <div>
            <h4>지원</h4>
            <ul>
              <li>고객 센터</li>
              <li>이메일 문의</li>
              <li>개인정보 처리방침</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        © 2025 Auto Plan AI. 모든 권리 보유.
      </div>
    </footer>
  );
};

export default Footer;