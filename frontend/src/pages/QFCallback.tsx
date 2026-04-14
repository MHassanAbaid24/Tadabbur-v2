import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function QFCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const hasExchanged = useRef(false)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      setError('Missing authorization code or state parameter')
      setIsLoading(false)
      return
    }

    if (hasExchanged.current) return
    hasExchanged.current = true

    const exchangeCode = async () => {
      try {
        await api.post('/api/auth/qf/callback', { code, state })
        // On success, navigate back to onboarding (will be at step 3)
        localStorage.setItem('tadabbur_onboarding_step', '3')
        
        // Add a small delay to ensure token is persisted
        setTimeout(() => {
          navigate('/onboarding', { replace: true })
        }, 500)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to connect quran.com account',
        )
        setIsLoading(false)
      }
    }

    exchangeCode()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {isLoading && !error && (
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-gold-200 border-t-gold-500 rounded-full mx-auto mb-4" />
            <p className="text-gray-600 font-medium">
              Connecting your account...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Please wait while we complete your authentication
            </p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Connection Failed
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/onboarding', { replace: true })}
              className="w-full bg-gold-500 hover:bg-gold-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Back to Onboarding
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
