import { useState } from 'react'
import { useReflectionStore } from '../../store/reflectionStore'
import { Mood } from '../../types/reflection'

interface ReflectionFormProps {
  verseKey: string
  onSubmitted: () => void
}

const MOOD_OPTIONS: Array<{ value: Mood; label: string; emoji: string }> = [
  { value: 'peaceful', label: 'Peaceful', emoji: '☮️' },
  { value: 'grateful', label: 'Grateful', emoji: '🙏' },
  { value: 'hopeful', label: 'Hopeful', emoji: '🌅' },
  { value: 'challenged', label: 'Challenged', emoji: '💪' },
  { value: 'moved', label: 'Moved', emoji: '🥹' },
]

export default function ReflectionForm({
  verseKey,
  onSubmitted,
}: ReflectionFormProps) {
  const { submitReflection } = useReflectionStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

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
        circle_id: null, // TODO: get from circle store
      })
      onSubmitted()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Submission failed'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Prompt 1 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What does this ayah mean to you, right now, in your life?
        </label>
        <textarea
          value={formData.prompt1}
          onChange={(e) => handleInputChange(e, 'prompt1')}
          disabled={isSubmitting}
          maxLength={2000}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none disabled:bg-gray-50"
          rows={3}
          placeholder="Your reflection..."
          required
        />
        <div className="text-xs text-gray-500 mt-1">
          {formData.prompt1.length}/2000
        </div>
      </div>

      {/* Prompt 2 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What is one thing you will do differently today because of this ayah?
        </label>
        <textarea
          value={formData.prompt2}
          onChange={(e) => handleInputChange(e, 'prompt2')}
          disabled={isSubmitting}
          maxLength={2000}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none disabled:bg-gray-50"
          rows={3}
          placeholder="Your commitment..."
          required
        />
        <div className="text-xs text-gray-500 mt-1">
          {formData.prompt2.length}/2000
        </div>
      </div>

      {/* Mood Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How are you feeling?
        </label>
        <div className="flex gap-2 flex-wrap">
          {MOOD_OPTIONS.map(({ value, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleMoodSelect(value)}
              disabled={isSubmitting}
              className={`text-2xl p-2 rounded-lg transition-colors disabled:opacity-50 ${
                formData.mood === value
                  ? 'bg-emerald-100'
                  : 'bg-gray-100 hover:bg-gray-200'
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
          className="w-4 h-4 rounded border-gray-300 text-emerald-600"
        />
        <label htmlFor="share" className="text-sm text-gray-700">
          Share with my circle
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || !formData.prompt1 || !formData.prompt2}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          'Share Reflection'
        )}
      </button>
    </form>
  )
}
