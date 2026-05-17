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

export interface WeeklyInsights {
  status: 'ready' | 'not_enough_data' | 'unavailable'
  insight_markdown: string | null
  message?: string
  reflection_count: number
}

interface ProgressStore {
  summary: ProgressSummary | null
  weeklyInsights: WeeklyInsights | null
  isLoading: boolean
  isInsightsLoading: boolean
  error: string | null
  insightsError: string | null
  lastFetchedAt: number | null
  fetchSummary: (force?: boolean) => Promise<void>
  fetchWeeklyInsights: () => Promise<void>
}

const PROGRESS_STALE_MS = 5 * 60 * 1000 // 5 minutes

export const useProgressStore = create<ProgressStore>((set, get) => ({
  summary: null,
  weeklyInsights: null,
  isLoading: false,
  isInsightsLoading: false,
  error: null,
  insightsError: null,
  lastFetchedAt: null,

  fetchSummary: async (force = false) => {
    const state = get()
    if (
      !force &&
      state.summary &&
      state.lastFetchedAt &&
      Date.now() - state.lastFetchedAt < PROGRESS_STALE_MS
    ) {
      return
    }

    try {
      set({ isLoading: true, error: null })
      const response = await api.get<{ data: ProgressSummary }>('/api/progress/summary')
      set({
        summary: response.data.data,
        isLoading: false,
        lastFetchedAt: Date.now(),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch progress'
      set({
        error: errorMessage,
        isLoading: false,
      })
    }
  },

  fetchWeeklyInsights: async () => {
    try {
      set({ isInsightsLoading: true, insightsError: null })
      const response = await api.get<{ data: WeeklyInsights }>('/api/v1/progress/weekly-insights')
      set({
        weeklyInsights: response.data.data,
        isInsightsLoading: false,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch weekly insights'
      set({
        insightsError: errorMessage,
        isInsightsLoading: false,
      })
    }
  },
}))
