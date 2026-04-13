import { create } from 'zustand'
import type { Verse } from '../types/verse'
import api from '../lib/api'

interface VerseStore {
  verse: Verse | null
  isLoading: boolean
  error: string | null
  fetchTodayVerse: () => Promise<void>
}

export const useVerseStore = create<VerseStore>((set) => ({
  verse: null,
  isLoading: false,
  error: null,

  fetchTodayVerse: async () => {
    try {
      set({ isLoading: true, error: null })
      const response = await api.get<{ data: Verse }>('/api/verse/today')
      set({
        verse: response.data.data,
        isLoading: false,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch verse'
      set({
        error: errorMessage,
        isLoading: false,
      })
    }
  },
}))
