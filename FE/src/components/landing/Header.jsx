import React, { useState, useRef, useEffect } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../../styles/landing/Header.css';

const Header = ({ isLoggedIn, userName, onLogout }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // 사용자 이름 표시 (없으면 더미, 있으면 실제 userName)
  const displayName = userName || '말차';

  return (
    <header className="header">
      <div className="header-left">
        <span className="logo" onClick={() => navigate('/')}>Auto Plan AI</span>
        <nav className="nav-links">
          <a href="#features">기능</a>
          <a href="#workflow">작동 방식</a>
          <a href="#pricing">요금제</a>
        </nav>
      </div>
      <div className="header-right">
        {isLoggedIn ? (
          <div className="user-area" ref={dropdownRef}>
            <span className="username">{displayName}님</span>
            <FaUserCircle
              className="user-icon"
              onClick={() => setDropdownOpen(open => !open)}
              tabIndex={0}
            />
            {dropdownOpen && (
              <div className="dropdown-menu">
                <div
                  className="dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/mypage');
                  }}
                >
                  마이페이지
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    if (onLogout) onLogout(); // 상위에서 토큰 정리 및 상태 변경
                    navigate('/');
                  }}
                >
                  로그아웃
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <button className="header-btn login" onClick={() => navigate('/login')}>로그인</button>
            <button className="header-btn signup" onClick={() => navigate('/signup')}>회원가입</button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;