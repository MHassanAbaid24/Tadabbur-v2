interface StreakBadgeProps {
  streak: number
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  const isHotStreak = streak >= 7

  return (
    <div
      className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold text-sm ${
        isHotStreak
          ? 'bg-gold-100 text-gold-700'
          : 'bg-gray-100 text-gray-700'
      }`}
    >
      <span className="text-lg">🔥</span>
      <span>{streak}</span>
    </div>
  )
}
