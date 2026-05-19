import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import VerifyEmail from '../components/auth/VerifyEmail'
import { useAuthStore } from '../store/authStore'
import { getErrorMessage } from '../lib/errors'

type TabType = 'login' | 'register'
const NAME_REGEX = /^(?=.*[A-Za-z])[A-Za-z ]+$/

interface FormData {
  email: string
  password: string
  username: string
}

export default function Auth() {
  const navigate = useNavigate()
  const { login, initRegister } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('login')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    username: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(formData.email, formData.password)
      navigate('/home')
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { email } = await initRegister(
        formData.email,
        formData.password,
        formData.username
      )
      setVerificationEmail(email)
      setShowVerification(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerificationSuccess = () => {
    setShowVerification(false)
    navigate('/onboarding')
  }

  const handleVerificationCancel = () => {
    setShowVerification(false)
    setFormData({
      email: '',
      password: '',
      username: '',
    })
  }

  const isValidName = formData.username === '' || NAME_REGEX.test(formData.username)

  return (
    <div className="min-h-[100dvh] bg-cream flex items-center justify-center p-4 bg-geometric relative z-0">
      <div className="w-full max-w-[440px] z-10 fade-up">
        {/* Header */}
        <div className="text-center mb-10 space-y-4">
          <h1 className="font-cinzel text-[2rem] font-medium tracking-[0.08em] text-ink">Tadabbur</h1>
          <p className="font-cinzel text-[0.75rem] tracking-[0.14em] text-muted uppercase">Read. Reflect. Grow Together.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[4px] shadow-[0_4px_25px_rgba(184,146,42,0.06)] border border-border p-8 relative overflow-hidden group hover:border-gold/30 transition-colors duration-500">
          {/* Subtle highlight */}
          <div className="absolute top-0 inset-x-0 h-[100px] bg-gradient-to-b from-parchment/60 to-transparent -z-10 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

          {/* Tabs */}
          <div className="flex gap-6 mb-8 border-b border-border/60">
            <button
              onClick={() => setActiveTab('login')}
              className={`pb-3 font-cinzel text-[0.75rem] tracking-[0.14em] uppercase transition-colors relative ${activeTab === 'login'
                  ? 'text-ink font-medium'
                  : 'text-muted hover:text-ink/80'
                }`}
            >
              Login
              {activeTab === 'login' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`pb-3 font-cinzel text-[0.75rem] tracking-[0.14em] uppercase transition-colors relative ${activeTab === 'register'
                  ? 'text-ink font-medium'
                  : 'text-muted hover:text-ink/80'
                }`}
            >
              Register
              {activeTab === 'register' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold" />
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-[2px] text-red-700 font-sans text-[0.85rem] flex items-center gap-2">
              <div className="w-[6px] h-[6px] rounded-full bg-red-600" />
              {error}
            </div>
          )}

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="block font-cinzel text-[0.7rem] tracking-[0.1em] uppercase text-ink">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-cream border border-border p-4 rounded-[2px] font-sans text-[0.95rem] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block font-cinzel text-[0.7rem] tracking-[0.1em] uppercase text-ink">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-cream border border-border p-4 pr-20 rounded-[2px] font-sans text-[0.95rem] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 font-sans text-[0.75rem] text-muted hover:text-ink transition-colors"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-ink hover:bg-gold disabled:bg-muted text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase py-4 rounded-[2px] transition-all duration-300 flex items-center justify-center gap-3"
                >
                  {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Login'}
                </button>
              </div>
            </form>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="block font-cinzel text-[0.7rem] tracking-[0.1em] uppercase text-ink">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-cream border border-border p-4 rounded-[2px] font-sans text-[0.95rem] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block font-cinzel text-[0.7rem] tracking-[0.1em] uppercase text-ink">
                  Name
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full bg-cream border p-4 rounded-[2px] font-sans text-[0.95rem] text-ink placeholder:text-muted/60 focus:outline-none focus:ring-1 transition-all ${!isValidName
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                      : 'border-border focus:border-gold/50 focus:ring-gold/30'
                    }`}
                  placeholder="Your Name Here"
                  required
                />
                {!isValidName && (
                  <p className="text-red-500 font-sans text-[0.75rem] mt-1">
                    Name can only contain letters and spaces.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block font-cinzel text-[0.7rem] tracking-[0.1em] uppercase text-ink">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-cream border border-border p-4 pr-20 rounded-[2px] font-sans text-[0.95rem] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 font-sans text-[0.75rem] text-muted hover:text-ink transition-colors"
                    aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegisterPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !isValidName}
                  className="w-full bg-ink hover:bg-gold disabled:bg-muted text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase py-4 rounded-[2px] transition-all duration-300 flex items-center justify-center gap-3"
                >
                  {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-center font-cinzel text-[0.6rem] tracking-[0.14em] uppercase text-muted/60">
              Part of the Quran Foundation Hackathon 2026
            </p>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {showVerification && (
        <VerifyEmail
          email={verificationEmail}
          onSuccess={handleVerificationSuccess}
          onCancel={handleVerificationCancel}
        />
      )}
    </div>
  )
}
