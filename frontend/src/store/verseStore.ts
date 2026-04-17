import { create } from 'zustand'
import type { Verse } from '../types/verse'
import api from '../lib/api'

interface VerseStore {
  verse: Verse | null
  isLoading: boolean
  error: string | null
  lastFetchedAt: number | null
  fetchTodayVerse: (force?: boolean) => Promise<void>
}

const VERSE_STALE_MS = 5 * 60 * 1000 // 5 minutes — today's verse is the same all day

export const useVerseStore = create<VerseStore>((set, get) => ({
  verse: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  fetchTodayVerse: async (force = false) => {
    const state = get()
    // Skip fetch if data is fresh (< 5 min old) and not forced
    if (
      !force &&
      state.verse &&
      state.lastFetchedAt &&
      Date.now() - state.lastFetchedAt < VERSE_STALE_MS
    ) {
      return
    }

    try {
      set({ isLoading: true, error: null })
      const response = await api.get<{ data: Verse }>('/api/verse/today')
      set({
        verse: response.data.data,
        isLoading: false,
        lastFetchedAt: Date.now(),
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
