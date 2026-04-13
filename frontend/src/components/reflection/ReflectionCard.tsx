import { Reflection } from '../../types/reflection'

interface ReflectionCardProps {
  reflection: Reflection
}

const MOOD_EMOJI: Record<string, string> = {
  peaceful: '☮️',
  grateful: '🙏',
  hopeful: '🌅',
  challenged: '💪',
  moved: '🥹',
}

export default function ReflectionCard({ reflection }: ReflectionCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{reflection.verse_key}</p>
          <p className="text-xs text-gray-400">{formatDate(reflection.date)}</p>
        </div>
        {reflection.mood && (
          <div className="text-2xl">
            {MOOD_EMOJI[reflection.mood] || ''}
          </div>
        )}
      </div>

      {/* Reflection Answers */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">
            What does this ayah mean to you?
          </p>
          <p className="text-gray-700 text-sm leading-relaxed">
            {reflection.prompt_1_answer}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">
            What will you do differently today?
          </p>
          <p className="text-gray-700 text-sm leading-relaxed">
            {reflection.prompt_2_answer}
          </p>
        </div>
      </div>

      {/* AI Suggestion */}
      {reflection.ai_action_suggestion && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <p className="text-sm text-emerald-900">
            💡 You might also consider:
          </p>
          <p className="text-sm text-emerald-800 mt-1">
            {reflection.ai_action_suggestion}
          </p>
        </div>
      )}

      {/* XP Earned */}
      <div className="text-xs text-gold-600 font-medium">
        +{reflection.xp_earned} XP
      </div>
    </div>
  )
}
