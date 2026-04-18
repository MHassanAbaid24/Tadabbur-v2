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
    </div>
  )
}
