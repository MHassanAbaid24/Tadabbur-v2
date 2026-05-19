import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useProgressStore } from '../store/progressStore'
import StreakBadge from '../components/progress/StreakBadge'
import LevelBadge from '../components/progress/LevelBadge'
import XPBar from '../components/progress/XPBar'
import ActivityCalendar from '../components/progress/ActivityCalendar'
import PageWrapper from '../components/layout/PageWrapper'

function parseInlineStyles(text: string): ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className='font-bold text-gray-900'>
              {part.slice(2, -2)}
            </strong>
          )
        }
        return part
      })}
    </>
  )
}

function renderSafeMarkdown(markdown: string) {
  const lines = markdown.split('\n')
  const nodes: ReactNode[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`list-${nodes.length}`} className='list-disc pl-6 space-y-2 text-gray-700 my-2'>
          {listItems.map((item, idx) => (
            <li key={idx}>{parseInlineStyles(item)}</li>
          ))}
        </ul>,
      )
      listItems = []
    }
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      return
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2))
      return
    }

    flushList()
    if (trimmed.startsWith('## ')) {
      nodes.push(
        <h3 key={`h3-${idx}`} className='text-lg font-bold text-gray-900 mt-4 mb-2 first:mt-0'>
          {parseInlineStyles(trimmed.slice(3))}
        </h3>,
      )
      return
    }

    nodes.push(
      <p key={`p-${idx}`} className='text-gray-700 leading-relaxed my-1'>
        {parseInlineStyles(trimmed)}
      </p>,
    )
  })

  flushList()
  return nodes
}

function hasRecentActivity(activityDays: string[]): boolean {
  if (!activityDays || activityDays.length === 0) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const formatLocalDate = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const recentDates = new Set<string>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    recentDates.add(formatLocalDate(d))
  }

  return activityDays.some((day) => {
    if (!day) return false
    let key = day
    if (day.includes('T') || day.includes('Z')) {
      key = formatLocalDate(new Date(day))
    } else {
      try {
        const parts = day.split('-')
        if (parts.length === 3) {
          const parsedDate = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10),
          )
          key = formatLocalDate(parsedDate)
        }
      } catch (e) {
        // Fallback to key as-is
      }
    }
    return recentDates.has(key)
  })
}

export default function Progress() {
  const {
    summary,
    weeklyInsights,
    isLoading,
    isInsightsLoading,
    insightsError,
  } = useProgressStore()

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

  const hasActivity = hasRecentActivity(summary.activity_days)

  return (
    <PageWrapper title="Your Progress">
      <div className="py-2 space-y-6">

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

        <section className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4'>
          <div className='flex items-center justify-between gap-3'>
            <h2 className='text-sm font-bold text-gray-700 uppercase tracking-wider'>Weekly Insights</h2>
            {hasActivity && (
              <button
                type='button'
                disabled={isInsightsLoading}
                onClick={() => {
                  useProgressStore.getState().fetchWeeklyInsights()
                }}
                className='px-4 py-2 rounded-full bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed'
              >
                {isInsightsLoading ? 'Analyzing...' : 'Analyze My Week'}
              </button>
            )}
          </div>

          {!hasActivity ? (
            <p className='text-sm text-gray-500 italic'>
              Please have at least one day of activity to get weekly insights.
            </p>
          ) : (
            <>
              {isInsightsLoading && (
                <div className='space-y-2'>
                  <div className='h-4 bg-gray-200 rounded animate-pulse w-1/2' />
                  <div className='h-4 bg-gray-200 rounded animate-pulse w-full' />
                  <div className='h-4 bg-gray-200 rounded animate-pulse w-5/6' />
                </div>
              )}

              {insightsError && <p className='text-sm text-red-600'>{insightsError}</p>}

              {weeklyInsights && weeklyInsights.status === 'ready' && weeklyInsights.insight_markdown && (
                <div className='space-y-3'>{renderSafeMarkdown(weeklyInsights.insight_markdown)}</div>
              )}

              {weeklyInsights && weeklyInsights.status !== 'ready' && (
                <p className='text-sm text-gray-600'>
                  {weeklyInsights.message || 'Not enough data to generate insights yet.'}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </PageWrapper>
  )
}
