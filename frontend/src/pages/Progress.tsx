import { useEffect } from 'react'
import { useProgressStore } from '../store/progressStore'
import StreakBadge from '../components/progress/StreakBadge'
import LevelBadge from '../components/progress/LevelBadge'
import XPBar from '../components/progress/XPBar'
import ActivityCalendar from '../components/progress/ActivityCalendar'

export default function Progress() {
  const { summary, isLoading } = useProgressStore()

  useEffect(() => {
    useProgressStore.getState().fetchSummary()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Unable to load progress data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white pb-20">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900">Your Progress</h1>

        {/* Streaks */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-600 mb-2">Current Streak</p>
            <StreakBadge streak={summary.current_streak} />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-600 mb-2">Longest Streak</p>
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
        <ActivityCalendar activityDays={summary.activity_days} />
      </div>
    </div>
  )
}
