import { useEffect, useState } from 'react'
import { useVerseStore } from '../store/verseStore'
import { useReflectionStore } from '../store/reflectionStore'
import { useProgressStore } from '../store/progressStore'
import VerseCard from '../components/verse/VerseCard'
import ReflectionForm from '../components/reflection/ReflectionForm'
import ReflectionCard from '../components/reflection/ReflectionCard'
import StreakBadge from '../components/progress/StreakBadge'
import PageWrapper from '../components/layout/PageWrapper'
import { Link } from 'react-router-dom'

export default function Home() {
  const { verse, isLoading: verseLoading, error: verseError } = useVerseStore()
  const {
    todayReflection,
    isLoading: reflectionLoading,
  } = useReflectionStore()
  const { summary, isLoading: progressLoading } = useProgressStore()

  const [formSubmitted, setFormSubmitted] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        useVerseStore.getState().fetchTodayVerse(),
        useReflectionStore.getState().fetchTodayReflection(),
        useProgressStore.getState().fetchSummary(),
      ])
    }
    fetchData()
  }, [])

  const isLoading = verseLoading || reflectionLoading || progressLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white pt-20 pb-20 px-4">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Skeleton: Heading with streak */}
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
            <div className="h-8 w-16 bg-gold-200 rounded-full animate-pulse" />
          </div>

          {/* Skeleton: Verse card */}
          <div className="bg-white rounded-2xl border border-gold-500/20 p-6 space-y-4">
            <div className="h-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-12 bg-gray-100 rounded animate-pulse" />
            <div className="h-10 bg-gray-100 rounded animate-pulse" />
          </div>

          {/* Skeleton: Form fields */}
          <div className="space-y-4">
            <div className="h-28 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-28 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-gold-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (verseError || !verse) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <span className="text-3xl">📖</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to load today's verse
          </h1>
          <p className="text-gray-600 mb-6">
            Pull to refresh and try again, or check your connection.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 min-h-11 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    )
  }

  const handleReflectionSubmitted = () => {
    setFormSubmitted(true)
    // Force refresh (bypass staleness check) after submission
    useReflectionStore.getState().fetchTodayReflection(true)
    useProgressStore.getState().fetchSummary(true)
  }

  return (
    <PageWrapper>
      {/* Page Header */}
      <div className="flex flex-row items-center justify-between mb-10 pb-4 border-b border-border sticky top-0 md:top-[64px] bg-cream z-10 pt-2">
        <h1 className="font-cinzel text-[1.05rem] font-medium tracking-[0.08em] uppercase text-green">Today's Reflection</h1>
        {summary && (
          <StreakBadge streak={summary.current_streak} />
        )}
      </div>

      {/* Main Content */}
      <div className="pb-6">
        {/* Verse Card */}
        <VerseCard
          verseKey={verse.verse_key}
          textUthmani={verse.text_uthmani}
          translation={verse.translation}
          tafsir={verse.tafsir}
          audioUrl={verse.audio_url}
        />

        {/* Reflection Section */}
        <div className="fade-up-delay-1">
          {todayReflection && (
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-7">
                <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-border"></div>
                <span className="font-cinzel text-[0.75rem] tracking-[0.14em] uppercase text-muted whitespace-nowrap">Today's Latest Reflection</span>
                <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-border"></div>
              </div>
              <ReflectionCard reflection={todayReflection} />
              <Link
                to="/circle"
                className="block w-full px-4 py-3 bg-transparent border border-gold-light text-gold font-cinzel text-[0.68rem] tracking-[0.1em] uppercase rounded-full hover:bg-gold-faint transition-colors text-center mt-4"
              >
                See your circle's reflections
              </Link>
            </div>
          )}

          <div>
             <div className="flex items-center gap-4 mb-7">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-border"></div>
              <span className="font-cinzel text-[0.75rem] tracking-[0.14em] uppercase text-muted whitespace-nowrap">
                {todayReflection ? "Add Another Reflection" : "Your Reflection"}
              </span>
              <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-border"></div>
            </div>
            
            <ReflectionForm
              verseKey={verse.verse_key}
              onSubmitted={handleReflectionSubmitted}
            />
            {/* Tip */}
            <p className="text-[0.85rem] text-muted text-center italic mt-6 mb-10">
              Your reflection is private by default.
            </p>
          </div>
        </div>

        {/* Progress Summary Card */}
        {summary && (
          <div className="bg-white border border-border rounded-[4px] p-6 lg:px-8 mt-10 grid grid-cols-2 sm:grid-cols-3 gap-5 items-center fade-up-delay-2">
            <div>
              <p className="font-cinzel text-[0.62rem] tracking-[0.12em] uppercase text-muted mb-1">Longest Streak</p>
              <p className="text-[1.7rem] font-semibold text-gold leading-none">
                {summary.longest_streak} <span className="text-[1rem] font-normal text-muted">days</span>
              </p>
            </div>
            <div>
              <p className="font-cinzel text-[0.62rem] tracking-[0.12em] uppercase text-muted mb-1">Level</p>
              <p className="text-[1.2rem] font-semibold text-green leading-none">
                {summary.level_name}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="font-cinzel text-[0.62rem] tracking-[0.12em] uppercase text-muted mb-1">Total XP</p>
              <p className="text-[1.7rem] font-semibold text-ink leading-none">{summary.xp}</p>
            </div>
            <Link
              to="/progress"
              className="col-span-2 sm:col-span-3 text-right font-cinzel text-[0.68rem] tracking-[0.1em] uppercase text-green hover:text-gold transition-colors block"
            >
              View full progress →
            </Link>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
