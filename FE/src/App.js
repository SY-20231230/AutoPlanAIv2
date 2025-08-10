import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';

import Header from './components/landing/Header'; // App에서만 렌더링
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MainHome from './pages/MainHome';
import MyPage from './pages/MyPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  // 1. 새로고침해도 로그인 유지 (localStorage 연동)
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('accessToken'));
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');

  // 2. 로그인 시 userName/토큰 로컬스토리지 저장
  const handleLogin = (userName) => {
    setIsLoggedIn(true);
    setUserName(userName);
    localStorage.setItem('userName', userName); // 이름 저장
    // accessToken, refreshToken은 Login.jsx에서 이미 저장
  };

  // 3. 로그아웃 시 로컬스토리지 비우기
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('');
    localStorage.removeItem('userName');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <>
      <Header
        isLoggedIn={isLoggedIn}
        userName={userName}
        onLogout={handleLogout}
      />
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/main"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <MainHome
                isLoggedIn={isLoggedIn}
                userName={userName}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mypage"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <MyPage
                isLoggedIn={isLoggedIn}
                userName={userName}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <MainHome
                isLoggedIn={isLoggedIn}
                userName={userName}
                onLogout={handleLogout}
              />
            ) : (
              <Home
                isLoggedIn={isLoggedIn}
                userName={userName}
                onLogout={handleLogout}
              />
            )
          }
        />
      </Routes>
    </>
  );
}

export default App;