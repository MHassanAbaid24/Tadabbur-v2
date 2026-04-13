import { create } from 'zustand'
import api from '../lib/api'

export interface ProgressSummary {
  current_streak: number
  longest_streak: number
  xp: number
  level: number
  level_name: string
  level_name_ar: string
  activity_days: string[]
  xp_to_next_level: number
}

interface ProgressStore {
  summary: ProgressSummary | null
  isLoading: boolean
  error: string | null
  fetchSummary: () => Promise<void>
}

export const useProgressStore = create<ProgressStore>((set) => ({
  summary: null,
  isLoading: false,
  error: null,

  fetchSummary: async () => {
    try {
      set({ isLoading: true, error: null })
      const response = await api.get<{ data: ProgressSummary }>('/api/progress/summary')
      set({
        summary: response.data.data,
        isLoading: false,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch progress'
      set({
        error: errorMessage,
        isLoading: false,
      })
    }
  },
}))
