import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Circle as CircleIcon, Users, Zap } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function Onboarding() {
  const navigate = useNavigate()
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding)
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('tadabbur_onboarding_step')
    return saved ? parseInt(saved, 10) : 1
  })
  
  // Persist step changes
  useEffect(() => {
    localStorage.setItem('tadabbur_onboarding_step', step.toString())
  }, [step])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [circleName, setCircleName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [reminderTime, setReminderTime] = useState('08:00')

  const goToHome = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await completeOnboarding()
      localStorage.removeItem('tadabbur_onboarding_step') // Clean up
      navigate('/home')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save onboarding state',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    goToHome()
  }

  const handleQFConnect = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get('/api/auth/qf/connect')
      const { authorization_url } = response.data.data
      window.location.href = authorization_url
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to connect QF account',
      )
      setIsLoading(false)
    }
  }

  const handleCreateCircle = async () => {
    if (!circleName.trim()) {
      setError('Please enter a circle name')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await api.post('/api/circle/create', { name: circleName })
      setStep(4)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create circle',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinCircle = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await api.get(`/api/circle/join/${inviteCode}`)
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join circle')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSolo = () => {
    setStep(4)
  }

  const handleCompleteOnboarding = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      await api.put('/api/auth/profile', {
        daily_reminder_time: reminderTime,
        timezone,
        reminders_enabled: true,
      })
      localStorage.setItem('tadabbur_reminder_time', reminderTime)
      await completeOnboarding()
      localStorage.removeItem('tadabbur_onboarding_step')
      navigate('/home')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save reminder settings',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } },
  }

  return (
    <div className="min-h-[100dvh] bg-cream bg-geometric relative z-0">
      {/* Skip button */}
      <div className="absolute top-5 right-5 md:top-8 md:right-8 z-50">
        <button
          onClick={handleSkip}
          className="font-cinzel text-[0.7rem] tracking-[0.14em] uppercase text-muted hover:text-ink transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-border/50 z-40">
        <div className="max-w-[440px] mx-auto px-4 py-4 flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                s <= step ? 'bg-gold' : 'bg-parchment'
              }`}
            />
          ))}
        </div>
        <div className="text-center pb-3 font-cinzel text-[0.6rem] tracking-[0.2em] text-muted uppercase">
          Step {step} of 4
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[500px] mx-auto px-4 pt-32 pb-12 min-h-[100dvh] flex items-center">
        <motion.div
          key={step}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="w-full"
        >
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center">
              <h1 className="font-cinzel text-[2rem] md:text-[2.5rem] font-medium tracking-[0.06em] text-ink mb-2">
                Welcome to Tadabbur
              </h1>
              <p className="font-cinzel text-[0.8rem] md:text-[0.9rem] tracking-[0.14em] text-gold uppercase mb-8">
                Read. Reflect. Grow Together.
              </p>
              <div className="space-y-4 mb-10 text-left">
                <div className="flex gap-4 items-start bg-white p-5 rounded-[4px] border border-border hover:border-gold/30 transition-colors shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-parchment flex items-center justify-center shrink-0 border border-gold-faint">
                    <span className="font-scheherazade text-gold text-xl mt-1">١</span>
                  </div>
                  <div>
                    <h3 className="font-cinzel text-[0.9rem] font-medium text-ink tracking-[0.06em] mb-1">Read</h3>
                    <p className="font-sans text-[0.85rem] text-muted leading-relaxed">A new verse every day, curated just for you</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start bg-white p-5 rounded-[4px] border border-border hover:border-gold/30 transition-colors shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-parchment flex items-center justify-center shrink-0 border border-gold-faint">
                    <span className="font-scheherazade text-gold text-xl mt-1">٢</span>
                  </div>
                  <div>
                    <h3 className="font-cinzel text-[0.9rem] font-medium text-ink tracking-[0.06em] mb-1">Reflect</h3>
                    <p className="font-sans text-[0.85rem] text-muted leading-relaxed">Answer prompts that bring the Quran to life</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start bg-white p-5 rounded-[4px] border border-border hover:border-gold/30 transition-colors shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-parchment flex items-center justify-center shrink-0 border border-gold-faint">
                    <span className="font-scheherazade text-gold text-xl mt-1">٣</span>
                  </div>
                  <div>
                    <h3 className="font-cinzel text-[0.9rem] font-medium text-ink tracking-[0.06em] mb-1">Grow Together</h3>
                    <p className="font-sans text-[0.85rem] text-muted leading-relaxed">Share with family and friends in your circle</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setStep(2)}
                className="w-full bg-ink hover:bg-gold text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase py-4 rounded-[2px] transition-all duration-300 flex items-center justify-center gap-3"
              >
                Let's Get Started
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Connect QF Account */}
          {step === 2 && (
            <div className="text-center">
              <h2 className="font-cinzel text-[1.8rem] md:text-[2rem] font-medium tracking-[0.06em] text-ink mb-4">
                Connect Your Account
              </h2>
              <p className="font-sans text-[0.9rem] text-muted mb-8 max-w-[400px] mx-auto leading-relaxed">
                Connect your quran.com account to sync your streaks and notes across devices. (Optional)
              </p>

              <div className="bg-white border border-border rounded-[4px] p-6 mb-8 text-left shadow-sm">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-green-light flex items-center justify-center shrink-0 border border-green/20">
                    <Zap size={14} className="text-green" />
                  </div>
                  <div>
                    <h4 className="font-cinzel text-[0.85rem] font-medium text-ink tracking-[0.06em] mb-3 uppercase">Why connect?</h4>
                    <ul className="space-y-3 font-sans text-[0.85rem] text-muted">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                        Sync your reflection streaks
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                        Access notes on quran.com
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                        Save your progress globally
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-[2px] mb-6 font-sans text-[0.85rem] flex items-center justify-center gap-2">
                  <div className="w-[6px] h-[6px] rounded-full bg-red-600" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={handleQFConnect}
                  disabled={isLoading}
                  className="w-full bg-green hover:bg-green-mid disabled:opacity-50 text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase py-4 rounded-[2px] transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_4px_15px_rgba(45,90,61,0.2)]"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Connect quran.com
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="w-full bg-transparent border border-border hover:bg-parchment text-ink font-cinzel text-[0.75rem] tracking-[0.14em] uppercase py-4 rounded-[2px] transition-all duration-300"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Circle Setup */}
          {step === 3 && (
            <div>
              <div className="text-center mb-8">
                <h2 className="font-cinzel text-[1.8rem] md:text-[2rem] font-medium tracking-[0.06em] text-ink mb-4">
                  Join or Create Your Circle
                </h2>
                <p className="font-sans text-[0.9rem] text-muted max-w-[400px] mx-auto leading-relaxed">
                  A circle is a group of family and friends reflecting on the same verse together. (Optional)
                </p>
              </div>

              <div className="space-y-4">
                {/* Create Circle */}
                <label className="block bg-white border border-border rounded-[4px] p-5 cursor-pointer hover:border-gold/50 transition-colors shadow-sm relative overflow-hidden group">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <input
                        type="radio"
                        name="circle-action"
                        value="create"
                        defaultChecked
                        className="w-4 h-4 accent-gold cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-cinzel text-[0.95rem] font-medium text-ink tracking-[0.06em] flex items-center gap-2 mb-1">
                        <CircleIcon size={16} className="text-gold" />
                        Create a Circle
                      </p>
                      <p className="font-sans text-[0.8rem] text-muted mb-4">
                        Start a group and invite family or friends
                      </p>
                      <input
                        type="text"
                        placeholder="Circle name (e.g., Family Reflections)"
                        value={circleName}
                        onChange={(e) => setCircleName(e.target.value)}
                        className="w-full bg-cream border border-border p-3 rounded-[2px] font-sans text-[0.9rem] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all group-has-[:checked]:border-gold/30"
                      />
                    </div>
                  </div>
                </label>

                {/* Join Circle */}
                <label className="block bg-white border border-border rounded-[4px] p-5 cursor-pointer hover:border-gold/50 transition-colors shadow-sm relative overflow-hidden group">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <input
                        type="radio"
                        name="circle-action"
                        value="join"
                        className="w-4 h-4 accent-gold cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-cinzel text-[0.95rem] font-medium text-ink tracking-[0.06em] flex items-center gap-2 mb-1">
                        <Users size={16} className="text-green" />
                        Join a Circle
                      </p>
                      <p className="font-sans text-[0.8rem] text-muted mb-4">
                        Have an invite link? Join an existing circle
                      </p>
                      <input
                        type="text"
                        placeholder="Paste invite code here"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        className="w-full bg-cream border border-border p-3 rounded-[2px] font-sans text-[0.9rem] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all group-has-[:checked]:border-gold/30"
                      />
                    </div>
                  </div>
                </label>

                {/* Solo Mode */}
                <label className="block bg-white border border-border rounded-[4px] p-5 cursor-pointer hover:border-gold/50 transition-colors shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <input
                        type="radio"
                        name="circle-action"
                        value="solo"
                        className="w-4 h-4 accent-gold cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-cinzel text-[0.95rem] font-medium text-ink tracking-[0.06em] mb-1">Go Solo</p>
                      <p className="font-sans text-[0.8rem] text-muted">
                        Just for you. You can join a circle anytime later.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-[2px] mt-6 font-sans text-[0.85rem] flex items-center justify-center gap-2">
                  <div className="w-[6px] h-[6px] rounded-full bg-red-600" />
                  {error}
                </div>
              )}

              <div className="mt-8">
                <button
                  onClick={() => {
                    const action = (
                      document.querySelector(
                        'input[name="circle-action"]:checked',
                      ) as HTMLInputElement
                    )?.value

                    if (action === 'create') {
                      handleCreateCircle()
                    } else if (action === 'join') {
                      handleJoinCircle()
                    } else if (action === 'solo') {
                      handleSolo()
                    }
                  }}
                  disabled={isLoading}
                  className="w-full bg-ink hover:bg-gold disabled:opacity-50 text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase py-4 rounded-[2px] transition-all duration-300 flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Daily Reminder */}
          {step === 4 && (
            <div className="text-center">
              <h2 className="font-cinzel text-[1.8rem] md:text-[2rem] font-medium tracking-[0.06em] text-ink mb-4">
                Daily Reminder
              </h2>
              <p className="font-sans text-[0.9rem] text-muted mb-8 max-w-[400px] mx-auto leading-relaxed">
                Set a daily reminder to reflect on your verse. (You can change this anytime)
              </p>

              <div className="bg-white border border-border rounded-[4px] p-8 mb-8 shadow-sm text-left relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-gold-faint rounded-full opacity-50 blur-2xl"></div>
                
                <label className="block relative z-10">
                  <span className="font-cinzel text-[0.8rem] tracking-[0.1em] text-ink uppercase mb-4 block">
                    What time should we remind you?
                  </span>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full bg-cream border border-border p-4 rounded-[2px] font-sans text-[1.2rem] text-ink focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all text-center tracking-[0.1em]"
                  />
                </label>
                <div className="mt-4 flex items-start gap-3">
                  <div className="w-[4px] h-[4px] rounded-full bg-gold mt-2 shrink-0" />
                  <p className="font-sans text-[0.8rem] text-muted leading-relaxed">
                    Reminders will arrive at this time every day (timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone})
                  </p>
                </div>
              </div>

              <div className="bg-parchment/60 border border-gold-light/50 rounded-[4px] p-6 mb-8 text-center shadow-sm">
                <p className="font-sans text-[0.9rem] text-ink font-medium tracking-wide">
                  You're all set! Get ready for a more meaningful connection.
                </p>
              </div>

              <button
                onClick={handleCompleteOnboarding}
                disabled={isLoading}
                className="w-full bg-ink hover:bg-gold text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase py-4 rounded-[2px] transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_4px_15px_rgba(28,26,22,0.2)]"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Start Reflecting
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
