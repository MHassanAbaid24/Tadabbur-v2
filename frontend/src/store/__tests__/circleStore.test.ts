import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCircleStore } from '../circleStore'
import { api } from '../../lib/api'

vi.mock('../../lib/api', () => {
  return {
    api: {
      post: vi.fn(),
      get: vi.fn(),
    },
    default: {
      post: vi.fn(),
      get: vi.fn(),
    }
  }
})

describe('circleStore - toggleLike optimistic updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCircleStore.setState({
      feed: [
        {
          reflection_id: 'ref1',
          user_display_name: 'Hassan',
          mood: 'grateful',
          prompt_1_answer: 'Answer 1',
          prompt_2_answer: 'Answer 2',
          verse_key: '2:255',
          created_at: new Date().toISOString(),
          likes_count: 5,
          is_liked: false,
        },
      ],
      isLoading: false,
      error: null,
    })
  })

  it('should optimistically like a reflection and handle successful API call', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } })

    const promise = useCircleStore.getState().toggleLike('ref1')

    // Expect store state to be updated immediately (optimistic)
    const midState = useCircleStore.getState()
    const ref = midState.feed.find((item) => item.reflection_id === 'ref1')
    expect(ref?.is_liked).toBe(true)
    expect(ref?.likes_count).toBe(6)

    await promise

    // State remains updated after API success
    const finalState = useCircleStore.getState()
    const finalRef = finalState.feed.find((item) => item.reflection_id === 'ref1')
    expect(finalRef?.is_liked).toBe(true)
    expect(finalRef?.likes_count).toBe(6)
    expect(api.post).toHaveBeenCalledWith('/api/circle/like/ref1')
  })

  it('should rollback to snapshot on API failure when no subsequent requests exist', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Network error'))

    const promise = useCircleStore.getState().toggleLike('ref1')

    // Optimistic state is applied
    expect(useCircleStore.getState().feed[0].is_liked).toBe(true)
    expect(useCircleStore.getState().feed[0].likes_count).toBe(6)

    await promise

    // Rolled back because API failed and there was only 1 pending request
    expect(useCircleStore.getState().feed[0].is_liked).toBe(false)
    expect(useCircleStore.getState().feed[0].likes_count).toBe(5)
  })

  it('should not rollback to snapshot on API failure if a newer pending request is in flight', async () => {
    // Mock first request to fail after some delay, second to succeed
    let resolveFirst: (val: any) => void = () => {}
    const firstPromise = new Promise((resolve, reject) => {
      resolveFirst = () => reject(new Error('First failed'))
    })
    vi.mocked(api.post).mockReturnValueOnce(firstPromise)
    vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } })

    const p1 = useCircleStore.getState().toggleLike('ref1') // Click 1 (Like: optimistic true, pending: 1)
    
    expect(useCircleStore.getState().feed[0].is_liked).toBe(true)
    expect(useCircleStore.getState().feed[0].likes_count).toBe(6)

    const p2 = useCircleStore.getState().toggleLike('ref1') // Click 2 (Unlike: optimistic false, pending: 2)

    expect(useCircleStore.getState().feed[0].is_liked).toBe(false)
    expect(useCircleStore.getState().feed[0].likes_count).toBe(5)

    // Resolve first (failed) click
    resolveFirst(null)
    await p1

    // Should NOT rollback to original snapshot because a newer request is still in-flight
    expect(useCircleStore.getState().feed[0].is_liked).toBe(false)
    expect(useCircleStore.getState().feed[0].likes_count).toBe(5)

    // Resolve second (success) click
    await p2

    // Final state remains correct
    expect(useCircleStore.getState().feed[0].is_liked).toBe(false)
    expect(useCircleStore.getState().feed[0].likes_count).toBe(5)
  })
})
