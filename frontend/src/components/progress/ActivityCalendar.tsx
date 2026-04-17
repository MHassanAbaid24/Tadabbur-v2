interface ActivityCalendarProps {
  activityDays: string[]
  currentStreak: number
}

export default function ActivityCalendar({ activityDays, currentStreak }: ActivityCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Standard GitHub-style heatmap: 7 rows (Sun to Sat)
  // We'll show 16 weeks to fill the desktop width better (112 days)
  const weekCount = 16
  const totalSlots = weekCount * 7
  
  // Find the start date: Sunday of the first week
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - (totalSlots - 7 + today.getDay())) 
  // This ensures we always end on the current week's Saturday (or Sunday)
  
  const firstSunday = new Date(startDate)
  while (firstSunday.getDay() !== 0) {
    firstSunday.setDate(firstSunday.getDate() - 1)
  }

  const weeks: (Date | null)[][] = []
  const current = new Date(firstSunday)
  current.setHours(0, 0, 0, 0)
  
  for (let w = 0; w < weekCount; w++) {
    const week: (Date | null)[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
  }

  // Format activity dates to YYYY-MM-DD in local time
  const formatLocalDate = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Pre-process activity days into a Set of YYYY-MM-DD strings
  const activitySet = new Set<string>()
  activityDays.forEach(day => {
    if (!day) return
    if (day.includes('T') || day.includes('Z')) {
      // It's an ISO string from API/QF
      activitySet.add(formatLocalDate(new Date(day)))
    } else {
      // It's a YYYY-MM-DD string from our reflections table
      activitySet.add(day)
    }
  })

  // Monthly labels placement
  const monthLabels: { label: string; weekIndex: number }[] = []
  let lastMonth = -1
  
  weeks.forEach((week, wIndex) => {
    const firstDay = week[0]
    if (firstDay && firstDay.getMonth() !== lastMonth) {
      monthLabels.push({
        label: firstDay.toLocaleDateString('en-US', { month: 'short' }),
        weekIndex: wIndex
      })
      lastMonth = firstDay.getMonth()
    }
  })

  const todayStr = formatLocalDate(new Date())

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Reflection Activity
        </h3>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
          Last 112 Days
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="inline-block relative">
          {/* Month labels */}
          <div className="flex text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-3 h-4 relative ml-9">
            {monthLabels.map((m, i) => (
              <div
                key={`${m.label}-${i}`}
                className="absolute"
                style={{ left: `${m.weekIndex * 1.5}rem` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            {/* Weekday labels */}
            <div className="flex flex-col justify-between text-[9px] font-bold text-gray-300 uppercase py-1 h-[126px]">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* Heatmap Grid */}
            <div className="flex gap-1.5">
              {weeks.map((week, wIndex) => (
                <div key={wIndex} className="flex flex-col gap-1.5">
                  {week.map((date, dIndex) => {
                    if (!date) return <div key={dIndex} className="w-[18px] h-[18px]" />
                    
                    const dateStr = formatLocalDate(date)
                    const hasActivity = activitySet.has(dateStr)
                    const isToday = dateStr === todayStr
                    const isFuture = date > today

                    return (
                      <div
                        key={dateStr}
                        className={`w-[18px] h-[18px] rounded-[3px] transition-all duration-300 ${
                          isFuture 
                            ? 'bg-gray-50 opacity-20' 
                            : hasActivity
                            ? 'bg-emerald-600 shadow-sm shadow-emerald-100'
                            : 'bg-gray-100'
                        } ${isToday ? 'ring-2 ring-gold-400 ring-offset-2 z-10 scale-110' : 'hover:scale-110 hover:z-10 cursor-help'}`}
                        title={isFuture ? 'Future' : `${date.toLocaleDateString()}: ${
                          hasActivity ? 'Reflected' : 'No activity'
                        }`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-50 pt-6">
        <div className="flex items-center gap-3">
          <span>Less</span>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 bg-gray-100 rounded-[2px]" />
            <div className="w-3 h-3 bg-emerald-200 rounded-[2px]" />
            <div className="w-3 h-3 bg-emerald-400 rounded-[2px]" />
            <div className="w-3 h-3 bg-emerald-600 rounded-[2px]" />
          </div>
          <span>More</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-700">{activitySet.size} Days Active</span>
          <span className="text-gray-300">|</span>
          <span className="text-gold-600">Streak: {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}</span>
        </div>
      </div>
    </div>
  )
}
