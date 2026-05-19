import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCircleStore } from '../store/circleStore'
import CircleFeed from '../components/circle/CircleFeed'
import CircleInvite from '../components/circle/CircleInvite'
import CircleMembers from '../components/circle/CircleMembers'
import PageWrapper from '../components/layout/PageWrapper'
import { Users } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import { getErrorMessage } from '../lib/errors'

type CircleSummary = {
  id: string
  name: string
  invite_code?: string
}

type SwitchConflictDetail = {
  code: 'requires_switch'
  message: string
  requires_switch: boolean
  current_circle: CircleSummary
  target_circle: CircleSummary
}

function getSwitchConflictDetail(error: unknown): SwitchConflictDetail | null {
  if (!axios.isAxiosError(error)) return null
  const detail = error.response?.data?.detail
  if (
    detail &&
    typeof detail === 'object' &&
    detail.code === 'requires_switch' &&
    detail.current_circle &&
    detail.target_circle
  ) {
    return detail as SwitchConflictDetail
  }
  return null
}

export default function Circle() {
  const location = useLocation()
  const navigate = useNavigate()
  const { 
    circle: circleData, 
    feed: feedItems, 
    isLoading: storeLoading, 
    lastFeedFetchedAt,
    error: storeError, 
    fetchMyCircle, 
    fetchCircleFeed 
  } = useCircleStore()

  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [switchDetail, setSwitchDetail] = useState<SwitchConflictDetail | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [notice, setNotice] = useState<string | null>(
    typeof location.state === 'object' && location.state && 'notice' in location.state
      ? String((location.state as { notice?: string }).notice ?? '')
      : null,
  )

  useEffect(() => {
    fetchMyCircle()
    fetchCircleFeed()
  }, [fetchMyCircle, fetchCircleFeed])

  useEffect(() => {
    if (!notice) return
    navigate(location.pathname, { replace: true, state: {} })
  }, [notice, navigate, location.pathname])


  const handleLike = async (reflectionId: string, isUnlike: boolean) => {
    try {
      const endpoint = isUnlike ? `/api/circle/unlike/${reflectionId}` : `/api/circle/like/${reflectionId}`;
      await api.post(endpoint)
      // Refresh feed after like to be safe (or we could optimistically update store)
      fetchCircleFeed(true)
    } catch (err) {
      console.error('Failed to update like status:', err)
      throw err;
    }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setIsJoining(true)
    setJoinError(null)
    setSwitchDetail(null)

    try {
      await api.post(`/api/circle/join/${joinCode.trim()}`)
      // Refresh circle data after successful join
      await fetchMyCircle(true)
      await fetchCircleFeed(true)
      setNotice('You joined the circle successfully.')
    } catch (err) {
      const conflictDetail = getSwitchConflictDetail(err)
      if (conflictDetail) {
        setSwitchDetail(conflictDetail)
        return
      }
      setJoinError(getErrorMessage(err, 'Failed to join circle'))
    } finally {
      setIsJoining(false)
    }
  }

  const handleSwitchCircle = async () => {
    if (!joinCode.trim()) return
    setIsSwitching(true)
    setJoinError(null)
    try {
      await api.post(`/api/circle/switch/${joinCode.trim()}`)
      await fetchMyCircle(true)
      await fetchCircleFeed(true)
      setNotice(`Switched to ${switchDetail?.target_circle.name ?? 'the new circle'}.`)
      setSwitchDetail(null)
    } catch (err) {
      setJoinError(getErrorMessage(err, 'Failed to switch circles'))
    } finally {
      setIsSwitching(false)
    }
  }

  // Show loading skeleton ONLY if we have no data at all and it's loading
  const showSkeleton = storeLoading && !circleData && !feedItems.length
  
  if (showSkeleton) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[60vh] fade-up">
          <div className="w-full max-w-[500px] mx-auto space-y-4">
            <div className="h-8 bg-parchment rounded-[2px] w-1/3 animate-pulse" />
            <div className="space-y-3">
               {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-parchment rounded-[2px] animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (storeError) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[60vh] text-center fade-up">
          <div>
            <p className="text-red-700 font-sans text-[0.95rem] mb-6">{storeError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-ink hover:bg-gold text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase px-8 py-4 rounded-[2px] transition-all duration-300"
            >
              Retry
            </button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (!circleData && !storeLoading) {
    return (
      <PageWrapper>
        <div className="max-w-[440px] mx-auto py-10 fade-up">
          <h1 className="font-cinzel text-[1.4rem] md:text-[1.8rem] font-medium tracking-[0.06em] text-ink text-center mb-5">Join a Circle</h1>
          <p className="text-center font-sans text-muted mb-10 text-[0.95rem] leading-[1.6]">
            Share reflections with family and friends. Reflect together on the same verse daily.
          </p>
          {notice && (
            <p className="text-[0.82rem] text-emerald-800 bg-emerald-50 p-3 rounded-[2px] border border-emerald-100 text-center mb-6">
              {notice}
            </p>
          )}

          <Link
            to="/circle/new"
            className="block w-full bg-ink hover:bg-gold text-white text-center font-cinzel text-[0.75rem] tracking-[0.14em] uppercase px-8 py-4 rounded-[2px] transition-all duration-300 mb-9"
          >
            Create a Circle
          </Link>

          <div className="relative mb-9">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-cream px-4 font-cinzel text-[0.7rem] tracking-[0.1em] uppercase text-muted">or join with code</span>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {joinError && (
              <p className="text-[0.8rem] text-red-600 bg-red-50 p-3 rounded-[2px] border border-red-100 text-center">{joinError}</p>
            )}
            <input
              type="text"
              placeholder="Paste invite code here"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              disabled={isJoining}
              className="w-full bg-white border border-border p-4 rounded-[2px] font-sans text-[0.95rem] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all disabled:opacity-60"
            />
            <button
              onClick={handleJoin}
              disabled={isJoining || !joinCode.trim()}
              className="w-full bg-transparent border border-gold-light text-gold font-cinzel text-[0.75rem] tracking-[0.14em] uppercase px-8 py-[0.9rem] rounded-[2px] transition-all duration-300 hover:bg-gold-faint flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              {isJoining ? (
                <>
                  <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                'Join Circle'
              )}
            </button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <>
      <PageWrapper>
        <div className="fade-up">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-border pb-6 pt-2">
            <div>
              <h1 className="font-cinzel text-[1.4rem] md:text-[1.8rem] font-medium tracking-[0.06em] text-ink mb-2">{circleData.name}</h1>
              <p className="font-cinzel text-[0.75rem] tracking-[0.14em] text-muted uppercase">
                {circleData.member_count} {circleData.member_count === 1 ? 'member' : 'members'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMembers(true)}
                className="bg-transparent border border-gold-light text-gold font-cinzel text-[0.7rem] sm:text-[0.75rem] tracking-[0.1em] sm:tracking-[0.14em] uppercase px-4 sm:px-6 py-2.5 sm:py-3 rounded-[2px] transition-all duration-300 hover:bg-gold-faint flex items-center gap-2"
                title="View Members"
              >
                <Users size={16} />
                <span className="font-medium hidden sm:inline">Members</span>
              </button>
              <CircleInvite
                inviteCode={circleData.invite_code}
                circleName={circleData.name}
              />
            </div>
          </div>

          {/* Feed */}
          <div>
             <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-border"></div>
              <span className="font-cinzel text-[0.75rem] tracking-[0.14em] uppercase text-muted whitespace-nowrap">Shared Reflections</span>
              <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-border"></div>
            </div>
            <CircleFeed items={feedItems} isLoading={storeLoading || !lastFeedFetchedAt} onLike={handleLike} />
          </div>
        </div>
      </PageWrapper>

      {/* Members Drawer Overlay - Moved out of PageWrapper to fix z-index issues */}
      <AnimatePresence>
        {showMembers && (
          <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div 
              className="absolute inset-0 z-0" 
              onClick={() => setShowMembers(false)} 
            />
            <CircleMembers onClose={() => setShowMembers(false)} />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {switchDetail && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="absolute inset-0 z-0" onClick={() => !isSwitching && setSwitchDetail(null)} />
            <div className="relative z-10 bg-white rounded-[4px] border border-border shadow-xl w-full max-w-[520px] p-6 space-y-5">
              <h2 className="font-cinzel text-[1.1rem] tracking-[0.06em] text-ink">Switch circles?</h2>
              <p className="font-sans text-[0.92rem] text-muted leading-[1.6]">{switchDetail.message}</p>
              <div className="space-y-1 font-sans text-[0.9rem] text-ink">
                <p><span className="font-semibold">Current:</span> {switchDetail.current_circle.name}</p>
                <p><span className="font-semibold">Target:</span> {switchDetail.target_circle.name}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleSwitchCircle}
                  disabled={isSwitching}
                  className="flex-1 bg-ink hover:bg-gold text-white font-cinzel text-[0.72rem] tracking-[0.12em] uppercase px-5 py-3 rounded-[2px] transition-all duration-300 disabled:opacity-60"
                >
                  {isSwitching ? 'Switching...' : 'Confirm Switch'}
                </button>
                <button
                  type="button"
                  onClick={() => setSwitchDetail(null)}
                  disabled={isSwitching}
                  className="flex-1 bg-transparent border border-gold-light text-gold font-cinzel text-[0.72rem] tracking-[0.12em] uppercase px-5 py-3 rounded-[2px] transition-all duration-300 hover:bg-gold-faint disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
