import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useVerseStore } from '../verseStore'
import api from '../../lib/api'

vi.mock('../../lib/api', () => {
  return {
    api: {
      get: vi.fn(),
    },
    default: {
      get: vi.fn(),
    }
  }
})

describe('verseStore - central caching and revalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useVerseStore.setState({
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
      // We will add the following states to the store in our implementation
      isRevalidating: false,
      versesCache: {},
      audioUrlCache: {},
      tafsirCache: {},
      promptCache: {},
    } as any)
  })

  it('should prime audio, tafsir, and prompt caches when today\'s verse is loaded', async () => {
    const mockDailyVerse = {
      verse_key: '2:255',
      text_uthmani: 'الله لا إله إلا هو',
      translation: 'Allah - there is no deity except Him',
      tafsir: 'Ibn Kathir Tafsir content here...',
      audio_url: 'http://cdn.quran.foundation/7/2_255.mp3',
      prompt_1: 'What does this mean?',
      prompt_2: 'How will you act?',
    }

    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: mockDailyVerse } })

    await useVerseStore.getState().fetchTodayVerse()

    const state = useVerseStore.getState() as any
    expect(state.audioUrlCache['2:255']).toBe(mockDailyVerse.audio_url)
    expect(state.tafsirCache['2:255']).toBe(mockDailyVerse.tafsir)
    expect(state.promptCache['2:255']).toEqual({
      prompt_1: mockDailyVerse.prompt_1,
      prompt_2: mockDailyVerse.prompt_2,
    })
  })

  it('should hit versesCache immediately and set isRevalidating on subsequent fetches', async () => {
    const mockVerses = [{ id: 1, verse_key: '1:1', text_uthmani: '...', translation: '...' }]
    
    // Setup initial cache
    useVerseStore.setState({
      versesCache: {
        1: {
          verses: mockVerses,
          hasMore: false,
          nextPage: 1,
          total: 1,
        }
      }
    } as any)

    // Mock background revalidation API call to return the same thing
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: {
          verses: mockVerses,
          pagination: { per_page: 20, current_page: 1, next_page: null, total_pages: 1, total_records: 1 }
        }
      }
    })

    const promise = useVerseStore.getState().fetchVersesByChapter(1)

    // Store is populated instantly from cache
    expect(useVerseStore.getState().versesList).toEqual(mockVerses)
    expect(useVerseStore.getState().isRevalidating).toBe(true)

    await promise

    // Revalidation completed, identical check bypassed state updates
    expect(useVerseStore.getState().isRevalidating).toBe(false)
  })

  it('should leverage audioUrlCache and tafsirCache actions without duplicate network requests', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: { audio_url: 'http://cdn/audio.mp3', verse_key: '2:255' }
      }
    })

    // Fetch first time: hits API
    const url1 = await useVerseStore.getState().getAudioUrl('2:255')
    expect(url1).toBe('http://cdn/audio.mp3')
    expect(api.get).toHaveBeenCalledWith('/api/audio/2:255')

    // Fetch second time: cache hit, no API call
    vi.clearAllMocks()
    const url2 = await useVerseStore.getState().getAudioUrl('2:255')
    expect(url2).toBe('http://cdn/audio.mp3')
    expect(api.get).not.toHaveBeenCalled()
  })

  describe('Zustand Persist & Rollover Invalidation', () => {
    it('should clear verse and lastFetchedAt if checkRollover detects a different day', () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000
      useVerseStore.setState({
        verse: { verse_key: '2:255' } as any,
        lastFetchedAt: yesterday,
      } as any)

      // @ts-ignore
      useVerseStore.getState().checkRollover()

      expect(useVerseStore.getState().verse).toBeNull()
      expect(useVerseStore.getState().lastFetchedAt).toBeNull()
    })

    it('should keep verse intact if checkRollover is called on the same day', () => {
      const today = Date.now()
      const mockVerse = { verse_key: '2:255' } as any
      useVerseStore.setState({
        verse: mockVerse,
        lastFetchedAt: today,
      } as any)

      // @ts-ignore
      useVerseStore.getState().checkRollover()

      expect(useVerseStore.getState().verse).toBe(mockVerse)
      expect(useVerseStore.getState().lastFetchedAt).toBe(today)
    })
  })
})

