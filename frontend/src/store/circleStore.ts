import { create } from 'zustand'
import { api } from '../lib/api'

interface CircleStore {
  circle: any | null
  feed: any[]
  isLoading: boolean
  error: string | null
  fetchMyCircle: () => Promise<void>
  fetchCircleFeed: () => Promise<void>
  likeReflection: (reflectionId: string) => Promise<void>
}

export const useCircleStore = create<CircleStore>((set) => ({
  circle: null,
  feed: [],
  isLoading: false,
  error: null,

  fetchMyCircle: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/circle/my')
      set({ circle: response.data.data })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch circle',
      })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchCircleFeed: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/circle/feed')
      set({ feed: response.data.data.feed || [] })
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
      await api.post(`/circle/like/${reflectionId}`)
    } catch (err) {
      console.error('Failed to like reflection:', err)
    }
  },
}))
