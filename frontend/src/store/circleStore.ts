import { create } from 'zustand'
import { api } from '../lib/api'

interface CircleStore {
  circle: any | null
  feed: any[]
  isLoading: boolean
  error: string | null
  lastCircleFetchedAt: number | null
  lastFeedFetchedAt: number | null
  fetchMyCircle: (force?: boolean) => Promise<void>
  fetchCircleFeed: (force?: boolean) => Promise<void>
  likeReflection: (reflectionId: string) => Promise<void>
}

const CIRCLE_STALE_MS = 5 * 60 * 1000 // 5 minutes
const FEED_STALE_MS = 30 * 1000 // 30 seconds — matches new polling interval

export const useCircleStore = create<CircleStore>((set, get) => ({
  circle: null,
  feed: [],
  isLoading: false,
  error: null,
  lastCircleFetchedAt: null,
  lastFeedFetchedAt: null,

  fetchMyCircle: async (force = false) => {
    const state = get()
    if (
      !force &&
      state.circle &&
      state.lastCircleFetchedAt &&
      Date.now() - state.lastCircleFetchedAt < CIRCLE_STALE_MS
    ) {
      return
    }

    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/api/circle/my')
      set({
        circle: response.data.data,
        lastCircleFetchedAt: Date.now(),
      })
    } catch (err: any) {
      if (err?.response?.status === 404) {
        set({ circle: null })
      } else {
        set({
          error: err instanceof Error ? err.message : 'Failed to fetch circle',
        })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  fetchCircleFeed: async (force = false) => {
    const state = get()
    if (
      !force &&
      state.feed.length > 0 &&
      state.lastFeedFetchedAt &&
      Date.now() - state.lastFeedFetchedAt < FEED_STALE_MS
    ) {
      return
    }

    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/api/circle/feed')
      set({
        feed: response.data.data.feed || [],
        lastFeedFetchedAt: Date.now(),
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch feed',
      })
    } finally {
      set({ isLoading: false })
    }
  },

  likeReflection: async (reflectionId: string) => {
    try {
      await api.post(`/api/circle/like/${reflectionId}`)
    } catch (err) {
      console.error('Failed to like reflection:', err)
    }
  },
}))
