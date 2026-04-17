import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Circle as CircleIcon, Users, Zap } from 'lucide-react'
import { api } from '../lib/api'

export default function Onboarding() {
  const navigate = useNavigate()
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

  const goToHome = () => {
    localStorage.setItem('tadabbur_onboarded', 'true')
    localStorage.removeItem('tadabbur_onboarding_step') // Clean up
    navigate('/home')
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

  const handleCompleteOnboarding = () => {
    localStorage.setItem('tadabbur_reminder_time', reminderTime)
    goToHome()
  }

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-white">
      {/* Skip button */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={handleSkip}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-gold-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <div className="text-center pb-2 text-xs text-gray-500">
          Step {step} of 4
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-lg mx-auto px-4 pt-32 pb-8 min-h-screen flex items-center">
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
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gold-100 rounded-full mb-4">
                  <Zap className="text-gold-600" size={32} />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Welcome to Tadabbur
              </h1>
              <p className="text-xl text-gold-600 font-semibold mb-6">
                Read. Reflect. Grow Together.
              </p>
              <div className="space-y-4 mb-8 text-left bg-cream-50 p-6 rounded-lg">
                <div className="flex gap-3">
                  <div className="text-2xl">📖</div>
                  <div>
                    <p className="font-semibold text-gray-900">Read</p>
                    <p className="text-sm text-gray-600">
                      A new verse every day, curated just for you
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-2xl">✍️</div>
                  <div>
                    <p className="font-semibold text-gray-900">Reflect</p>
                    <p className="text-sm text-gray-600">
                      Answer two prompts that bring the Quran to life
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-2xl">🤝</div>
                  <div>
                    <p className="font-semibold text-gray-900">Grow Together</p>
                    <p className="text-sm text-gray-600">
                      Share with family and friends in your circle
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-gold-500 hover:bg-gold-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                Let's Get Started
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Step 2: Connect QF Account */}
          {step === 2 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Connect Your Account
              </h2>
              <p className="text-gray-600 mb-8">
                Connect your quran.com account to sync your streaks and notes
                across devices. (Optional — you can do this later)
              </p>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-8">
                <div className="flex gap-3">
                  <div className="text-emerald-600 text-2xl">✅</div>
                  <div>
                    <p className="font-semibold text-emerald-900">Why connect?</p>
                    <ul className="text-sm text-emerald-800 space-y-1 mt-2">
                      <li>• Sync your reflection streaks</li>
                      <li>• Access notes on quran.com</li>
                      <li>• Save your progress</li>
                    </ul>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3 mb-8">
                <button
                  onClick={handleQFConnect}
                  disabled={isLoading}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading ? 'Connecting...' : 'Connect quran.com'}
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Circle Setup */}
          {step === 3 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Join or Create Your Circle
              </h2>
              <p className="text-gray-600 mb-8">
                A circle is a group of family and friends reflecting on the same
                verse together. (Optional)
              </p>

              <div className="space-y-4">
                {/* Create Circle */}
                <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-gold-500 transition-colors">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="flex-shrink-0 mt-1">
                      <input
                        type="radio"
                        name="circle-action"
                        value="create"
                        defaultChecked
                        className="w-4 h-4"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <CircleIcon size={18} className="text-gold-500" />
                        Create a Circle
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Start a group and invite family or friends
                      </p>
                      <input
                        type="text"
                        placeholder="Circle name (e.g., Family Reflections)"
                        value={circleName}
                        onChange={(e) => setCircleName(e.target.value)}
                        className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                      />
                    </div>
                  </label>
                </div>

                {/* Join Circle */}
                <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-gold-500 transition-colors">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="flex-shrink-0 mt-1">
                      <input
                        type="radio"
                        name="circle-action"
                        value="join"
                        className="w-4 h-4"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <Users size={18} className="text-emerald-600" />
                        Join a Circle
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Have an invite link? Join an existing circle
                      </p>
                      <input
                        type="text"
                        placeholder="Paste invite code here"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </label>
                </div>

                {/* Solo Mode */}
                <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-gold-500 transition-colors">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="flex-shrink-0 mt-1">
                      <input
                        type="radio"
                        name="circle-action"
                        value="solo"
                        className="w-4 h-4"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Go Solo</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Just for you. You can join a circle anytime later.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg mt-4 text-sm">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-3">
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
                  className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading ? 'Setting up...' : 'Continue'}
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Daily Reminder */}
          {step === 4 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Daily Reminder
              </h2>
              <p className="text-gray-600 mb-8">
                Set a daily reminder to reflect on your verse. (You can change
                this anytime)
              </p>

              <div className="bg-gold-50 border border-gold-200 rounded-lg p-6 mb-8">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700 mb-3 block">
                    What time should we remind you?
                  </span>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gold-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </label>
                <p className="text-xs text-gray-600 mt-2">
                  Reminders will arrive at this time every day (timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone})
                </p>
              </div>

              <div className="bg-cream-50 rounded-lg p-6 mb-8 text-center">
                <p className="text-sm text-gray-600">
                  You're all set! Get ready for a more meaningful connection with
                  the Quran.
                </p>
              </div>

              <button
                onClick={handleCompleteOnboarding}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                Start Reflecting
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
