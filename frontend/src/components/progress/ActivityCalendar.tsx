interface ActivityCalendarProps {
  activityDays: string[]
}

export default function ActivityCalendar({ activityDays }: ActivityCalendarProps) {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 89) // 90 days ago

  const days: Date[] = []
  for (let i = 0; i < 90; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    days.push(date)
  }

  const activitySet = new Set(activityDays.map((d) => d.split('T')[0]))

  const getMonthLabel = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short' })
  }

  // Group days by month
  const monthBoundaries: Record<string, number> = {}
  let currentMonth = ''
  days.forEach((date, index) => {
    const month = getMonthLabel(date)
    if (month !== currentMonth) {
      monthBoundaries[month] = index
      currentMonth = month
    }
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Activity (90 days)</h3>

      {/* Month labels */}
      <div className="flex gap-1 mb-2 text-xs text-gray-500 font-medium">
        {Object.entries(monthBoundaries).map(([month, index]) => (
          <div key={month} style={{ marginLeft: `${(index / 7) * 16}px` }}>
            {month}
          </div>
        ))}
      </div>

      {/* Grid of days */}
      <div
        className="grid gap-0.5"
        style={{
          gridTemplateColumns: 'repeat(13, minmax(0, 1fr))',
        }}
      >
        {days.map((date, index) => {
          const dateStr = date.toISOString().split('T')[0]
          const hasActivity = activitySet.has(dateStr)

          return (
            <div
              key={index}
              className={`w-3 h-3 rounded-sm transition-colors ${
                hasActivity ? 'bg-emerald-700' : 'bg-gray-100'
              }`}
              title={`${dateStr}: ${hasActivity ? 'reflected' : 'no activity'}`}
            />
          )
        })}
      </div>
    </div>
  )
}
