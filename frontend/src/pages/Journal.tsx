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
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[60vh] fade-up">
          <div className="w-full max-w-[500px] mx-auto space-y-4">
            <div className="h-8 bg-parchment rounded-[2px] w-1/3 animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-parchment rounded-[2px] animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (history.length === 0) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center fade-up px-4">
          <p className="font-sans text-muted text-[0.95rem] mb-6 max-w-[400px]">
            Your reflection journal is empty. Start today's reflection to begin your journey.
          </p>
          <Link
            to="/home"
            className="bg-ink hover:bg-gold text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase px-8 py-4 rounded-[2px] transition-all duration-300 inline-block"
          >
            Go to Today's Reflection
          </Link>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="py-6 space-y-8 fade-up">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <span className="font-cinzel text-[1rem] tracking-[0.1em] uppercase text-ink whitespace-nowrap">Your Journal</span>
          <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-border"></div>
        </div>

        {/* Reflections */}
        <div className="space-y-8 max-w-[600px] mx-auto">
          {history.map((reflection) => (
            <div key={reflection.id}>
              {/* Date Header */}
              <h2 className="font-cinzel text-[0.8rem] tracking-[0.14em] text-muted uppercase mb-3 text-center">
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
