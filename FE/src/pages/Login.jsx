// src/pages/Login.jsx
import React, { useState } from "react";
import { FaUser, FaLock, FaGoogle, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import api, { API_BASE } from "../api/axiosInstance";
import axios from "axios";
import "../styles/Auth.css";

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const saveTokens = (data) => {
    const { access, refresh } = data || {};
    if (!access) throw new Error("토큰이 응답에 없습니다.");
    localStorage.setItem("accessToken", access);
    if (refresh) localStorage.setItem("refreshToken", refresh);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    const tryJsonEmail = () => api.post("/login/", { email, password });
    const tryJsonUsername = () => api.post("/login/", { username: email, password });
    const tryForm = () => {
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);
      return axios.post(`${API_BASE}/login/`, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    };

    try {
      let res;
      try {
        res = await tryJsonEmail();
      } catch {
        try {
          res = await tryJsonUsername();
        } catch {
          res = await tryForm();
        }
      }

      // 1) 토큰 저장
      saveTokens(res.data);

      // 2) 표시용 이름 결정: /me/ → fallback: 이메일 @ 앞부분
      let displayName = email.split("@")[0];
      try {
        const me = await api.get("/me/");
        displayName =
          me?.data?.name ||
          me?.data?.username ||
          me?.data?.email?.split("@")[0] ||
          displayName;
      } catch (_) {
        // 프로필 API가 없거나 실패해도 무시하고 fallback 사용
      }

      // 3) 상위 App에 표시명 전달(=> Header에서 '님' 없이 이름만 노출)
      onLogin?.(displayName);

      // 4) 이동: ?redirect > from > 기본 /main
      const params = new URLSearchParams(location.search);
      const redirect = params.get("redirect");
      const from = location.state?.from?.pathname;
      navigate(redirect || from || "/main", { replace: true });
    } catch (err) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      const msg =
        err?.response?.data?.error ??
        err?.response?.data?.detail ??
        err?.response?.data?.message ??
        err?.message ??
        "로그인에 실패했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGmailLogin = () => {
    window.location.href = `${API_BASE}/auth/google/`;
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
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="input-line" style={{ position: "relative" }}>
          <FaLock className="input-icon" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <span
            className="password-eye-icon"
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="main-login-btn" type="submit" disabled={loading}>
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <button className="gmail-btn" type="button" onClick={handleGmailLogin}>
          <FaGoogle className="gmail-logo" /> Gmail로 로그인
        </button>
      </form>
    </div>
  );
};

export default Login;