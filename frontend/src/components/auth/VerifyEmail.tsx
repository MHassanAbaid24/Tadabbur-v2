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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">Verify Email</h2>
          <p className="text-gray-600">We sent a code to</p>
          <p className="text-gray-800 font-semibold">{email}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OTP Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Enter 6-digit code</label>
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
                  className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none transition disabled:bg-gray-100"
                  autoComplete="off"
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {resendMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">{resendMessage}</p>
            </div>
          )}

          {/* Timer and Resend */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Expires in <span className="font-semibold text-emerald-700">{formatTime(timeLeft)}</span>
            </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend || isLoading}
              className={`font-semibold transition ${
                canResend && !isLoading
                  ? 'text-emerald-700 hover:text-emerald-800 cursor-pointer'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              Resend code
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || otp.some((d) => !d)}
            className="w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold hover:bg-emerald-800 disabled:bg-gray-400 transition"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="w-full mt-3 py-2 text-gray-700 font-semibold hover:text-gray-900 disabled:text-gray-400 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
