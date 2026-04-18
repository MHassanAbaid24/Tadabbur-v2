import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCircleStore } from '../store/circleStore'
import PageWrapper from '../components/layout/PageWrapper'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'

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
        const errorMessage = err?.response?.data?.detail || err?.response?.data?.error || 'Failed to join circle'
        setError(errorMessage)
      }
    }

    joinCircle()
  }, [code, navigate, fetchMyCircle, fetchCircleFeed])

  return (
    <PageWrapper className="bg-gradient-to-b from-cream-50 to-white">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        {status === 'joining' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Joining Circle...</h1>
            <p className="text-gray-600">Please wait while we set things up for you.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Successfully Joined!</h1>
            <p className="text-gray-600">Welcome to the circle. Redirecting you now...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 max-w-md">
            <div className="bg-red-50 p-4 rounded-2xl flex flex-col items-center gap-3">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-red-900">Join Failed</h2>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Link
                to="/circle"
                className="block w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-200 transition-all border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1"
              >
                Go to Circles
              </Link>
              <Link
                to="/home"
                className="block w-full px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
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
