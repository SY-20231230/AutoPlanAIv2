import React, { useState, useRef, useEffect } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../../styles/landing/Header.css';

const Header = ({ isLoggedIn, userName, onLogout }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [fallbackName, setFallbackName] = useState('');

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

  // 스토리지 변화(다른 탭 로그인/로그아웃) 반영
  useEffect(() => {
    const syncFromStorage = () => {
      const name =
        userName ||
        localStorage.getItem('username') ||
        localStorage.getItem('userName') ||
        localStorage.getItem('name') ||
        localStorage.getItem('email') ||
        '';
      setFallbackName(name);
    };
    syncFromStorage();
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, [userName]);

  const rawName = (userName || fallbackName || '').trim();
  // 이메일이면 @ 앞부분만, 아니면 그대로
  const displayName = rawName.includes('@') ? rawName.split('@')[0] : (rawName || '이오토');

  return (
    <header className="header">
      <div className="header-left">
        <span className="logo" onClick={() => navigate('/')}>Auto Plan AI</span>
        {/* 네비게이션 메뉴 제거 */}
      </div>

      <div className="header-right">
        {isLoggedIn ? (
          <div className="user-area" ref={dropdownRef}>
            <span className="username">{displayName}</span>
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
                    onLogout?.();
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