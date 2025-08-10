import React, { useState } from 'react';
import { FaUser, FaEnvelope, FaLock, FaGoogle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const Signup = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 이메일 중복 검사 상태
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailCheckMsg, setEmailCheckMsg] = useState('');

  // 이메일 중복 확인 함수
  const checkEmailDuplicate = async () => {
    setError('');
    setEmailCheckMsg('');
    if (!email) {
      setError('이메일을 입력하세요.');
      return;
    }
    try {
      const res = await fetch('http://192.168.100.45:8000/api/check-email/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.exists) {
          setEmailChecked(false);
          setEmailCheckMsg('이미 사용 중인 이메일입니다.');
        } else {
          setEmailChecked(true);
          setEmailCheckMsg('사용 가능한 이메일입니다.');
        }
      } else {
        setEmailChecked(false);
        setEmailCheckMsg('이메일 확인에 실패했습니다.');
      }
    } catch (err) {
      setEmailChecked(false);
      setEmailCheckMsg('서버 오류가 발생했습니다.');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!emailChecked) {
      setError('이메일 중복 확인을 해주세요.');
      return;
    }
    if (password !== password2) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const res = await fetch('http://192.168.100.45:8000/api/signup/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, password2 }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.password) setError(data.password[0]);
        else if (data.email) setError(data.email[0]);
        else if (data.username) setError(data.username[0]);
        else if (data.detail) setError(data.detail);
        else setError('회원가입 실패');
        return;
      }

      setSuccessMsg('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
    }
  };

  return (
    <div className="auth-bg">
      <form className="auth-form" onSubmit={handleSignup}>
        <div className="login-icon">
          Auto Plan AI
        </div>
        <div className="input-line">
          <FaUser className="input-icon" />
          <input
            type="text"
            placeholder="닉네임"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>
        <div className="input-line">
          <FaEnvelope className="input-icon" />
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              setEmailChecked(false);
              setEmailCheckMsg('');
            }}
          />
          <button
            type="button"
            className="check-btn"
            onClick={checkEmailDuplicate}
          >
            이메일 중복 확인
          </button>
        </div>
        {emailCheckMsg && (
          <div
            className="email-check-msg"
            style={{
              color: emailChecked ? 'green' : 'red',
              fontSize: '0.85rem',
              marginTop: '0.2rem',
              marginBottom: '0.8rem',
              textAlign: 'left',
            }}
          >
            {emailCheckMsg}
          </div>
        )}
        <div className="input-line">
          <FaLock className="input-icon" />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        <div className="input-line">
          <FaLock className="input-icon" />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
          />
        </div>
        {error && <div className="auth-error">{error}</div>}
        {successMsg && <div className="auth-success">{successMsg}</div>}
        <button className="main-login-btn" type="submit">회원가입</button>
        <button className="gmail-btn" type="button">
          <FaGoogle className="gmail-logo" /> Gmail로 가입
        </button>
        <div className="login-link">
          이미 계정이 있으신가요?{' '}
          <span onClick={() => navigate('/login')}>로그인</span>
        </div>
      </form>
    </div>
  );
};

export default Signup;