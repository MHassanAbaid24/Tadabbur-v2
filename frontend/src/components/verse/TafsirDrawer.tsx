import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Loader2, ArrowLeft, PencilLine, CheckCircle2 } from 'lucide-react'
import ReflectionForm from '../reflection/ReflectionForm'
import { useReflectionStore } from '../../store/reflectionStore'
import { useProgressStore } from '../../store/progressStore'

interface TafsirDrawerProps {
  tafsir: string
  verseKey: string
  isOpen?: boolean
  onClose?: () => void
  isLoading?: boolean
}

export default function TafsirDrawer({ tafsir, verseKey, isOpen: controlledIsOpen, onClose, isLoading = false }: TafsirDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [isReflecting, setIsReflecting] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Reset local drawer states when it closes/opens
  useEffect(() => {
    if (!isOpen) {
      setIsReflecting(false)
      setSubmittedSuccess(false)
    }
  }, [isOpen])

  // Prevent scrolling and manage focus when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => closeButtonRef.current?.focus(), 100)
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose ? onClose() : setInternalIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleClose = () => {
    onClose ? onClose() : setInternalIsOpen(false)
  }

  const handleReflectionSubmitted = () => {
    // Refresh today's reflection and progress stores
    useReflectionStore.getState().fetchTodayReflection(true)
    useProgressStore.getState().fetchSummary(true)

    // Trigger premium gamified success state animation
    setSubmittedSuccess(true)
    setTimeout(() => {
      setSubmittedSuccess(false)
      setIsReflecting(false)
      handleClose()
    }, 2500)
  }

  const drawerContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[1001]"
          />

          {/* Right Side Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-[550px] z-[1002] bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.1)] flex flex-col"
            role="complementary"
            aria-labelledby="tafsir-heading"
            aria-hidden={!isOpen}
          >
            {/* Header */}
            <div className="bg-green py-5 px-6 flex items-center justify-between">
              {isReflecting ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsReflecting(false)}
                    className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-all flex items-center justify-center"
                    aria-label="Back to Tafsir"
                    disabled={submittedSuccess}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <p className="font-cinzel text-[0.6rem] tracking-[0.2em] text-white/60 uppercase mb-1">Add Reflection</p>
                    <h3 id="tafsir-heading" className="font-cinzel text-[0.9rem] font-medium tracking-[0.08em] text-white uppercase">
                      Verse {verseKey}
                    </h3>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-cinzel text-[0.6rem] tracking-[0.2em] text-white/60 uppercase mb-1">Tafsir Summary</p>
                  <h3 id="tafsir-heading" className="font-cinzel text-[0.9rem] font-medium tracking-[0.08em] text-white uppercase">
                    Verse {verseKey}
                  </h3>
                </div>
              )}
              <button
                ref={closeButtonRef}
                onClick={handleClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                aria-label="Close Tafsir Drawer"
                disabled={submittedSuccess}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Container */}
            {submittedSuccess ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-cream/30 space-y-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-16 h-16 bg-green/10 text-green rounded-full flex items-center justify-center border border-green/20"
                >
                  <CheckCircle2 size={32} />
                </motion.div>
                <h3 className="font-cinzel text-[1.1rem] font-medium text-ink uppercase tracking-[0.06em]">
                  Reflection Saved!
                </h3>
                <p className="text-[0.9rem] text-muted italic max-w-xs leading-relaxed">
                  Your reflection has been securely stored in your journal.
                </p>
                <motion.div 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gold-faint border border-gold-light/30 rounded px-4 py-2 mt-4 inline-flex items-center gap-2"
                >
                  <span className="text-[1.2rem]">✨</span>
                  <span className="font-cinzel text-[0.75rem] font-bold text-gold uppercase tracking-[0.1em]">+10 XP Earned!</span>
                </motion.div>
              </div>
            ) : isReflecting ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-cream/30 space-y-6">
                <div className="bg-parchment/40 border border-border/60 p-4 rounded-[2px] text-ink-soft text-[0.88rem] italic leading-relaxed">
                  Reflecting on Verse {verseKey}. Your commits and reflections are private by default unless shared.
                </div>
                <ReflectionForm
                  verseKey={verseKey}
                  onSubmitted={handleReflectionSubmitted}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8 bg-cream/30">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <Loader2 className="animate-spin text-green" size={32} />
                    <p className="text-[0.75rem] font-cinzel tracking-[0.16em] text-muted uppercase animate-pulse">Loading tafsir...</p>
                  </div>
                ) : (
                  <div className="prose prose-stone max-w-none">
                    {tafsir.split('\n').filter(p => p.trim() !== '').map((para, idx) => {
                      const parts = para.split(/([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+(?:\s+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+)*)/g);
                      return (
                        <div key={idx} className="mb-8 last:mb-0">
                          {parts.map((part, i) => {
                            const trimmedPart = part.trim();
                            if (!trimmedPart) return null;
                            
                            const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(trimmedPart);
                            
                            return isArabic ? (
                              <div 
                                key={i} 
                                className="font-scheherazade text-2xl leading-relaxed text-right my-5 bg-parchment/40 p-5 rounded-[4px] border-r-4 border-gold shadow-sm" 
                                dir="rtl"
                                lang="ar"
                                translate="no"
                              >
                                {trimmedPart}
                              </div>
                            ) : (
                              <p key={i} className="text-ink-soft text-[1.05rem] leading-[1.85] font-light italic mb-4 last:mb-0">
                                {trimmedPart}
                              </p>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Footer action bar */}
            {!isReflecting && !submittedSuccess && (
              <div className="p-5 border-t border-border bg-white flex flex-col gap-4">
                <button
                  onClick={() => setIsReflecting(true)}
                  className="w-full bg-ink hover:bg-gold text-white font-cinzel text-[0.8rem] tracking-[0.14em] uppercase py-3.5 rounded-[2px] transition-all duration-300 flex items-center justify-center gap-2 group shadow-sm active:scale-[0.99]"
                >
                  <PencilLine size={15} className="group-hover:rotate-6 transition-transform" />
                  <span>Write Reflection</span>
                </button>
                <div className="flex justify-center opacity-30">
                  <span className="text-gold text-[1.2rem] tracking-[0.4em]">❧ ✦ ❧</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  // Only show trigger button if not controlled externally
  if (controlledIsOpen !== undefined) {
    return createPortal(drawerContent, document.body)
  }

  return (
    <>
      <button
        onClick={() => setInternalIsOpen(true)}
        className="flex items-center gap-2 px-6 py-2.5 border border-gold-light text-gold font-cinzel text-[0.68rem] tracking-[0.1em] uppercase rounded-full hover:bg-gold-faint transition-all duration-300 group"
      >
        <span>Read Tafsir — Ibn Kathir</span>
        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </button>

      {createPortal(drawerContent, document.body)}
    </>
  )
}
