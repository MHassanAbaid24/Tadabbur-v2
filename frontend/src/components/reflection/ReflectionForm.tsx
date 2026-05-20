import { useState, useEffect, useRef } from 'react'
import { useReflectionStore } from '../../store/reflectionStore'
import { useCircleStore } from '../../store/circleStore'
import QFAuthModal from '../ui/QFAuthModal'
import { Mood } from '../../types/reflection'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import DictationButton from './DictationButton'
import api from '../../lib/api'
import { Loader2 } from 'lucide-react'

interface ReflectionFormProps {
  verseKey: string
  onSubmitted: () => void
  prompt1Label?: string
  prompt2Label?: string
  isHomePage?: boolean
}

const DEFAULT_PROMPT_1 = 'What does this ayah mean to you, right now, in your life?'
const DEFAULT_PROMPT_2 = 'What is one thing you will do differently today because of this ayah?'
const UNSUPPORTED_DICTATION_MESSAGE = 'Mic dictation unavailable in this browser. Typing still works.'

const REFLECTION_WAITING_MESSAGES = [
  'Pondering the depth of this Ayah...',
  'Calming the mind to connect with the word of Allah...',
  'Seeking wisdom and personal guidance...',
  'Preparing a bespoke reflective prompt for you...',
  "Open your heart to the Quran's message..."
]

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
  prompt1Label,
  prompt2Label,
  isHomePage = false,
}: ReflectionFormProps) {
  const { submitReflection } = useReflectionStore()
  const { circle, fetchMyCircle } = useCircleStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showQFAuthModal, setShowQFAuthModal] = useState(false)
  const [activeDictationField, setActiveDictationField] = useState<'prompt1' | 'prompt2' | null>(null)
  const activeDictationFieldRef = useRef<'prompt1' | 'prompt2' | null>(null)

  // Fetch circle info on mount
  useEffect(() => {
    fetchMyCircle()
  }, [fetchMyCircle])

  const [isDictationWarningDismissed, setIsDictationWarningDismissed] = useState(() => {
    return localStorage.getItem('tadabbur_dictation_warning_dismissed') === 'true'
  })

  const handleDismissWarning = () => {
    localStorage.setItem('tadabbur_dictation_warning_dismissed', 'true')
    setIsDictationWarningDismissed(true)
  }

  // Dynamic prompt states when prompt1Label and prompt2Label are not passed as props
  const [dynamicPrompt1, setDynamicPrompt1] = useState<string | null>(null)
  const [dynamicPrompt2, setDynamicPrompt2] = useState<string | null>(null)
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)

  useEffect(() => {
    if (!isLoadingPrompts) return

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % REFLECTION_WAITING_MESSAGES.length)
    }, 2500)

    return () => clearInterval(interval)
  }, [isLoadingPrompts])

  useEffect(() => {
    // If prompts are passed down as props, do not fetch
    if (prompt1Label && prompt2Label) {
      return
    }

    const fetchDynamicPrompts = async () => {
      try {
        setIsLoadingPrompts(true)
        const response = await api.get<{ data: { prompt_1?: string; prompt_2?: string } }>(
          `/api/verse/by-key/${verseKey}`
        )
        const data = response.data.data
        if (data.prompt_1 && data.prompt_2) {
          setDynamicPrompt1(data.prompt_1)
          setDynamicPrompt2(data.prompt_2)
        }
      } catch (err) {
        console.error('Failed to fetch dynamic prompts for verse:', err)
      } finally {
        setIsLoadingPrompts(false)
      }
    }

    fetchDynamicPrompts()
  }, [verseKey, prompt1Label, prompt2Label])

  const displayPrompt1 = prompt1Label || dynamicPrompt1 || DEFAULT_PROMPT_1
  const displayPrompt2 = prompt2Label || dynamicPrompt2 || DEFAULT_PROMPT_2

  useEffect(() => {
    activeDictationFieldRef.current = activeDictationField
  }, [activeDictationField])

  const { isListening, isSupported, error: speechError, startListening, stopListening } = useSpeechRecognition((text) => {
    const field = activeDictationFieldRef.current
    if (field) {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field] + (prev[field] && !prev[field].endsWith(' ') ? ' ' : '') + text
      }))
    }
  })

  useEffect(() => {
    if (!isListening && activeDictationFieldRef.current) {
      const timeoutId = window.setTimeout(() => {
        activeDictationFieldRef.current = null
        setActiveDictationField(null)
      }, 250)

      return () => window.clearTimeout(timeoutId)
    }
  }, [isListening])

  const handleDictationToggle = (field: 'prompt1' | 'prompt2') => {
    if (activeDictationField === field && isListening) {
      stopListening();
    } else {
      if (isListening) stopListening();
      activeDictationFieldRef.current = field
      setActiveDictationField(field);
      startListening();
    }
  }

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
    const circleId = circle?.qf_room_id

    if (formData.isShared && !circleId) {
      setError('You are not currently in a circle. Join or create a circle first.')
      setIsSubmitting(false)
      return
    }

    try {
      await submitReflection({
        verse_key: verseKey,
        prompt_1_answer: formData.prompt1,
        prompt_2_answer: formData.prompt2,
        mood: formData.mood,
        is_shared: formData.isShared,
        circle_id: formData.isShared ? circleId : undefined,
      })
      onSubmitted()
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Submission failed'
      
      // Check if this is a QF auth error
      if (err?.response?.data?.code === 'QF_ACCOUNT_NOT_CONNECTED') {
        setShowQFAuthModal(true)
      } else if (err?.response?.status === 409) {
        setError(
          "You've already submitted this exact reflection for this verse. " +
          "Try rewording it to capture a new thought."
        )
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
      {(error || speechError) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error || speechError}
        </div>
      )}

      {/* Prompt 1 */}
      <div className={`bg-white border p-6 rounded-[4px] transition-all duration-300 ${activeDictationField === 'prompt1' && isListening ? 'border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)]'}`}>
        <div className="flex justify-between items-center mb-3">
          <label className="block font-cinzel text-[0.8rem] font-medium tracking-[0.06em] text-ink min-h-[24px] flex items-center">
            {isLoadingPrompts ? (
              <span className="flex items-center gap-2 text-gold animate-pulse italic">
                <Loader2 size={13} className="animate-spin text-gold shrink-0" />
                <span>{REFLECTION_WAITING_MESSAGES[loadingMessageIndex]}</span>
              </span>
            ) : (
              displayPrompt1
            )}
          </label>
          <DictationButton 
            isListening={activeDictationField === 'prompt1' && isListening} 
            isSupported={isSupported} 
            onClick={() => handleDictationToggle('prompt1')}
            disabled={isSubmitting}
          />
        </div>
        {isHomePage && !isSupported && !isDictationWarningDismissed && (
          <div className="mb-3 flex items-center justify-between rounded-[2px] border border-amber-200 bg-amber-50 px-3 py-2 text-[0.78rem] text-amber-800">
            <span>{UNSUPPORTED_DICTATION_MESSAGE}</span>
            <button
              type="button"
              onClick={handleDismissWarning}
              className="text-amber-800/60 hover:text-amber-800 transition-colors p-1"
              title="Dismiss warning"
              aria-label="Dismiss warning"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {isLoadingPrompts ? (
          <div className="w-full bg-cream border border-border/60 p-4 rounded-[2px] min-h-[120px] flex flex-col gap-2 justify-center items-center">
            <div className="w-2/3 h-3 bg-gold/10 rounded animate-pulse" />
            <div className="w-1/2 h-3 bg-gold/10 rounded animate-pulse" />
          </div>
        ) : (
          <textarea
            value={formData.prompt1}
            onChange={(e) => handleInputChange(e, 'prompt1')}
            disabled={isSubmitting}
            maxLength={2000}
            className="w-full bg-cream border border-border p-4 rounded-[2px] font-sans text-[0.95rem] leading-[1.6] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all resize-y min-h-[120px] disabled:opacity-60"
            placeholder="Your reflection..."
            required
          />
        )}
        <div className="text-[0.7rem] font-cinzel text-muted mt-2 text-right">
          {formData.prompt1.length}/2000
        </div>
      </div>

      {/* Prompt 2 */}
      <div className={`bg-white border p-6 rounded-[4px] transition-all duration-300 ${activeDictationField === 'prompt2' && isListening ? 'border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)]'}`}>
        <div className="flex justify-between items-center mb-3">
          <label className="block font-cinzel text-[0.8rem] font-medium tracking-[0.06em] text-ink min-h-[24px] flex items-center">
            {isLoadingPrompts ? (
              <span className="flex items-center gap-2 text-gold animate-pulse italic">
                <Loader2 size={13} className="animate-spin text-gold shrink-0" />
                <span>Formulating actionable goal...</span>
              </span>
            ) : (
              displayPrompt2
            )}
          </label>
          <DictationButton 
            isListening={activeDictationField === 'prompt2' && isListening} 
            isSupported={isSupported} 
            onClick={() => handleDictationToggle('prompt2')}
            disabled={isSubmitting}
          />
        </div>
        {isLoadingPrompts ? (
          <div className="w-full bg-cream border border-border/60 p-4 rounded-[2px] min-h-[120px] flex flex-col gap-2 justify-center items-center">
            <div className="w-2/3 h-3 bg-gold/10 rounded animate-pulse" />
            <div className="w-1/2 h-3 bg-gold/10 rounded animate-pulse" />
          </div>
        ) : (
          <textarea
            value={formData.prompt2}
            onChange={(e) => handleInputChange(e, 'prompt2')}
            disabled={isSubmitting}
            maxLength={2000}
            className="w-full bg-cream border border-border p-4 rounded-[2px] font-sans text-[0.95rem] leading-[1.6] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all resize-y min-h-[120px] disabled:opacity-60"
            placeholder="Your commitment..."
            required
          />
        )}
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

        {/* Share Toggle - Render only if circle exists */}
        {circle && (
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
              Share with {circle.name}
            </label>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || isLoadingPrompts || !formData.prompt1 || !formData.prompt2}
        className="w-full bg-ink hover:bg-gold text-white font-cinzel text-[0.85rem] tracking-[0.14em] uppercase py-4 rounded-[2px] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-ink mb-16 md:mb-0"
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
