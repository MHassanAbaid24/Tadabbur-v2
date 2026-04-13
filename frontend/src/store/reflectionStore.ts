import { create } from 'zustand'
import type { Reflection, ReflectionSubmitRequest } from '../types/reflection'
import api from '../lib/api'

interface ReflectionStore {
  todayReflection: Reflection | null
  history: Reflection[]
  isSubmitting: boolean
  isLoading: boolean
  error: string | null
  fetchTodayReflection: () => Promise<void>
  submitReflection: (data: ReflectionSubmitRequest) => Promise<Reflection>
  fetchHistory: () => Promise<void>
}

export const useReflectionStore = create<ReflectionStore>((set) => ({
  todayReflection: null,
  history: [],
  isSubmitting: false,
  isLoading: false,
  error: null,

  fetchTodayReflection: async () => {
    try {
      set({ isLoading: true, error: null })
      const response = await api.get<{ data: Reflection | null }>('/api/reflection/today')
      set({
        todayReflection: response.data.data,
        isLoading: false,
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

  fetchHistory: async () => {
    try {
      set({ isLoading: true, error: null })
      const response = await api.get<{ data: { reflections: Reflection[] } }>('/api/reflection/history')
      set({
        history: response.data.data.reflections,
        isLoading: false,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch history'
      set({
        error: errorMessage,
        isLoading: false,
      })
    }
  },
}))
