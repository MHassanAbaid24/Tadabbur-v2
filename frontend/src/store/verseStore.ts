import { create } from 'zustand'
import type { Verse, Chapter, VerseListItem } from '../types/verse'
import api from '../lib/api'
import { getErrorMessage } from '../lib/errors'

interface VerseStore {
  verse: Verse | null
  isLoading: boolean
  error: string | null
  lastFetchedAt: number | null
  
  // Explore state
  chapters: Chapter[]
  isLoadingChapters: boolean
  versesList: VerseListItem[]
  isLoadingVerses: boolean
  hasMoreVerses: boolean
  nextVersePage: number
  totalVerses: number
  
  fetchTodayVerse: (force?: boolean) => Promise<void>
  fetchChapters: () => Promise<void>
  fetchVersesByChapter: (chapterNumber: number, page?: number) => Promise<void>
}

const VERSE_STALE_MS = 5 * 60 * 1000 // 5 minutes — today's verse is the same all day

export const useVerseStore = create<VerseStore>((set, get) => ({
  verse: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,
  
  chapters: [],
  isLoadingChapters: false,
  versesList: [],
  isLoadingVerses: false,
  hasMoreVerses: false,
  nextVersePage: 1,
  totalVerses: 0,

  fetchTodayVerse: async (force = false) => {
    const state = get()
    if (!force && state.verse && state.lastFetchedAt && Date.now() - state.lastFetchedAt < VERSE_STALE_MS) {
      return
    }

    try {
      set({ isLoading: true, error: null })
      const response = await api.get<{ data: Verse }>('/api/v1/daily')
      set({
        verse: response.data.data,
        isLoading: false,
        lastFetchedAt: Date.now(),
      })
    } catch (error: any) {
      set({
        error: getErrorMessage(error, 'Failed to fetch verse'),
        isLoading: false,
      })
    }
  },

  fetchChapters: async () => {
    try {
      set({ isLoadingChapters: true })
      const response = await api.get<{ data: Chapter[] }>('/api/verse/chapters')
      set({ chapters: response.data.data, isLoadingChapters: false })
    } catch (error: any) {
      set({ error: getErrorMessage(error, 'Failed to fetch chapters'), isLoadingChapters: false })
    }
  },

  fetchVersesByChapter: async (chapterNumber: number, page = 1) => {
    try {
      set({ isLoadingVerses: true })
      
      const response = await api.get<{
        data: {
          verses: VerseListItem[]
          pagination: {
            per_page: number
            current_page: number
            next_page: number | null
            total_pages: number
            total_records: number
          }
        }
      }>(`/api/verse/chapters/${chapterNumber}/verses?page=${page}&per_page=20`)
      
      const { verses, pagination } = response.data.data
      
      set((state) => ({
        versesList: page === 1 ? verses : [...state.versesList, ...verses],
        hasMoreVerses: pagination.next_page !== null,
        nextVersePage: pagination.next_page || 1,
        totalVerses: pagination.total_records,
        isLoadingVerses: false,
      }))
    } catch (error: any) {
      set({ error: getErrorMessage(error, 'Failed to fetch verses'), isLoadingVerses: false })
    }
  }
}))
