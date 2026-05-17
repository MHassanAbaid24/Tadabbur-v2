import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCircleStore } from '../store/circleStore'
import PageWrapper from '../components/layout/PageWrapper'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import { getErrorMessage } from '../lib/errors'

export default function CircleJoin() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { fetchMyCircle, fetchCircleFeed } = useCircleStore()

  const [status, setStatus] = useState<'joining' | 'success' | 'error'>('joining')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const joinCircle = async () => {
      if (!code) {
        setStatus('error')
        setError('Invalid invite code')
        return
      }

      try {
        await api.get(`/api/circle/join/${code}`)
        setStatus('success')
        
        // Refresh store data
        await fetchMyCircle(true)
        await fetchCircleFeed(true)
        
        // Redirect to circle page after a short delay
        setTimeout(() => {
          navigate('/circle')
        }, 2000)
      } catch (err: any) {
        setStatus('error')
        setError(getErrorMessage(err, 'Failed to join circle'))
      }
    }

    joinCircle()
  }, [code, navigate, fetchMyCircle, fetchCircleFeed])

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

        {status === 'success' && (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-20 h-20 bg-parchment rounded-full mx-auto border border-gold-light">
              <CheckCircle2 className="w-10 h-10 text-gold" />
            </div>
            <h1 className="font-cinzel text-[1.4rem] md:text-[1.8rem] font-medium tracking-[0.06em] text-ink">Successfully Joined!</h1>
            <p className="font-sans text-muted text-[0.95rem]">Welcome to the circle. Redirecting you now...</p>
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
