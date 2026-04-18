import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../store/authStore'

interface VerifyEmailProps {
  email: string
  onSuccess: () => void
  onCancel: () => void
}

export default function VerifyEmail({ email, onSuccess, onCancel }: VerifyEmailProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const { verifyOTP, resendOTP } = useAuthStore()

  // Timer for OTP expiration
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true)
      return
    }

    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft])

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle digit input
  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text')
    const digits = paste.replace(/\D/g, '').split('').slice(0, 6)

    const newOtp = [...otp]
    digits.forEach((digit, i) => {
      newOtp[i] = digit
    })
    setOtp(newOtp)

    // Focus last filled input
    if (digits.length > 0) {
      inputRefs.current[Math.min(digits.length, 5)]?.focus()
    }
  }

  // Submit OTP
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const otpCode = otp.join('')

    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits')
      setIsLoading(false)
      return
    }

    try {
      await verifyOTP(otpCode)
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed. Please try again.'
      setError(message)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  // Handle resend
  const handleResend = async () => {
    setResendMessage('')
    setError('')
    try {
      await resendOTP()
      setResendMessage('Code resent successfully! Check your email.')
      setTimeLeft(600) // Reset timer
      setCanResend(false)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[4px] shadow-[0_4px_25px_rgba(184,146,42,0.06)] border border-border p-8 max-w-[400px] w-full relative overflow-hidden">
        {/* Subtle highlight */}
        <div className="absolute top-0 inset-x-0 h-[60px] bg-gradient-to-b from-parchment/60 to-transparent -z-10 opacity-50"></div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-cinzel text-[1.8rem] font-medium tracking-[0.06em] text-ink mb-2">Verify Email</h2>
          <p className="font-sans text-[0.85rem] text-muted">We sent a code to</p>
          <p className="font-sans text-[0.95rem] text-ink font-medium mt-1">{email}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OTP Input */}
          <div>
            <label className="block font-cinzel text-[0.7rem] tracking-[0.1em] text-ink uppercase mb-4 text-center">Enter 6-digit code</label>
            <div className="flex gap-2 justify-center">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  disabled={isLoading}
                  className="w-12 h-14 text-center text-xl font-sans font-medium text-ink bg-cream border border-border rounded-[2px] focus:border-gold/50 focus:ring-1 focus:ring-gold/30 focus:outline-none transition-all disabled:opacity-50"
                  autoComplete="off"
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-[2px] flex items-center gap-2">
              <div className="w-[6px] h-[6px] rounded-full bg-red-600 shrink-0" />
              <p className="text-red-700 font-sans text-[0.85rem]">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {resendMessage && (
            <div className="p-4 bg-green-light border border-green/20 rounded-[2px] flex items-center gap-2">
              <div className="w-[6px] h-[6px] rounded-full bg-green shrink-0" />
              <p className="text-green-mid font-sans text-[0.85rem]">{resendMessage}</p>
            </div>
          )}

          {/* Timer and Resend */}
          <div className="flex items-center justify-between font-sans text-[0.85rem]">
            <span className="text-muted">
              Expires in <span className="font-medium text-gold">{formatTime(timeLeft)}</span>
            </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend || isLoading}
              className={`font-medium transition-colors ${
                canResend && !isLoading
                  ? 'text-ink hover:text-gold cursor-pointer'
                  : 'text-muted/50 cursor-not-allowed'
              }`}
            >
              Resend code
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || otp.some((d) => !d)}
            className="w-full bg-ink hover:bg-gold text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase py-4 rounded-[2px] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(28,26,22,0.15)]"
          >
            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify'}
          </button>
        </form>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="w-full mt-4 font-cinzel text-[0.7rem] tracking-[0.14em] uppercase text-muted hover:text-ink transition-colors py-2 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
