import { useState } from 'react'
import { useReflectionStore } from '../../store/reflectionStore'
import QFAuthModal from '../ui/QFAuthModal'
import { Mood } from '../../types/reflection'

interface ReflectionFormProps {
  verseKey: string
  onSubmitted: () => void
}

const MOOD_OPTIONS: Array<{ value: Mood; label: string; emoji: string }> = [
  { value: 'supplication', label: 'In supplication', emoji: '🤲' },
  { value: 'moved', label: 'Moved to tears', emoji: '😢' },
  { value: 'peaceful', label: 'At peace', emoji: '😌' },
  { value: 'grateful', label: 'Grateful & growing', emoji: '🌿' },
  { value: 'thoughtful', label: 'Deep in thought', emoji: '💭' },
]

export default function ReflectionForm({
  verseKey,
  onSubmitted,
}: ReflectionFormProps) {
  const { submitReflection } = useReflectionStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showQFAuthModal, setShowQFAuthModal] = useState(false)

  const [formData, setFormData] = useState({
    prompt1: '',
    prompt2: '',
    mood: null as Mood | null,
    isShared: false,
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    field: 'prompt1' | 'prompt2'
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
    setError('')
  }

  const handleMoodSelect = (mood: Mood) => {
    setFormData((prev) => ({
      ...prev,
      mood: prev.mood === mood ? null : mood,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await submitReflection({
        verse_key: verseKey,
        prompt_1_answer: formData.prompt1,
        prompt_2_answer: formData.prompt2,
        mood: formData.mood,
        is_shared: formData.isShared,
        circle_id: undefined, // TODO: get from circle store
      })
      onSubmitted()
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Submission failed'
      
      // Check if this is a QF auth error
      if (err?.response?.data?.code === 'QF_ACCOUNT_NOT_CONNECTED') {
        setShowQFAuthModal(true)
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Prompt 1 */}
      <div className="bg-white border border-border p-6 rounded-[4px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <label className="block font-cinzel text-[0.8rem] font-medium tracking-[0.06em] text-ink mb-3">
          What does this ayah mean to you, right now, in your life?
        </label>
        <textarea
          value={formData.prompt1}
          onChange={(e) => handleInputChange(e, 'prompt1')}
          disabled={isSubmitting}
          maxLength={2000}
          className="w-full bg-cream border border-border p-4 rounded-[2px] font-sans text-[0.95rem] leading-[1.6] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all resize-y min-h-[120px] disabled:opacity-60"
          placeholder="Your reflection..."
          required
        />
        <div className="text-[0.7rem] font-cinzel text-muted mt-2 text-right">
          {formData.prompt1.length}/2000
        </div>
      </div>

      {/* Prompt 2 */}
      <div className="bg-white border border-border p-6 rounded-[4px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <label className="block font-cinzel text-[0.8rem] font-medium tracking-[0.06em] text-ink mb-3">
          What is one thing you will do differently today because of this ayah?
        </label>
        <textarea
          value={formData.prompt2}
          onChange={(e) => handleInputChange(e, 'prompt2')}
          disabled={isSubmitting}
          maxLength={2000}
          className="w-full bg-cream border border-border p-4 rounded-[2px] font-sans text-[0.95rem] leading-[1.6] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all resize-y min-h-[120px] disabled:opacity-60"
          placeholder="Your commitment..."
          required
        />
        <div className="text-[0.7rem] font-cinzel text-muted mt-2 text-right">
          {formData.prompt2.length}/2000
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white border border-border p-5 rounded-[4px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        {/* Mood Selector */}
        <div>
          <label className="block font-cinzel text-[0.7rem] tracking-[0.1em] text-muted uppercase mb-3">
            How are you feeling?
          </label>
          <div className="flex gap-2 flex-wrap">
            {MOOD_OPTIONS.map(({ value, emoji }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleMoodSelect(value)}
                disabled={isSubmitting}
                className={`text-[1.3rem] w-[40px] h-[40px] flex items-center justify-center rounded-full transition-all border ${
                  formData.mood === value
                    ? 'bg-parchment border-gold shadow-[0_0_10px_rgba(184,146,42,0.2)] scale-110'
                    : 'bg-cream border-border hover:border-gold/50 hover:bg-parchment/50 hover:scale-110'
                }`}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Share Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="share"
            checked={formData.isShared}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                isShared: e.target.checked,
              }))
            }
            disabled={isSubmitting}
            className="w-[18px] h-[18px] accent-green cursor-pointer"
          />
          <label htmlFor="share" className="font-cinzel text-[0.75rem] tracking-[0.06em] text-ink cursor-pointer select-none">
            Share with my circle
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || !formData.prompt1 || !formData.prompt2}
        className="w-full bg-ink hover:bg-gold text-white font-cinzel text-[0.85rem] tracking-[0.14em] uppercase py-4 rounded-[2px] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-ink"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Submitting...</span>
          </>
        ) : (
          'Share Reflection'
        )}
      </button>

      {/* QF Auth Modal */}
      <QFAuthModal
        isOpen={showQFAuthModal}
        onClose={() => setShowQFAuthModal(false)}
      />
    </form>
  )
}
