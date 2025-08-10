import React, { useState } from 'react';
import { FaUser, FaLock, FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Auth.css';

const API_BASE = 'http://192.168.100.45:8000';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔑 로그인 핸들러
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 기존 토큰 제거
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    try {
      const res = await axios.post(`${API_BASE}/api/login/`, { email, password });
      const { access, refresh } = res.data || {};

      if (!access) {
        throw new Error('토큰이 응답에 없습니다.');
      }

      // 토큰 저장 + 전역 헤더 세팅
      localStorage.setItem('accessToken', access);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      axios.defaults.headers.common.Authorization = `Bearer ${access}`;

      if (onLogin) onLogin(email);
      navigate('/'); // 홈 이동
    } catch (err) {
      // 실패 시 토큰 정리
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      const msg =
        err?.response?.data?.error ??
        err?.response?.data?.detail ??
        err?.message ??
        '로그인에 실패했습니다. 관리자에게 문의하세요.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 구글 로그인
  const handleGmailLogin = () => {
    window.location.href = `${API_BASE}/api/auth/google/`;
  };

  return (
    <div className="auth-bg">
      <form className="auth-form" onSubmit={handleLogin}>
        <div className="login-icon">Auto Plan AI</div>

        <div className="input-line">
          <FaUser className="input-icon" />
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="input-line" style={{ position: 'relative' }}>
          <FaLock className="input-icon" />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <span
            className="password-eye-icon"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              color: '#888'
            }}
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="main-login-btn" type="submit" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>

        <button className="gmail-btn" type="button" onClick={handleGmailLogin}>
          <FaGoogle className="gmail-logo" /> Gmail로 로그인
        </button>

        <div className="login-link">
          계정이 없으신가요?{' '}
          <span
            onClick={() => navigate('/signup')}
            style={{ cursor: 'pointer', color: '#2b50ec', fontWeight: 600 }}
          >
            회원가입
          </span>
        </div>
      </form>
    </div>
  );
};

export default Login;
