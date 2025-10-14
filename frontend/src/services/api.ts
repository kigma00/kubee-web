import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8282';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 401 오류 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API 함수들
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  
  register: (username: string, email: string, password: string, role: string = 'user') =>
    api.post('/auth/register', { username, email, password, role }),
  
  logout: () =>
    api.post('/auth/logout'),
  
  getCurrentUser: () =>
    api.get('/auth/me'),
};

export const scanAPI = {
  startScan: (data: {
    repository_url: string;
  }) =>
    api.get('/scan', {
      params: {
        'repo-url': data.repository_url
      }
    }),
  
  getScanResults: () =>
    api.get('/scan/history'),
  
  getScanLogs: () =>
    api.get('/api/scan-logs'),
  
  getScanStatus: (scanId: string) =>
    api.get(`/scan/status/${scanId}`),
  
  getScanHistory: () =>
    api.get('/scan/history'),
  
  getScanResult: (filename: string) =>
    api.get(`/scan/${filename}`),
};

export const userAPI = {
  getUsers: () =>
    api.get('/users'),
  
  createUser: (userData: {
    username: string;
    email: string;
    password: string;
    role: string;
  }) =>
    api.post('/users', userData),
  
  deleteUser: (userId: string) =>
    api.delete(`/users/${userId}`),
  
  updateUserRole: (userId: string, role: string) =>
    api.put(`/users/${userId}/role`, { role }),
};

export const healthAPI = {
  getHealth: () =>
    api.get('/health'),
  
  getReadiness: () =>
    api.get('/health/ready'),
  
  getLiveness: () =>
    api.get('/health/live'),
};

export const aiAPI = {
  analyzeSecurity: (data: {
    scan_id: string;
    analysis_type: string;
  }) =>
    api.post('/ai/analyze', data),
  
  generateExploit: (data: {
    scan_id: string;
    finding_id: string;
  }) =>
    api.post('/ai/exploit', data),
  
  getRecommendations: (data: {
    scan_id: string;
  }) =>
    api.post('/ai/recommendations', data),
};

export const logAPI = {
  getLogs: (params?: {
    category?: string;
    limit?: number;
    offset?: number;
  }) =>
    api.get('/api/logs', { params }),
  
  getLogCategories: () =>
    api.get('/api/logs/categories'),
  
  getLogStats: () =>
    api.get('/api/logs/stats'),
  
  convertScanHistory: () =>
    api.post('/api/logs/convert-scan-history'),
};

export const settingsAPI = {
  getSettings: () =>
    api.get('/settings'),
  
  updateSettings: (settings: any) =>
    api.put('/settings', settings),
};

export default api;
