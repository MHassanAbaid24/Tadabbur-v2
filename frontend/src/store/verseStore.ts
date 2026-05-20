import { create } from 'zustand'
import api from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import { Chapter, Verse, VerseListItem } from '../types/verse'

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
  
  // Caching states
  isRevalidating: boolean
  versesCache: Record<number, { verses: VerseListItem[]; hasMore: boolean; nextPage: number; total: number }>
  audioUrlCache: Record<string, string>
  tafsirCache: Record<string, string>
  promptCache: Record<string, { prompt_1: string; prompt_2: string }>

  fetchTodayVerse: (force?: boolean) => Promise<void>
  fetchChapters: () => Promise<void>
  fetchVersesByChapter: (chapterNumber: number, page?: number) => Promise<void>
  getAudioUrl: (verseKey: string) => Promise<string>
  getTafsir: (verseKey: string) => Promise<string>
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

  isRevalidating: false,
  versesCache: {},
  audioUrlCache: {},
  tafsirCache: {},
  promptCache: {},

  fetchTodayVerse: async (force = false) => {
    const state = get()
    if (!force && state.verse && state.lastFetchedAt && Date.now() - state.lastFetchedAt < VERSE_STALE_MS) {
      return
    }

    try {
      set({ isLoading: true, error: null })
      const response = await api.get<{ data: Verse }>('/api/v1/daily')
      const verse = response.data.data
      set((state) => ({
        verse,
        isLoading: false,
        lastFetchedAt: Date.now(),
        // Prime caches
        audioUrlCache: { ...state.audioUrlCache, [verse.verse_key]: verse.audio_url || '' },
        tafsirCache: { ...state.tafsirCache, [verse.verse_key]: verse.tafsir || '' },
        promptCache: {
          ...state.promptCache,
          [verse.verse_key]: {
            prompt_1: verse.prompt_1 || '',
            prompt_2: verse.prompt_2 || '',
          },
        },
      }))
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
    const { versesCache } = get()
    const isFirstPage = page === 1

    // 1. Cache Hit check for page 1
    if (isFirstPage && versesCache[chapterNumber]) {
      const cached = versesCache[chapterNumber]
      set({
        versesList: cached.verses,
        hasMoreVerses: cached.hasMore,
        nextVersePage: cached.nextPage,
        totalVerses: cached.total,
        isRevalidating: true,
        error: null,
      })
    } else {
      set({ versesList: [], isLoadingVerses: true, error: null })
    }

    try {
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
      const nextHasMore = pagination.next_page !== null
      const nextNextPage = pagination.next_page || 1
      const nextTotal = pagination.total_records
      
      const nextVersesList = isFirstPage ? verses : [...get().versesList, ...verses]

      // 2. Perform Deep Comparison (metadata-based)
      if (isFirstPage && versesCache[chapterNumber]) {
        const cached = versesCache[chapterNumber]
        const isIdentical =
          cached.verses.length === verses.length &&
          cached.verses[0]?.id === verses[0]?.id &&
          cached.verses[cached.verses.length - 1]?.id === verses[verses.length - 1]?.id

        if (isIdentical) {
          set({
            isRevalidating: false,
            isLoadingVerses: false,
          })
          return
        }
      }

      // 3. Write/update cache
      const updatedCache = { ...get().versesCache }
      if (isFirstPage) {
        updatedCache[chapterNumber] = {
          verses,
          hasMore: nextHasMore,
          nextPage: nextNextPage,
          total: nextTotal,
        }
      }

      set({
        versesList: nextVersesList,
        hasMoreVerses: nextHasMore,
        nextVersePage: nextNextPage,
        totalVerses: nextTotal,
        versesCache: updatedCache,
        isLoadingVerses: false,
        isRevalidating: false,
      })
    } catch (error: any) {
      set({ error: getErrorMessage(error, 'Failed to fetch verses'), isLoadingVerses: false, isRevalidating: false })
    }
  },

  getAudioUrl: async (verseKey: string) => {
    const { audioUrlCache } = get()
    if (audioUrlCache[verseKey]) {
      return audioUrlCache[verseKey]
    }

    const response = await api.get<{ data: { audio_url: string; verse_key: string } }>(
      `/api/audio/${verseKey}`
    )
    const url = response.data.data.audio_url

    set((state) => ({
      audioUrlCache: { ...state.audioUrlCache, [verseKey]: url },
    }))
    return url
  },

  getTafsir: async (verseKey: string) => {
    const { tafsirCache } = get()
    if (tafsirCache[verseKey]) {
      return tafsirCache[verseKey]
    }

    const response = await api.get<{ data: { tafsir: string; verse_key: string } }>(
      `/api/tafsir/${verseKey}`
    )
    const content = response.data.data.tafsir

    set((state) => ({
      tafsirCache: { ...state.tafsirCache, [verseKey]: content },
    }))
    return content
  },
}))
