interface LevelBadgeProps {
  level: number
  levelName: string
  levelNameAr: string
  xp: number
  xpToNext: number
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'emerald',
  2: 'emerald',
  3: 'gold',
  4: 'gold',
  5: 'gold',
}

export default function LevelBadge({
  level,
  levelName,
  levelNameAr,
  xp,
  xpToNext,
}: LevelBadgeProps) {
  const colorClass = LEVEL_COLORS[level] || 'emerald'
  const bgClass = colorClass === 'gold' ? 'bg-gold-100' : 'bg-emerald-100'
  const textClass = colorClass === 'gold' ? 'text-gold-700' : 'text-emerald-700'
  const progressClass =
    colorClass === 'gold' ? 'bg-gold-500' : 'bg-emerald-500'

  return (
    <div className={`${bgClass} border border-${colorClass}-300 rounded-lg p-4 space-y-3`}>
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full ${bgClass} flex items-center justify-center`}>
          <span className={`${textClass} text-2xl font-bold`}>{level}</span>
        </div>
        <div>
          <p className={`${textClass} font-semibold`}>{levelName}</p>
          <p className="text-xs text-gray-600">{levelNameAr}</p>
        </div>
      </div>

      {/* XP Progress */}
      {xpToNext > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Progress</span>
            <span className={textClass}>{xp} / {xp + xpToNext} XP</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${progressClass} h-2 rounded-full transition-all`}
              style={{
                width: `${Math.min(
                  100,
                  (xp / (xp + xpToNext)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {xpToNext === 0 && (
        <p className={`${textClass} text-xs font-semibold`}>🎉 Max Level!</p>
      )}
    </div>
  )
}
