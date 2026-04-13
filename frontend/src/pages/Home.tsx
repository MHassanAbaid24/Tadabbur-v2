import { useEffect, useState } from 'react'
import { useVerseStore } from '../store/verseStore'
import { useReflectionStore } from '../store/reflectionStore'
import { useProgressStore } from '../store/progressStore'
import VerseCard from '../components/verse/VerseCard'
import ReflectionForm from '../components/reflection/ReflectionForm'
import ReflectionCard from '../components/reflection/ReflectionCard'
import StreakBadge from '../components/progress/StreakBadge'
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
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          {/* Skeleton: Heading */}
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />

          {/* Skeleton: Card */}
          <div className="bg-gray-200 rounded-lg h-64 animate-pulse" />

          {/* Skeleton: Form */}
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (verseError || !verse) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to load verse
          </h1>
          <p className="text-gray-600 mb-4">
            Please refresh the page or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  const handleReflectionSubmitted = () => {
    setFormSubmitted(true)
    // Refresh today's reflection and progress after submission
    useReflectionStore.getState().fetchTodayReflection()
    useProgressStore.getState().fetchSummary()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-emerald-700">Today's Reflection</h1>
          {summary && (
            <StreakBadge streak={summary.current_streak} />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Verse Card */}
        <VerseCard
          verseKey={verse.verse_key}
          textUthmani={verse.text_uthmani}
          translation={verse.translation}
          tafsir={verse.tafsir}
          audioUrl={verse.audio_url}
        />

        {/* Reflection Form or Card */}
        {todayReflection && !formSubmitted ? (
          <>
            {/* Completed State */}
            <div className="space-y-4">
              <ReflectionCard reflection={todayReflection} />

              <Link
                to="/circle"
                className="block w-full px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium rounded-lg hover:bg-emerald-100 transition-colors text-center"
              >
                See your circle's reflections
              </Link>

              <p className="text-center text-sm text-gray-600">
                You've already reflected on today's verse.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Reflection Form */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Share Your Reflection
              </h2>
              <ReflectionForm
                verseKey={verse.verse_key}
                onSubmitted={handleReflectionSubmitted}
              />
            </div>

            {/* Tip */}
            <p className="text-sm text-gray-600 text-center italic">
              Your reflection is private by default. Share with your circle if you'd like feedback.
            </p>
          </>
        )}

        {/* Progress Summary Card */}
        {summary && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-600">Longest Streak</p>
                <p className="text-2xl font-bold text-gold-600">
                  {summary.longest_streak} days
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Level</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {summary.level_name}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">Total XP</p>
              <p className="text-xl font-bold text-gray-900">{summary.xp}</p>
            </div>
            <Link
              to="/progress"
              className="block text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-2"
            >
              View full progress →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
