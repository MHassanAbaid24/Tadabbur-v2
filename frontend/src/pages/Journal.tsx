import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'
import { useReflectionStore } from '../store/reflectionStore'
import ReflectionCard from '../components/reflection/ReflectionCard'

export default function Journal() {
  const { history, isLoading } = useReflectionStore()

  useEffect(() => {
    useReflectionStore.getState().fetchHistory()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white flex items-center justify-center p-4">
        <div className="text-center py-12">
          <p className="text-gray-600 text-sm mb-4">
            Your reflection journal is empty. Start today's reflection to begin your journey.
          </p>
          <Link
            to="/home"
            className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Today's Reflection
          </Link>
        </div>
      </div>
    )
  }

  return (
    <PageWrapper className="bg-gradient-to-b from-cream-50 to-white">
      <div className="py-6 space-y-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900">Your Journal</h1>

        {/* Reflections */}
        <div className="space-y-6">
          {history.map((reflection) => (
            <div key={reflection.id}>
              {/* Date Header */}
              <h2 className="text-sm font-semibold text-gray-600 mb-2">
                {new Date(reflection.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h2>

              {/* Reflection Card */}
              <ReflectionCard reflection={reflection} />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
