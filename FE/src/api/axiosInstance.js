import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://172.30.1.61:8000/api',  // 백엔드 API 주소로 변경
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 시 토큰이 있으면 Authorization 헤더 자동 추가
instance.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

export default instance;