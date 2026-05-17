import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ArrowLeft, Copy, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '../components/layout/PageWrapper'
import api from '../lib/api'
import { getErrorMessage } from '../lib/errors'

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
      const parsedError = getErrorMessage(err, 'Failed to create circle. Please try again.')
      if (parsedError.includes('already in a circle') || err?.response?.data?.detail?.includes('already in a circle')) {
        setError('You are already in a circle. Leave your current circle first.')
      } else {
        setError(parsedError)
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
    <PageWrapper>
      <div className="py-6 space-y-8 fade-up">
        {/* Back button */}
        <button
          onClick={() => navigate('/circle')}
          className="flex items-center gap-2 font-cinzel text-[0.65rem] tracking-[0.14em] uppercase text-muted hover:text-gold transition-colors"
        >
          <ArrowLeft size={14} />
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
            >
              {/* Hero */}
              <div className="text-center mb-10 mt-6">
                <div className="flex items-center justify-center w-[54px] h-[54px] bg-parchment rounded-full mx-auto mb-6 shadow-sm border border-border">
                  <Users size={24} className="text-gold" />
                </div>
                <h1 className="font-cinzel text-[1.4rem] md:text-[1.8rem] font-medium tracking-[0.06em] text-ink mb-4">Create a Circle</h1>
                <p className="text-center font-sans text-muted text-[0.95rem] max-w-[400px] mx-auto leading-[1.6]">
                  Reflect on today's verse together with family or friends. Everyone reads the same ayah, every day.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleCreate}
                className="bg-white rounded-[4px] border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 md:p-8 space-y-6 max-w-[500px] mx-auto"
              >
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[2px] text-red-700 text-[0.85rem]">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="circle-name"
                    className="block font-cinzel text-[0.7rem] tracking-[0.1em] uppercase text-ink mb-3"
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
                    className="w-full bg-cream border border-border p-4 rounded-[2px] font-sans text-[0.95rem] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all disabled:opacity-60"
                    autoFocus
                  />
                  <p className="text-[0.65rem] font-cinzel text-muted mt-2 text-right tracking-widest">{circleName.length}/50</p>
                </div>

                {/* What happens info */}
                <div className="bg-parchment/60 border border-border rounded-[2px] p-5">
                  <p className="font-cinzel text-[0.65rem] font-semibold text-gold uppercase tracking-[0.14em] mb-3">What happens next</p>
                  <ul className="text-[0.85rem] font-sans text-ink-soft space-y-2.5">
                    <li className="flex items-center gap-2"><span className="text-[0.8rem]">✦</span> Your circle is created instantly</li>
                    <li className="flex items-center gap-2"><span className="text-[0.8rem]">✦</span> You'll get a shareable invite link</li>
                    <li className="flex items-center gap-2"><span className="text-[0.8rem]">✦</span> Members reflect on the same daily verse</li>
                    <li className="flex items-center gap-2"><span className="text-[0.8rem]">✦</span> Only shared reflections are visible</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || circleName.trim().length < 2}
                  className="w-full bg-ink hover:bg-gold text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase px-8 py-4 rounded-[2px] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:bg-ink mt-6"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
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
              className="max-w-[500px] mx-auto"
            >
              {/* Success hero */}
              <div className="text-center mb-10 mt-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
                  className="flex items-center justify-center w-[60px] h-[60px] bg-parchment rounded-full mx-auto mb-6 shadow-sm border border-gold-light"
                >
                  <span className="text-[1.8rem]">🌙</span>
                </motion.div>
                <h1 className="font-cinzel text-[1.4rem] md:text-[1.8rem] font-medium tracking-[0.06em] text-ink mb-3 z-10 relative">
                  "{circle?.name}" is ready!
                </h1>
                <p className="text-center font-sans text-muted text-[0.95rem] max-w-[400px] mx-auto leading-[1.6]">
                  Share the invite link below so others can join your circle.
                </p>
              </div>

              <div className="bg-white rounded-[4px] border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 md:p-8 space-y-8">
                {/* Invite link */}
                <div>
                  <p className="block font-cinzel text-[0.7rem] tracking-[0.1em] uppercase text-ink mb-3">Invite Link</p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      readOnly
                      value={inviteLink}
                      className="flex-1 bg-cream border border-border px-4 py-3 rounded-[2px] font-sans text-[0.85rem] text-muted outline-none select-all focus:ring-1 focus:ring-gold/30"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={copyLink}
                      className={`flex items-center justify-center gap-2 px-6 py-3 font-cinzel text-[0.7rem] tracking-[0.1em] uppercase rounded-[2px] transition-all duration-300 min-w-[120px] ${
                        copied
                          ? 'bg-parchment text-gold border border-gold'
                          : 'bg-transparent border border-gold-light text-gold hover:bg-gold-faint'
                      }`}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Invite code */}
                <div className="text-center pt-2">
                  <p className="font-cinzel text-[0.65rem] tracking-[0.1em] uppercase text-muted mb-2">Or share the code</p>
                  <p className="text-[1.8rem] tracking-[0.3em] text-green font-cinzel font-medium">
                    {circle?.invite_code}
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-4">
                  <button
                    onClick={() => navigate('/circle')}
                    className="w-full bg-ink hover:bg-gold text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase px-8 py-4 rounded-[2px] transition-all duration-300"
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
