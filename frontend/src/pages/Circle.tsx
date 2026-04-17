import { useEffect, useState } from 'react'
import { useCircleStore } from '../store/circleStore'
import CircleFeed from '../components/circle/CircleFeed'
import CircleInvite from '../components/circle/CircleInvite'
import { Link } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'
import api from '../lib/api'

export default function Circle() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasCircle, setHasCircle] = useState(false)
  const [circleData, setCircleData] = useState<any>(null)
  const [feedItems, setFeedItems] = useState<any[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch circle + feed in parallel
        const circleResponse = await api.get('/api/circle/my')

        if (circleResponse.data) {
          const circle = circleResponse.data.data
          setCircleData(circle)
          setHasCircle(true)

          // Fetch feed
          try {
            const feedResponse = await api.get('/api/circle/feed')
            setFeedItems(feedResponse.data.data.feed || [])
          } catch {
            // Feed fetch failure is non-critical
          }
        }
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setHasCircle(false)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load circle')
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Poll for feed updates — 30s interval (reduced from 5s)
  useEffect(() => {
    if (!hasCircle) return;
    
    const interval = setInterval(async () => {
      try {
        const feedResponse = await api.get('/api/circle/feed')
        setFeedItems(feedResponse.data.data.feed || [])
      } catch {
        // ignore background interval errors
      }
    }, 30000); // 30 seconds — appropriate for a daily reflection app

    return () => clearInterval(interval);
  }, [hasCircle])

  const handleLike = async (reflectionId: string, isUnlike: boolean) => {
    try {
      const endpoint = isUnlike ? `/api/circle/unlike/${reflectionId}` : `/api/circle/like/${reflectionId}`;
      const response = await api.post(endpoint)
      if (response.data) {
        // Optimistically update feed items
        setFeedItems((prev) =>
          prev.map((item) =>
            item.reflection_id === reflectionId
              ? { 
                  ...item, 
                  likes_count: Math.max(0, (item.likes_count || 0) + (isUnlike ? -1 : 1)), 
                  is_liked: !isUnlike 
                }
              : item
          )
        )
      }
    } catch (err) {
      console.error('Failed to update like status:', err)
      throw err;
    }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setIsJoining(true)
    setJoinError(null)

    try {
      const response = await api.get(`/api/circle/join/${joinCode.trim()}`)

      if (response.data) {
        setCircleData(response.data.data)
        setHasCircle(true)
        // Refresh feed after joining
        try {
          const feedResponse = await api.get('/api/circle/feed')
          setFeedItems(feedResponse.data.data.feed || [])
        } catch {
          // non-critical
        }
      }
    } catch (err: any) {
      const errorData = err?.response?.data
      setJoinError(errorData?.detail || errorData?.error || 'Failed to join circle')
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading) {
    return (
      <PageWrapper className="bg-gradient-to-b from-cream-50 to-white">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-lg space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
            <div className="space-y-2">
               {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (error) {
    return (
      <PageWrapper className="bg-gradient-to-b from-cream-50 to-white">
        <div className="flex items-center justify-center min-h-[60vh] text-center">
          <div>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (!hasCircle) {
    return (
      <PageWrapper className="bg-gradient-to-b from-cream-50 to-white">
        <div className="py-12 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Join a Circle</h1>
            <p className="text-gray-600 text-sm">
              Share reflections with family and friends. Reflect together on the same verse daily.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/circle/new"
              className="block w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-center transition-colors"
            >
              Create a Circle
            </Link>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <div className="space-y-2">
              {joinError && (
                <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{joinError}</p>
              )}
              <input
                type="text"
                placeholder="Paste invite code here"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                disabled={isJoining}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50"
              />
              <button
                onClick={handleJoin}
                disabled={isJoining || !joinCode.trim()}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Circle'
                )}
              </button>
            </div>
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="bg-gradient-to-b from-cream-50 to-white">
      <div className="py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{circleData.name}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {circleData.member_count} {circleData.member_count === 1 ? 'member' : 'members'}
          </p>
        </div>

        {/* Invite */}
        <CircleInvite
          inviteCode={circleData.invite_code}
          circleName={circleData.name}
        />

        {/* Feed */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Shared Reflections
          </h2>
          <CircleFeed items={feedItems} onLike={handleLike} />
        </div>
      </div>
    </PageWrapper>
  )
}
