import { useState } from 'react'
import { Reflection } from '../../types/reflection'
import { useReflectionStore } from '../../store/reflectionStore'

interface ReflectionCardProps {
  reflection: Reflection
}

const MOOD_EMOJI: Record<string, string> = {
  supplication: '🤲',
  moved: '😢',
  peaceful: '😌',
  grateful: '🌿',
  thoughtful: '💭',
}

export default function ReflectionCard({ reflection }: ReflectionCardProps) {
  const [insightError, setInsightError] = useState<string | null>(null)
  const { generateInsight, insightLoadingId } = useReflectionStore()

  const isGeneratingInsight = insightLoadingId === reflection.id
  const hasInsight = !!reflection.ai_action_suggestion

  const handleGenerateInsight = async () => {
    setInsightError(null)
    try {
      await generateInsight(reflection.id)
    } catch (error) {
      setInsightError('Failed to generate insight. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="bg-white border border-border p-5 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col gap-5 relative opacity-100 hover:border-gold transition-colors duration-300 group rounded-[4px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-cinzel text-[0.65rem] tracking-[0.14em] text-muted uppercase mb-1">
            {formatDate(reflection.date)}
          </p>
          <p className="font-cinzel text-[0.8rem] tracking-[0.06em] text-ink font-medium">
            {reflection.verse_key}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {reflection.mood && (
            <div className="flex items-center justify-center w-[32px] h-[32px] bg-parchment rounded-full text-[1.1rem] border border-border shadow-[0_2px_6px_rgba(184,146,42,0.15)] bg-opacity-70 backdrop-blur-sm relative z-10" title={reflection.mood}>
              {MOOD_EMOJI[reflection.mood] || ''}
            </div>
          )}
          {reflection.xp_earned > 0 && (
             <div className="font-sans text-[0.7rem] font-medium text-gold bg-gold-faint px-2 py-0.5 rounded-[2px]">
               +{reflection.xp_earned} XP
             </div>
          )}
        </div>
      </div>

      {/* Reflection Answers */}
      <div className="flex flex-col gap-6 pt-1 border-t border-border/50">
        {/* Verse Context */}
        {(reflection.verse_text || reflection.verse_translation) && (
          <div className="bg-green-light border-l-[3px] border-green p-4 pt-3">
            {reflection.verse_text && (
              <p 
                className="font-scheherazade text-[1.4rem] leading-[2] text-right text-green-mid mb-2" 
                dir="rtl" 
                translate="no"
              >
                {reflection.verse_text}
              </p>
            )}
            {reflection.verse_translation && (
              <p className="font-sans text-[0.85rem] leading-[1.6] text-ink-soft italic">
                "{reflection.verse_translation}"
              </p>
            )}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h4 className="font-cinzel text-[0.68rem] tracking-[0.1em] text-gold uppercase mb-2">What does this ayah mean to you?</h4>
            <p className="font-sans text-[0.95rem] leading-[1.6] text-ink whitespace-pre-wrap">
              {reflection.prompt_1_answer}
            </p>
          </div>

          <div>
            <h4 className="font-cinzel text-[0.68rem] tracking-[0.1em] text-gold uppercase mb-2">What will you do differently today?</h4>
            <p className="font-sans text-[0.95rem] leading-[1.6] text-ink whitespace-pre-wrap">
              {reflection.prompt_2_answer}
            </p>
          </div>
        </div>
      </div>

      {/* AI Insight Section */}
      <div className="border-t border-border/50 pt-4">
        {!hasInsight ? (
          // Hidden State: Interactive button to generate insight
          <>
            <button
              onClick={handleGenerateInsight}
              disabled={isGeneratingInsight}
              className="w-full px-4 py-3 border border-dashed border-gold/50 rounded-[3px] bg-gold-faint/20 hover:bg-gold-faint/40 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGeneratingInsight ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-gold"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="font-sans text-[0.9rem] text-gold font-medium">
                    Musing on your reflection...
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[1.1rem]">💡</span>
                  <span className="font-sans text-[0.9rem] text-gold font-medium">
                    Tap to generate a personalized action step
                  </span>
                </>
              )}
            </button>
            {/* Hint text */}
            <p className="text-[0.75rem] text-muted mt-2 text-center">
              Your reflection answers will be analyzed by AI to provide a relevant Islamic insight.
            </p>
          </>
        ) : (
          // Revealed State: Display generated insight in highlighted box
          <div className="bg-gradient-to-br from-gold-faint/40 to-emerald-50 border border-gold/30 rounded-[3px] p-4 shadow-[inset_0_1px_3px_rgba(201,168,76,0.1)]">
            <div className="flex items-start gap-3">
              <span className="text-[1.3rem] flex-shrink-0">✨</span>
              <div className="flex-1">
                <h5 className="font-cinzel text-[0.7rem] tracking-[0.1em] text-gold uppercase mb-1.5 font-semibold">
                  Personalized Action
                </h5>
                <p className="font-sans text-[0.9rem] leading-[1.5] text-ink">
                  {reflection.ai_action_suggestion}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {insightError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-[3px] text-[0.85rem] text-red-700">
            {insightError}
          </div>
        )}
      </div>
    </div>
  )
}