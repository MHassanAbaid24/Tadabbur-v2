import axios from 'axios'
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCircleStore } from '../store/circleStore'
import PageWrapper from '../components/layout/PageWrapper'
import { AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
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

const pendingJoinByCode = new Map<string, Promise<void>>()

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

function joinCircleOnce(code: string): Promise<void> {
  const existingRequest = pendingJoinByCode.get(code)
  if (existingRequest) return existingRequest

  const request = api.post(`/api/circle/join/${code}`).then(() => undefined)
  pendingJoinByCode.set(code, request)
  return request.finally(() => {
    pendingJoinByCode.delete(code)
  })
}

export default function CircleJoin() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { fetchMyCircle, fetchCircleFeed } = useCircleStore()

  const [status, setStatus] = useState<'joining' | 'confirm-switch' | 'error'>('joining')
  const [error, setError] = useState<string | null>(null)
  const [switchDetail, setSwitchDetail] = useState<SwitchConflictDetail | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)

  useEffect(() => {
    let isActive = true
    const joinCircle = async () => {
      if (!code) {
        setStatus('error')
        setError('Invalid invite code')
        return
      }

      try {
        await joinCircleOnce(code)
        await fetchMyCircle(true)
        await fetchCircleFeed(true)
        if (!isActive) return
        navigate('/circle', {
          replace: true,
          state: { notice: 'You joined the circle successfully.' },
        })
      } catch (err) {
        if (!isActive) return
        const conflictDetail = getSwitchConflictDetail(err)
        if (conflictDetail) {
          setSwitchDetail(conflictDetail)
          setStatus('confirm-switch')
          return
        }
        setStatus('error')
        setError(getErrorMessage(err, 'Failed to join circle'))
      }
    }

    joinCircle()
    return () => {
      isActive = false
    }
  }, [code, navigate, fetchMyCircle, fetchCircleFeed])

  const handleConfirmSwitch = async () => {
    if (!code) return
    setIsSwitching(true)
    setError(null)
    try {
      await api.post(`/api/circle/switch/${code}`)
      await fetchMyCircle(true)
      await fetchCircleFeed(true)
      navigate('/circle', {
        replace: true,
        state: { notice: `Switched to ${switchDetail?.target_circle.name ?? 'the new circle'}.` },
      })
    } catch (err) {
      setStatus('error')
      setError(getErrorMessage(err, 'Failed to switch circles'))
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 fade-up">
        {status === 'joining' && (
          <div className="space-y-6">
            <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
            <h1 className="font-cinzel text-[1.4rem] md:text-[1.8rem] font-medium tracking-[0.06em] text-ink">Joining Circle...</h1>
            <p className="font-sans text-muted text-[0.95rem]">Please wait while we set things up for you.</p>
          </div>
        )}

        {status === 'confirm-switch' && switchDetail && (
          <div className="space-y-8 max-w-[520px] w-full">
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2px] text-left">
              <h2 className="font-cinzel text-[1.1rem] font-medium text-amber-900 tracking-[0.06em] mb-3">Switch circles?</h2>
              <p className="font-sans text-amber-900 text-[0.92rem] leading-[1.6] mb-4">{switchDetail.message}</p>
              <div className="space-y-2 font-sans text-[0.9rem]">
                <p className="text-amber-900"><span className="font-semibold">Current:</span> {switchDetail.current_circle.name}</p>
                <p className="text-amber-900"><span className="font-semibold">Target:</span> {switchDetail.target_circle.name}</p>
              </div>
            </div>
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleConfirmSwitch}
                disabled={isSwitching}
                className="block w-full bg-ink hover:bg-gold text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase px-8 py-4 rounded-[2px] transition-all duration-300 disabled:opacity-60"
              >
                {isSwitching ? 'Switching...' : `Leave "${switchDetail.current_circle.name}" and Join "${switchDetail.target_circle.name}"`}
              </button>
              <Link
                to="/circle"
                className="block w-full bg-transparent border border-gold-light text-gold font-cinzel text-[0.75rem] tracking-[0.14em] uppercase px-8 py-[0.9rem] rounded-[2px] transition-all duration-300 hover:bg-gold-faint"
              >
                Cancel
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-8 max-w-[440px] w-full">
            <div className="bg-red-50 border border-red-100 p-6 rounded-[2px] flex flex-col items-center gap-4">
              <AlertCircle className="w-10 h-10 text-red-700" />
              <div className="space-y-2">
                <h2 className="font-cinzel text-[1.1rem] font-medium text-red-900 tracking-[0.06em]">Join Failed</h2>
                <p className="font-sans text-red-800 text-[0.9rem]">{error}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <Link
                to="/circle"
                className="block w-full bg-ink hover:bg-gold text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase px-8 py-4 rounded-[2px] transition-all duration-300"
              >
                Go to Circles
              </Link>
              <Link
                to="/home"
                className="block w-full bg-transparent border border-gold-light text-gold font-cinzel text-[0.75rem] tracking-[0.14em] uppercase px-8 py-[0.9rem] rounded-[2px] transition-all duration-300 hover:bg-gold-faint"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
