import { create } from 'zustand'
import type { Reflection, ReflectionSubmitRequest } from '../types/reflection'
import api, { generateReflectionInsight } from '../lib/api'

interface ReflectionStore {
  todayReflection: Reflection | null
  history: Reflection[]
  isSubmitting: boolean
  isLoading: boolean
  insightLoadingId: string | null // Track which reflection is generating insight
  error: string | null
  lastTodayFetchedAt: number | null
  lastHistoryFetchedAt: number | null
  fetchTodayReflection: (force?: boolean) => Promise<void>
  submitReflection: (data: ReflectionSubmitRequest) => Promise<Reflection>
  fetchHistory: (force?: boolean) => Promise<void>
  generateInsight: (reflectionId: string) => Promise<void>
}

const TODAY_STALE_MS = 2 * 60 * 1000 // 2 minutes
const HISTORY_STALE_MS = 5 * 60 * 1000 // 5 minutes

export const useReflectionStore = create<ReflectionStore>((set, get) => ({
  todayReflection: null,
  history: [],
  isSubmitting: false,
  isLoading: false,
  insightLoadingId: null,
  error: null,
  lastTodayFetchedAt: null,
  lastHistoryFetchedAt: null,

  fetchTodayReflection: async (force = false) => {
    const state = get()
    if (
      !force &&
      state.lastTodayFetchedAt &&
      Date.now() - state.lastTodayFetchedAt < TODAY_STALE_MS
    ) {
      return
    }

    try {
      set({ isLoading: true, error: null })
      const response = await api.get<{ data: Reflection | null }>('/api/reflection/today')
      set({
        todayReflection: response.data.data,
        isLoading: false,
        lastTodayFetchedAt: Date.now(),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch reflection'
      set({
        error: errorMessage,
        isLoading: false,
      })
    }
  },

  submitReflection: async (data: ReflectionSubmitRequest): Promise<Reflection> => {
    try {
      set({ isSubmitting: true, error: null })
      const response = await api.post<{ data: Reflection }>('/api/reflection/submit', data)
      const reflection = response.data.data
      set({
        todayReflection: reflection,
        isSubmitting: false,
        lastTodayFetchedAt: Date.now(), // Mark as fresh after submission
      })
      return reflection
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit reflection'
      set({
        error: errorMessage,
        isSubmitting: false,
      })
      throw error
    }
  },

  fetchHistory: async (force = false) => {
    const state = get()
    if (
      !force &&
      state.history.length > 0 &&
      state.lastHistoryFetchedAt &&
      Date.now() - state.lastHistoryFetchedAt < HISTORY_STALE_MS
    ) {
      return
    }

    try {
      set({ isLoading: true, error: null })
      const response = await api.get<{ data: { reflections: Reflection[] } }>('/api/reflection/history')
      set({
        history: response.data.data.reflections,
        isLoading: false,
        lastHistoryFetchedAt: Date.now(),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch history'
      set({
        error: errorMessage,
        isLoading: false,
      })
    }
  },

  generateInsight: async (reflectionId: string) => {
    const state = get()
    try {
      set({ insightLoadingId: reflectionId, error: null })

      // Call the API to generate or fetch cached insight
      const { insight, cached } = await generateReflectionInsight(reflectionId)

      // Update the specific reflection in the store
      if (state.todayReflection?.id === reflectionId) {
        // Update today's reflection
        set((s) => ({
          todayReflection: s.todayReflection
            ? { ...s.todayReflection, ai_action_suggestion: insight }
            : null,
          insightLoadingId: null,
        }))
      } else {
        // Update in history
        set((s) => ({
          history: s.history.map((r) =>
            r.id === reflectionId
              ? { ...r, ai_action_suggestion: insight }
              : r,
          ),
          insightLoadingId: null,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate insight'
      set({
        error: errorMessage,
        insightLoadingId: null,
      })
    }
  },
