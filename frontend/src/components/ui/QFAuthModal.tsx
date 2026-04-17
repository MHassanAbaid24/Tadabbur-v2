import { useAuthStore } from '../../store/authStore'

interface QFAuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function QFAuthModal({ isOpen, onClose }: QFAuthModalProps) {
  const { initiateQFOAuth } = useAuthStore()

  const handleConnect = async () => {
    try {
      await initiateQFOAuth()
    } catch (err) {
      console.error('Failed to initiate QF OAuth:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          Connect Your Quran.com Account
        </h2>

        <p className="text-gray-600 mb-5">
          To save your reflections and track your progress, you need to connect your Quran.com account.
        </p>

        <p className="text-sm text-gray-500 mb-6">
          This allows us to securely store your reflections and sync your streaks with Quran.com.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
            </svg>
            Connect
          </button>
        </div>
      </div>
    </div>
  )
}
