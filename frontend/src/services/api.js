/**
 * Axios API client with JWT interceptor and error handling.
 * All requests are sent to /api/v1/ with automatic token injection.
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // 60s for LLM calls
})

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// ============================================================
// Auth APIs
// ============================================================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
}

// ============================================================
// Document APIs
// ============================================================
export const documentAPI = {
  uploadResume: (formData) =>
    api.post('/resume/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  listResumes: () => api.get('/resume'),
  getResume: (id) => api.get(`/resume/${id}`),
  deleteResume: (id) => api.delete(`/resume/${id}`),

  createJobDescription: (data) => api.post('/job', data),
  uploadJobDescription: (formData) =>
    api.post('/job/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  listJobDescriptions: () => api.get('/job'),
  getJobDescription: (id) => api.get(`/job/${id}`),
}

// ============================================================
// Analysis APIs
// ============================================================
export const analysisAPI = {
  matchAnalysis: (data) => api.post('/analyze/match', data),
}

// ============================================================
// Chat APIs
// ============================================================
export const chatAPI = {
  sendMessage: (data) => api.post('/chat/message', data),
  getSessions: () => api.get('/chat/sessions'),
  getHistory: (sessionId) => api.get(`/chat/history/${sessionId}`),
}

// ============================================================
// Interview APIs
// ============================================================
export const interviewAPI = {
  generate: (data) => api.post('/interview/generate', data),
}

// ============================================================
// Cover Letter APIs
// ============================================================
export const coverLetterAPI = {
  generate: (data) => api.post('/cover-letter/generate', data),
}

// ============================================================
// Email APIs
// ============================================================
export const emailAPI = {
  coldEmail: (data) => api.post('/email/cold', data),
  linkedinMessage: (data) => api.post('/email/linkedin', data),
  followupEmail: (data) => api.post('/email/followup', data),
}

export default api
