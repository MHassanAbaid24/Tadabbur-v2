import { create } from 'zustand'
import { api } from '../lib/api'

interface CircleMember {
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  joined_at: string
  is_admin: boolean
  is_creator: boolean
}

interface CircleStore {
  circle: any | null
  feed: any[]
  members: CircleMember[]
  isLoading: boolean
  isLoadingMembers: boolean
  error: string | null
  lastCircleFetchedAt: number | null
  lastFeedFetchedAt: number | null
  pendingLikes: Record<string, number>
  fetchMyCircle: (force?: boolean) => Promise<void>
  fetchCircleFeed: (force?: boolean) => Promise<void>
  fetchMembers: () => Promise<void>
  makeAdmin: (userId: string) => Promise<void>
  demoteAdmin: (userId: string) => Promise<void>
  removeMember: (userId: string) => Promise<void>
  likeReflection: (reflectionId: string) => Promise<void>
  toggleLike: (reflectionId: string) => Promise<void>
}

const CIRCLE_STALE_MS = 5 * 60 * 1000 // 5 minutes
const FEED_STALE_MS = 5 * 60 * 1000 // 5 minutes — SSE handles real-time refreshes

export const useCircleStore = create<CircleStore>((set, get) => ({
  circle: null,
  feed: [],
  members: [],
  isLoading: false,
  isLoadingMembers: false,
  error: null,
  lastCircleFetchedAt: null,
  lastFeedFetchedAt: null,
  pendingLikes: {},

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
        set({ circle: null, feed: [] })
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
    } catch (err: any) {
      if (err?.response?.status === 404) {
        set({ feed: [] })
      } else {
        set({
          error: err instanceof Error ? err.message : 'Failed to fetch feed',
        })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  fetchMembers: async () => {
    set({ isLoadingMembers: true })
    try {
      const response = await api.get('/api/circle/members')
      set({ members: response.data.data.members || [] })
    } catch (err) {
      console.error('Failed to fetch circle members:', err)
    } finally {
      set({ isLoadingMembers: false })
    }
  },

  makeAdmin: async (userId: string) => {
    try {
      await api.post(`/api/circle/admin/${userId}`)
      // Update local state
      set((state) => ({
        members: state.members.map((m) =>
          m.user_id === userId ? { ...m, is_admin: true } : m
        ),
      }))
    } catch (err) {
      console.error('Failed to grant admin status:', err)
      throw err
    }
  },

  demoteAdmin: async (userId: string) => {
    try {
      await api.post(`/api/circle/admin/demote/${userId}`)
      // Update local state
      set((state) => ({
        members: state.members.map((m) =>
          m.user_id === userId ? { ...m, is_admin: false } : m
        ),
      }))
    } catch (err) {
      console.error('Failed to demote member:', err)
      throw err
    }
  },

  removeMember: async (userId: string) => {
    try {
      await api.delete(`/api/circle/members/${userId}`)
      
      // Update local state
      set((state) => ({
        members: state.members.filter((m) => m.user_id !== userId),
      }))

      // After successful removal, refresh circle status to see if WE left
      // This is safer than trying to guess user ID locally
      const { fetchMyCircle } = get()
      await fetchMyCircle(true)
    } catch (err) {
      console.error('Failed to remove member:', err)
      throw err
    }
  },

  likeReflection: async (reflectionId: string) => {
    try {
      await api.post(`/api/circle/like/${reflectionId}`)
    } catch (err) {
      console.error('Failed to like reflection:', err)
    }
  },

  toggleLike: async (reflectionId: string) => {
    const { feed, pendingLikes } = get()
    const targetItem = feed.find((item) => item.reflection_id === reflectionId)
    if (!targetItem) return

    // Capture snapshot of this item's current state
    const snapshot = {
      is_liked: !!targetItem.is_liked,
      likes_count: targetItem.likes_count ?? 0,
    }

    const nextIsLiked = !snapshot.is_liked
    const nextLikesCount = nextIsLiked
      ? snapshot.likes_count + 1
      : Math.max(0, snapshot.likes_count - 1)

    // Increment request counter
    const currentPending = pendingLikes[reflectionId] ?? 0
    const nextPendingLikes = { ...pendingLikes, [reflectionId]: currentPending + 1 }

    // Update state immediately (optimistic)
    set({
      feed: feed.map((item) =>
        item.reflection_id === reflectionId
          ? { ...item, is_liked: nextIsLiked, likes_count: nextLikesCount }
          : item
      ),
      pendingLikes: nextPendingLikes,
    })

    try {
      const endpoint = snapshot.is_liked
        ? `/api/circle/unlike/${reflectionId}`
        : `/api/circle/like/${reflectionId}`
      await api.post(endpoint)
    } catch (err) {
      console.error('Failed to toggle like:', err)
      // Check if this was the latest in-flight request
      const currentStoreState = get()
      const activePending = currentStoreState.pendingLikes[reflectionId] ?? 1
      if (activePending === 1) {
        // Rollback
        set({
          feed: currentStoreState.feed.map((item) =>
            item.reflection_id === reflectionId
              ? { ...item, is_liked: snapshot.is_liked, likes_count: snapshot.likes_count }
              : item
          ),
        })
      }
    } finally {
      // Decrement pending request count
      const finalState = get()
      const currentPendingCount = finalState.pendingLikes[reflectionId] ?? 1
      const finalPendingLikes = { ...finalState.pendingLikes }
      if (currentPendingCount <= 1) {
        delete finalPendingLikes[reflectionId]
      } else {
        finalPendingLikes[reflectionId] = currentPendingCount - 1
      }
      set({ pendingLikes: finalPendingLikes })
    }
  },
}))
