// API Configuration
// In production (Lovable), set VITE_API_BASE_URL environment variable
// For local development, it defaults to Railway backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://scam-detector-production.up.railway.app';

export const API_ENDPOINTS = {
  analyze: `${API_BASE_URL}/api/analyze`,
  analyzeUrl: `${API_BASE_URL}/api/analyze-url`,
  analyzeText: `${API_BASE_URL}/api/analyze-text`,
  report: `${API_BASE_URL}/api/report`,
  health: `${API_BASE_URL}/api/health`,
};
