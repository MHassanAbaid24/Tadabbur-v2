import { useEffect } from 'react'
import { useProgressStore } from '../store/progressStore'
import StreakBadge from '../components/progress/StreakBadge'
import LevelBadge from '../components/progress/LevelBadge'
import XPBar from '../components/progress/XPBar'
import ActivityCalendar from '../components/progress/ActivityCalendar'
import PageWrapper from '../components/layout/PageWrapper'

export default function Progress() {
  const { summary, isLoading } = useProgressStore()

  useEffect(() => {
    useProgressStore.getState().fetchSummary()
  }, [])

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-lg space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (!summary) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[60vh] text-center">
          <p className="text-gray-600">Unable to load progress data</p>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="py-6 space-y-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900">Your Progress</h1>

        {/* Streaks */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-shadow hover:shadow-md">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Today's Streak</p>
            <StreakBadge streak={summary.current_streak} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-shadow hover:shadow-md">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">All-Time Peak</p>
            <StreakBadge streak={summary.longest_streak} />
          </div>
        </div>

        {/* Level */}
        <LevelBadge
          level={summary.level}
          levelName={summary.level_name}
          levelNameAr={summary.level_name_ar}
          xp={summary.xp}
          xpToNext={summary.xp_to_next_level}
        />

        {/* XP Bar */}
        <XPBar
          current={summary.xp}
          max={summary.xp + summary.xp_to_next_level}
        />

        {/* Activity Calendar */}
        <ActivityCalendar
          activityDays={summary.activity_days}
          currentStreak={summary.current_streak}
        />
      </div>
    </PageWrapper>
  )
}
