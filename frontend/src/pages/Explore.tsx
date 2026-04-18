import { useEffect, useState } from 'react'
import { useVerseStore } from '../store/verseStore'
import PageWrapper from '../components/layout/PageWrapper'
import { Loader2, Search, BookOpen, MessageSquarePlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '../components/ui/Modal'
import ReflectionForm from '../components/reflection/ReflectionForm'

export default function Explore() {
  const { 
    chapters, 
    isLoadingChapters, 
    fetchChapters, 
    versesList, 
    isLoadingVerses, 
    fetchVersesByChapter 
  } = useVerseStore()

  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [reflectionVerseKey, setReflectionVerseKey] = useState<string | null>(null)

  useEffect(() => {
    fetchChapters()
  }, [fetchChapters])

  const filteredChapters = chapters.filter(c => 
    c.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toString() === searchQuery
  )

  const handleChapterClick = (chapterId: number) => {
    setSelectedChapter(chapterId)
    fetchVersesByChapter(chapterId)
  }

  const currentChapter = chapters.find(c => c.id === selectedChapter)

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto py-6">
        {/* Header aligned with Home page style */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-border pb-6 pt-2">
            <div>
              <h1 className="font-cinzel text-[1.4rem] md:text-[1.8rem] font-medium tracking-[0.06em] text-ink mb-2 uppercase">Explore Quran</h1>
              <p className="font-cinzel text-[0.75rem] tracking-[0.14em] text-muted uppercase">
                Browse chapters and reflect on any ayah
              </p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Chapter Selector */}
          <div className="md:col-span-1 space-y-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={17} />
              <input
                type="text"
                placeholder="Search Surah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-border rounded-[2px] font-sans text-[0.9rem] text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all shadow-sm"
              />
            </div>

            <div className="bg-white rounded-[4px] border border-border overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="max-h-[65vh] overflow-y-auto custom-scrollbar">
                {isLoadingChapters ? (
                  <div className="p-10 flex justify-center">
                    <Loader2 className="animate-spin text-gold" size={24} />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredChapters.length > 0 ? (
                      filteredChapters.map((chapter) => (
                        <button
                          key={chapter.id}
                          onClick={() => handleChapterClick(chapter.id)}
                          className={`w-full flex items-center justify-between p-4 text-left transition-all hover:bg-parchment/30 group ${
                            selectedChapter === chapter.id ? 'bg-parchment border-l-4 border-gold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-[2px] bg-cream flex items-center justify-center text-[0.65rem] font-cinzel font-bold text-muted group-hover:bg-gold-faint group-hover:text-gold transition-colors border border-border">
                              {chapter.id}
                            </span>
                            <div>
                              <p className="font-cinzel font-medium text-ink text-[0.8rem] tracking-[0.02em]">{chapter.name_simple}</p>
                              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted font-medium">{chapter.verses_count} Verses</p>
                            </div>
                          </div>
                          <span className="text-xl font-scheherazade text-gold" dir="rtl">{chapter.name_arabic}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-10 text-center">
                        <p className="text-[0.85rem] text-muted italic font-light">No Surahs found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!isLoadingChapters && searchQuery === '' && (
              <p className="text-[0.6rem] text-center text-muted uppercase tracking-[0.2em] font-medium opacity-60">
                Scroll to see all 114 Surahs
              </p>
            )}
          </div>

          {/* Verses View */}
          <div className="md:col-span-2">
            <AnimatePresence mode="wait">
              {!selectedChapter ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white rounded-[4px] border border-border p-12 text-center shadow-sm"
                >
                  <div className="w-16 h-16 bg-cream text-gold rounded-full flex items-center justify-center mx-auto mb-6 border border-border shadow-inner">
                    <BookOpen size={28} />
                  </div>
                  <h2 className="font-cinzel text-[1.1rem] font-medium tracking-[0.06em] text-ink mb-3 uppercase">Select a Surah</h2>
                  <p className="text-muted max-w-xs mx-auto text-[0.95rem] leading-[1.6] font-light italic">
                    Choose a chapter from the list to start reading and reflecting on individual ayahs.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="verses"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div className="bg-green text-white p-7 rounded-[4px] shadow-lg shadow-gold/5 relative overflow-hidden border border-green-mid">
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <p className="text-gold-light/60 text-[0.6rem] uppercase font-cinzel tracking-[0.2em] mb-1">Surah</p>
                        <h2 className="font-cinzel text-[1.5rem] font-medium tracking-[0.04em]">{currentChapter?.name_simple}</h2>
                        <p className="text-white/60 text-[0.7rem] font-cinzel tracking-[0.1em] mt-1 uppercase">
                          {currentChapter?.verses_count} Verses • {currentChapter?.revelation_place}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-scheherazade text-gold-light" dir="rtl">{currentChapter?.name_arabic}</p>
                      </div>
                    </div>
                    {/* Abstract decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gold/10 rounded-full -ml-12 -mb-12 blur-xl" />
                  </div>

                  {isLoadingVerses ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-5">
                      <Loader2 className="animate-spin text-gold" size={32} />
                      <p className="text-[0.75rem] font-cinzel tracking-[0.16em] text-muted uppercase animate-pulse">Fetching ayahs...</p>
                    </div>
                  ) : (
                    <div className="space-y-6 pb-20">
                      {versesList.map((verse) => (
                        <div 
                          key={verse.id}
                          className="group bg-white rounded-[4px] border border-border p-7 transition-all hover:border-gold/30 hover:shadow-md relative overflow-hidden shadow-[0_2px_15px_rgba(0,0,0,0.02)]"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <span className="font-cinzel text-[0.65rem] tracking-[0.12em] text-muted bg-cream px-3 py-1.5 rounded-[2px] border border-border">
                              {verse.verse_key}
                            </span>
                            <button
                              onClick={() => setReflectionVerseKey(verse.verse_key)}
                              className="md:opacity-0 group-hover:opacity-100 flex items-center gap-2 font-cinzel text-[0.7rem] tracking-[0.1em] text-gold hover:text-ink transition-all px-4 py-2 bg-gold-faint border border-gold-light rounded-full active:scale-95 uppercase"
                            >
                              <MessageSquarePlus size={15} />
                              Reflect
                            </button>
                          </div>
                          
                          <div 
                            className="text-right mb-8 font-scheherazade text-[1.75rem] leading-[2] text-ink pb-6 border-b border-border/50" 
                            dir="rtl" 
                            lang="ar"
                            translate="no"
                          >
                            {verse.text_uthmani}
                          </div>
                          
                          <div className="relative pl-6">
                            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gold/30 rounded-full" />
                            <p className="text-ink-soft leading-[1.8] text-[1.1rem] font-light italic">
                              {verse.translation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Reflection Modal */}
      <Modal
        isOpen={!!reflectionVerseKey}
        onClose={() => setReflectionVerseKey(null)}
        title={`Add Reflection`}
      >
        <div className="mb-8 p-6 bg-parchment/40 rounded-[2px] border border-border shadow-sm">
           <p className="font-cinzel text-[0.6rem] font-bold text-gold uppercase tracking-[0.2em] mb-2">Reflecting on Verse</p>
           <p className="font-cinzel text-[1rem] font-medium text-ink uppercase tracking-[0.06em]">{reflectionVerseKey}</p>
        </div>
        {reflectionVerseKey && (
          <ReflectionForm 
            verseKey={reflectionVerseKey}
            onSubmitted={() => setReflectionVerseKey(null)}
          />
        )}
      </Modal>
    </PageWrapper>
  )
}
