interface XPBarProps {
  current: number
  max: number
}

export default function XPBar({ current, max }: XPBarProps) {
  const percentage = Math.min(100, (current / max) * 100)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Total XP</span>
        <span className="text-sm font-semibold text-gold-600">
          {current} / {max}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gold-500 h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
