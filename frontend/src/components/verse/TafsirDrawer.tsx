import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface TafsirDrawerProps {
  tafsir: string
  verseKey: string
}

export default function TafsirDrawer({ tafsir, verseKey }: TafsirDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-300 rounded-full hover:bg-emerald-50 transition-colors"
      >
        Read Tafsir (Ibn Kathir)
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Tafsir — {verseKey}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {tafsir.split('\n').filter(p => p.trim() !== '').map((para, idx) => {
                  const parts = para.split(/([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+(?:\s+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+)*)/g);
                  return (
                    <div key={idx} className="space-y-4">
                      {parts.map((part, i) => {
                        const trimmedPart = part.trim();
                        if (!trimmedPart) return null;
                        
                        const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(trimmedPart);
                        
                        return isArabic ? (
                          <div 
                            key={i} 
                            className="font-scheherazade text-2xl leading-relaxed text-right my-2 bg-emerald-50/30 p-3 rounded-lg border-r-4 border-emerald-600/50" 
                            dir="rtl"
                            translate="no"
                          >
                            {trimmedPart}
                          </div>
                        ) : (
                          <p key={i} className="text-gray-800 text-base leading-relaxed">
                            {trimmedPart}
                          </p>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
