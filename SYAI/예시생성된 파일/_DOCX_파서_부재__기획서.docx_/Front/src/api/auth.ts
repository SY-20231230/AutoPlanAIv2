import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const login = async (credentials: { username: string; password: string }) => {
  try {
    const response = await authApi.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || { message: 'An unknown error occurred during login.' };
    }
    throw error;
  }
};

export const register = async (userData: { username: string; password: string; email: string }) => {
  try {
    const response = await authApi.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || { message: 'An unknown error occurred during registration.' };
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    // Assuming logout is a POST request to invalidate session/token on backend
    const response = await authApi.post('/auth/logout');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || { message: 'An unknown error occurred during logout.' };
    }
    throw error;
  }
};

export const refreshToken = async (token: string) => {
  try {
    const response = await authApi.post('/auth/refresh-token', { refreshToken: token });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || { message: 'An unknown error occurred during token refresh.' };
    }
    throw error;
  }
};