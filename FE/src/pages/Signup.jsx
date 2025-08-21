// src/pages/Signup.jsx
import React, { useState } from "react";
import { FaUser, FaEnvelope, FaLock, FaGoogle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api, { API_BASE } from "../api/axiosInstance"; // axios 인스턴스(인터셉터 포함)
import axios from "axios"; // 인터셉터 우회용(폼 재시도용)
import "../styles/Auth.css";

const Signup = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 이메일 중복 검사 상태
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailCheckMsg, setEmailCheckMsg] = useState("");
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ✅ 이메일 중복 확인
  const checkEmailDuplicate = async () => {
    setError("");
    setEmailCheckMsg("");

    if (!email) {
      setError("이메일을 입력하세요.");
      return;
    }
    setChecking(true);
    try {
      // JSON 우선
      let res;
      try {
        res = await api.post("/check-email/", { email });
      } catch (e) {
        // 폼으로 재시도
        const form = new URLSearchParams();
        form.append("email", email);
        res = await axios.post(`${API_BASE}/check-email/`, form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      }

      const data = res.data || {};
      if (data.exists) {
        setEmailChecked(false);
        setEmailCheckMsg("이미 사용 중인 이메일입니다.");
      } else {
        setEmailChecked(true);
        setEmailCheckMsg("사용 가능한 이메일입니다.");
      }
    } catch (err) {
      setEmailChecked(false);
      setEmailCheckMsg("이메일 확인에 실패했습니다.");
      // console.debug("checkEmail error:", err?.response?.status, err?.response?.data);
    } finally {
      setChecking(false);
    }
  };

  // ✅ 회원가입 처리 (JSON → 실패 시 form 재시도)
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!emailChecked) {
      setError("이메일 중복 확인을 해주세요.");
      return;
    }
    if (!username.trim()) {
      setError("이름을 입력하세요.");
      return;
    }
    if (password !== password2) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      let res;
      const payloadJson = { username, email, password, password2 };

      try {
        // 1) JSON 시도
        res = await api.post("/signup/", payloadJson);
      } catch (eJson) {
        // 2) 폼 형식 재시도
        const form = new URLSearchParams();
        form.append("username", username);
        form.append("email", email);
        form.append("password", password);
        form.append("password2", password2);

        res = await axios.post(`${API_BASE}/signup/`, form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      }

      // 서버가 유효성 메시지를 배열/딕셔너리로 주는 케이스 처리
      if (res.status >= 400) {
        const data = res.data || {};
        const msg =
          data.password?.[0] ||
          data.password2?.[0] ||
          data.email?.[0] ||
          data.username?.[0] ||
          data.detail ||
          "회원가입 실패";
        setError(msg);
        return;
      }

      setSuccessMsg("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      const data = err?.response?.data || {};
      const msg =
        data.password?.[0] ||
        data.password2?.[0] ||
        data.email?.[0] ||
        data.username?.[0] ||
        data.detail ||
        err?.message ||
        "서버 오류가 발생했습니다.";
      setError(msg);
      // console.debug("signup error:", err?.response?.status, err?.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  // (선택) Gmail 가입 시작 – 실제 백 URL 확인 필요: /auth/google/ vs /signup/google/
  const handleGmailSignup = () => {
    window.location.href = `${API_BASE}/auth/google/`;
  };

  return (
    <div className="auth-bg">
      <form className="auth-form" onSubmit={handleSignup}>
        <div className="login-icon">Auto Plan AI</div>

        <div className="input-line">
          <FaUser className="input-icon" />
          <input
            type="text"
            placeholder="닉네임"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="input-line" style={{ gap: 8 }}>
          <FaEnvelope className="input-icon" />
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailChecked(false);
              setEmailCheckMsg("");
            }}
            required
          />
          <button
            type="button"
            className="check-btn"
            onClick={checkEmailDuplicate}
            disabled={checking || !email}
            title="이메일 중복 확인"
          >
            {checking ? "확인 중..." : "이메일 중복 확인"}
          </button>
        </div>

        {emailCheckMsg && (
          <div
            className="email-check-msg"
            style={{
              color: emailChecked ? "rgb(16, 152, 16)" : "crimson",
              fontSize: "0.85rem",
              marginTop: "0.2rem",
              marginBottom: "0.8rem",
              textAlign: "left",
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
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="input-line">
          <FaLock className="input-icon" />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />
        </div>

        {error && <div className="auth-error">{error}</div>}
        {successMsg && <div className="auth-success">{successMsg}</div>}

        <button className="main-login-btn" type="submit" disabled={submitting}>
          {submitting ? "가입 중..." : "회원가입"}
        </button>

        <button className="gmail-btn" type="button" onClick={handleGmailSignup}>
          <FaGoogle className="gmail-logo" /> Gmail로 가입
        </button>

        <div className="login-link">
          이미 계정이 있으신가요?{" "}
          <span onClick={() => navigate("/login")} style={{ cursor: "pointer" }}>
            로그인
          </span>
        </div>
      </form>
    </div>
  );
};

export default Signup;