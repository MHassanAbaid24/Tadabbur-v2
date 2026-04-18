import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useCircleStore } from '../store/circleStore'
import { useProgressStore } from '../store/progressStore'

/**
 * Reusable hook to listen for real-time events via SSE.
 * Connects when the user is authenticated and dispatches events to stores.
 */
export function useEventStream() {
  const token = useAuthStore((s) => s.token)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Only connect if we have a token
    if (!token) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    // EventSource does not support custom headers, so we pass the token via query parameter.
    // This requires the backend (Module 5) to support 'token' query param.
    const url = `${baseUrl}/api/events/stream?token=${token}`

    console.log('[SSE] Connecting to event stream...')
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'connected') {
          console.info('[SSE] Channel connected successfully')
          return
        }

        if (data.type === 'feed_update') {
          console.debug('[SSE] New reflection/interaction in circle, refreshing feed...')
          useCircleStore.getState().fetchCircleFeed(true)
        }

        if (data.type === 'progress_update') {
          console.debug('[SSE] Progress change detected, refreshing summary...')
          useProgressStore.getState().fetchSummary(true)
        }
      } catch (e) {
        // Heartbeats or malformed JSON; ignore safely
      }
    }

    es.onerror = (err) => {
      // EventSource naturally auto-reconnects on error
      console.warn('[SSE] Connection error. Auto-reconnecting in background...', err)
    }

    return () => {
      console.log('[SSE] Closing event stream connection')
      es.close()
      eventSourceRef.current = null
    }
  }, [token])
}
