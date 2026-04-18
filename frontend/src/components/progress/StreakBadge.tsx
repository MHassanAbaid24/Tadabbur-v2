interface StreakBadgeProps {
  streak: number
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  const isHotStreak = streak >= 7

  return (
    <div
      className={`flex items-center gap-[6px] border rounded-full py-[5px] pr-[14px] pl-[10px] font-cinzel text-[0.75rem] font-medium text-ink-soft ${
        isHotStreak
          ? 'bg-parchment border-gold shadow-[0_0_15px_rgba(184,146,42,0.15)] text-gold scale-105'
          : 'bg-parchment border-border shadow-sm'
      }`}
    >
      <span className="text-[1rem]">🔥</span>
      <span>{streak} {streak === 1 ? 'day' : 'days'}</span>
    </div>
  )
}
