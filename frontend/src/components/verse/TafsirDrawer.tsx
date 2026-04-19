import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight } from 'lucide-react'

interface TafsirDrawerProps {
  tafsir: string
  verseKey: string
}

export default function TafsirDrawer({ tafsir, verseKey }: TafsirDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const closeButtonRef = useRef<HTMLButtonElement>(null)

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
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const drawerContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[1001]"
          />

          {/* Right Side Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-[440px] z-[1002] bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.1)] flex flex-col"
            role="complementary"
            aria-labelledby="tafsir-heading"
            aria-hidden={!isOpen}
          >
            {/* Header */}
            <div className="bg-green py-5 px-6 flex items-center justify-between">
              <div>
                <p className="font-cinzel text-[0.6rem] tracking-[0.2em] text-white/60 uppercase mb-1">Tafsir Summary</p>
                <h3 id="tafsir-heading" className="font-cinzel text-[0.9rem] font-medium tracking-[0.08em] text-white uppercase">
                  Verse {verseKey}
                </h3>
              </div>
              <button
                ref={closeButtonRef}
                onClick={() => setIsOpen(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                aria-label="Close Tafsir Drawer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8 bg-cream/30">
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
            </div>

            {/* Footer decoration */}
            <div className="p-4 border-t border-border bg-white flex justify-center opacity-30">
               <span className="text-gold text-[1.2rem] tracking-[0.4em]">❧ ✦ ❧</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-6 py-2.5 border border-gold-light text-gold font-cinzel text-[0.68rem] tracking-[0.1em] uppercase rounded-full hover:bg-gold-faint transition-all duration-300 group"
      >
        <span>Read Tafsir — Ibn Kathir</span>
        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </button>

      {createPortal(drawerContent, document.body)}
    </>
  )
}
