// src/api/axiosInstance.js
import axios from "axios";

export const API_BASE = "https://ribbon-priest-proteins-dishes.trycloudflare.com/api";

// ✅ 서버 스펙에 맞게 여기만 바꿔보면 됨
const REFRESH_PATH = "/token/refresh/"; // 예: "/auth/jwt/refresh/"

// 로그인/리프레시 자체에는 재시도/리프레시 금지
const NO_RETRY_PATHS = [REFRESH_PATH, "/login/", "/auth/login/"];

const TOKENS = {
  getAccess() {
    return localStorage.getItem("access") || localStorage.getItem("accessToken") || null;
  },
  getRefresh() {
    return localStorage.getItem("refresh") || localStorage.getItem("refreshToken") || null;
  },
  setTokens({ access, refresh }) {
    if (access) localStorage.setItem("access", access);
    if (refresh) localStorage.setItem("refresh", refresh);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
  setAccess(access) {
    if (access) localStorage.setItem("access", access);
    localStorage.removeItem("accessToken");
  },
  clear() {
    ["access","refresh","accessToken","refreshToken","user_id","username"].forEach(k=>localStorage.removeItem(k));
  },
};

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 0,
});

// 요청 인터셉터: JWT 부착
api.interceptors.request.use((config) => {
  const access = TOKENS.getAccess();
  if (access) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// ====== 401 리프레시 공통 로직 ======
let isRefreshing = false;
let subscribers = [];

function addSubscriber(resolve, reject) {
  subscribers.push({ resolve, reject });
}
function notifySubscribers(newAccess) {
  subscribers.forEach(({ resolve }) => resolve(newAccess));
  subscribers = [];
}
async function refreshAccessToken() {
  const refresh = TOKENS.getRefresh();
  if (!refresh) throw new Error("No refresh token");

  const url = `${API_BASE}${REFRESH_PATH}`;
  const res = await axios.post(url, { refresh }, { timeout: 20000 });
  const newAccess = res?.data?.access;
  if (!newAccess) throw new Error("No access in refresh response");
  TOKENS.setAccess(newAccess);

  // ✅ 전역 헤더도 즉시 갱신 (경합 방지)
  api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
  return newAccess;
}

// 응답 인터셉터(로그 + 401 재발급 처리 통합)
api.interceptors.response.use(
  // 성공은 그대로 패스
  (response) => response,
  async (error) => {
    const cfg = error?.config || {};
    const resp = error?.response;
    const status = resp?.status;
    const url = `${cfg.baseURL || ""}${cfg.url || ""}`;

    // 📋 일단 보기 좋은 로그
    console.groupCollapsed(`API FAIL: ${cfg.method?.toUpperCase?.() || "?"} ${url}`);
    console.log("Status:", status ?? "(no response)");
    console.log("Resp data:", resp?.data);
    console.log("Message:", error?.message);
    console.log("Config:", cfg);
    console.groupEnd();

    // 조건: 401 + 아직 재시도 안 함 + 리프레시/로그인 요청 아님
    const isNoRetryTarget = NO_RETRY_PATHS.some((p) => cfg?.url?.includes(p));
    if (status !== 401 || cfg._retry || isNoRetryTarget) {
      return Promise.reject(error);
    }
    cfg._retry = true;

    // 동시 401 → 큐에 넣기
    if (isRefreshing) {
      return new Promise((resolve, reject) => addSubscriber(resolve, reject)).then((token) => {
        cfg.headers = cfg.headers || {};
        cfg.headers.Authorization = `Bearer ${token}`;
        return api(cfg);
      });
    }

    // 실제 리프레시 수행
    try {
      isRefreshing = true;
      const newAccess = await refreshAccessToken();
      notifySubscribers(newAccess);

      cfg.headers = cfg.headers || {};
      cfg.headers.Authorization = `Bearer ${newAccess}`;
      return api(cfg);
    } catch (e) {
      // 큐 전부 실패 처리 + 로그아웃
      subscribers.forEach(({ reject }) => reject(e));
      subscribers = [];
      TOKENS.clear();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;