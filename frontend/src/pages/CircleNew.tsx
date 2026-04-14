import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ArrowLeft, Copy, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '../components/layout/PageWrapper'
import api from '../lib/api'

type Step = 'form' | 'success'

interface CircleData {
  id: string
  name: string
  invite_code: string
  member_count: number
}

export default function CircleNew() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('form')
  const [circleName, setCircleName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [circle, setCircle] = useState<CircleData | null>(null)
  const [copied, setCopied] = useState(false)

  const inviteLink = circle
    ? `${window.location.origin}/circle/join/${circle.invite_code}`
    : ''

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const name = circleName.trim()
    if (name.length < 2) {
      setError('Circle name must be at least 2 characters.')
      return
    }
    if (name.length > 50) {
      setError('Circle name must be 50 characters or fewer.')
      return
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('tadabbur_token')
      const response = await api.post<{ data: CircleData }>(
        '/api/circle/create',
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setCircle(response.data.data)
      setStep('success')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (detail?.includes('already in a circle')) {
        setError('You are already in a circle. Leave your current circle first.')
      } else {
        setError(detail || 'Failed to create circle. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select input
    }
  }

  return (
    <PageWrapper className="bg-gradient-to-b from-cream-50 to-white">
      <div className="py-6 space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/circle')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Circle
        </button>

        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Hero */}
              <div className="text-center space-y-3 py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mx-auto">
                  <Users size={32} className="text-emerald-700" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Create a Circle</h1>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                  Reflect on today's verse together with family or friends. Everyone reads the same ayah, every day.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleCreate}
                className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5"
              >
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="circle-name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Circle Name
                  </label>
                  <input
                    id="circle-name"
                    type="text"
                    value={circleName}
                    onChange={(e) => {
                      setCircleName(e.target.value)
                      setError('')
                    }}
                    placeholder="e.g. Family, Halaqa Group, Study Circle"
                    maxLength={50}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:bg-gray-50 transition-shadow"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{circleName.length}/50</p>
                </div>

                {/* What happens info */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">What happens next</p>
                  <ul className="text-sm text-emerald-700 space-y-1">
                    <li>✅ Your circle is created instantly</li>
                    <li>🔗 You'll get a shareable invite link</li>
                    <li>🕌 Members reflect on the same daily verse</li>
                    <li>👁 Only shared reflections are visible to others</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || circleName.trim().length < 2}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating…
                    </>
                  ) : (
                    'Create Circle'
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Success hero */}
              <div className="text-center space-y-3 py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mx-auto"
                >
                  <span className="text-4xl">🌙</span>
                </motion.div>
                <h1 className="text-2xl font-bold text-gray-900">
                  "{circle?.name}" is ready!
                </h1>
                <p className="text-gray-500 text-sm">
                  Share the invite link below so others can join your circle.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                {/* Invite link */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Invite Link</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={inviteLink}
                      className="flex-1 text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 outline-none select-all"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={copyLink}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        copied
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Invite code */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Or share the code</p>
                  <p className="text-2xl font-bold tracking-widest text-emerald-700 font-mono">
                    {circle?.invite_code}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => navigate('/circle')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors text-center"
                  >
                    Go to My Circle
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  )
}
