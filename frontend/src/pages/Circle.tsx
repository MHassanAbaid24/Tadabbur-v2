import { useEffect, useState } from 'react'
import { useCircleStore } from '../store/circleStore'
import CircleFeed from '../components/circle/CircleFeed'
import CircleInvite from '../components/circle/CircleInvite'
import { Link } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'

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
        // Try to fetch user's circle
        const circleResponse = await fetch('/api/circle/my', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('tadabbur_token')}`,
          },
        })

        if (circleResponse.ok) {
          const circleJson = await circleResponse.json()
          const circle = circleJson.data
          setCircleData(circle)
          setHasCircle(true)

          // Fetch feed
          const feedResponse = await fetch('/api/circle/feed', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('tadabbur_token')}`,
            },
          })
          if (feedResponse.ok) {
            const feedJson = await feedResponse.json()
            setFeedItems(feedJson.data.feed || [])
          }
        } else {
          setHasCircle(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load circle')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleLike = async (reflectionId: string, isUnlike: boolean) => {
    try {
      const endpoint = isUnlike ? `/api/circle/unlike/${reflectionId}` : `/api/circle/like/${reflectionId}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tadabbur_token')}`,
        },
      })
      if (response.ok) {
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
      } else {
        throw new Error('Failed to update like status');
      }
    } catch (err) {
      console.error('Failed to update like status:', err)
      throw err; // throw to let the feed component know it failed, so it could revert the optimistic UI if you added that logic
    }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setIsJoining(true)
    setJoinError(null)

    try {
      const response = await fetch(`/api/circle/join/${joinCode.trim()}`, {
        method: 'GET', // Following backend join_circle route which uses GET /join/{code}
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tadabbur_token')}`,
        },
      })

      if (response.ok) {
        const json = await response.json()
        setCircleData(json.data)
        setHasCircle(true)
        // Refresh feed after joining
        const feedResponse = await fetch('/api/circle/feed', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('tadabbur_token')}`,
          },
        })
        if (feedResponse.ok) {
          const feedJson = await feedResponse.json()
          setFeedItems(feedJson.data.feed || [])
        }
      } else {
        const errorData = await response.json()
        setJoinError(errorData.detail || 'Failed to join circle')
      }
    } catch (err) {
      setJoinError('Something went wrong. Please try again.')
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
