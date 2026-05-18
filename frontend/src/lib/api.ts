import axios, { AxiosError } from 'axios'
import type { AxiosInstance } from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const TOKEN_KEY = 'tadabbur_token'

// Request interceptor: attach auth token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

import { useAuthStore } from '../store/authStore'

// Response interceptor: handle errors and token expiry
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid. Log the user out from the store.
      // The UI will reactively redirect to /auth via the ProtectedRoute component.
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)

/**
 * Generate AI insight for a reflection on-demand.
 * POST /api/reflection/{reflection_id}/insight
 *
 * Returns the generated insight string or null if generation fails.
 * If the insight was already generated, returns the cached version.
 */
export async function generateReflectionInsight(reflectionId: string): Promise<{
  insight: string | null
  cached: boolean
}> {
  const response = await api.post<{
    success: boolean
    data: { insight: string | null; cached: boolean }
  }>(`/api/reflection/${reflectionId}/insight`)
  return response.data.data
}

/**
 * Verse API methods for fetching Quranic verses and tafsir.
 */
export const verse = {
  /**
   * Fetch tafsir (Ibn Kathir interpretation) for a specific verse.
   * GET /api/tafsir/{verse_key}
   *
   * @param verseKey - Format "chapter:verse" (e.g., "2:255")
   * @returns Tafsir content and metadata
   */
  getTafsir: (verseKey: string) =>
    api.get<{ success: boolean; data: { tafsir: string; verse_key: string } }>(`/api/tafsir/${verseKey}`).then(res => res.data),

  /**
   * Fetch recitation audio URL for a specific verse.
   * GET /api/audio/{verse_key}
   *
   * @param verseKey - Format "chapter:verse" (e.g., "2:255")
   * @returns Audio URL and metadata
   */
  getAudio: (verseKey: string) =>
    api.get<{ success: boolean; data: { audio_url: string; verse_key: string } }>(`/api/audio/${verseKey}`).then(res => res.data),
}

export default api

