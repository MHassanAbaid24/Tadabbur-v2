import { useEffect, useState } from 'react'
import { useVerseStore } from '../store/verseStore'
import PageWrapper from '../components/layout/PageWrapper'
import { Loader2, Search, BookOpen, MessageSquarePlus, ChevronRight } from 'lucide-react'
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

  // Filter chapters based on search query
  const filteredChapters = chapters.filter(c => 
    c.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toString() === searchQuery
  )

  const handleChapterClick = (chapterId: number) => {
    setSelectedChapter(chapterId)
    fetchVersesByChapter(chapterId)
    // Clear search on selection to show full list next time
    // setSearchQuery('') 
  }

  const currentChapter = chapters.find(c => c.id === selectedChapter)

  return (
    <PageWrapper className="bg-slate-50">
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Explore Quran</h1>
          <p className="text-gray-600">Browse chapters and reflect on any ayah.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chapter Selector */}
          <div className="md:col-span-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search Surah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                {isLoadingChapters ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="animate-spin text-emerald-600" size={24} />
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredChapters.length > 0 ? (
                      filteredChapters.map((chapter) => (
                        <button
                          key={chapter.id}
                          onClick={() => handleChapterClick(chapter.id)}
                          className={`w-full flex items-center justify-between p-4 text-left transition-all hover:bg-emerald-50/50 group ${
                            selectedChapter === chapter.id ? 'bg-emerald-50 border-l-4 border-emerald-600' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                              {chapter.id}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{chapter.name_simple}</p>
                              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{chapter.verses_count} Verses</p>
                            </div>
                          </div>
                          <span className="text-lg font-arabic text-emerald-700" dir="rtl">{chapter.name_arabic}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-gray-500 italic">No Surahs found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hint for scrolling */}
            {!isLoadingChapters && searchQuery === '' && (
              <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center"
                >
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Select a Surah</h2>
                  <p className="text-gray-500 max-w-xs mx-auto text-sm">
                    Choose a chapter from the list to start reading and reflecting on individual ayahs.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="verses"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="bg-emerald-700 text-white p-6 rounded-3xl shadow-lg shadow-emerald-700/20 relative overflow-hidden">
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <p className="text-emerald-100 text-[10px] uppercase font-bold tracking-widest mb-1">Surah</p>
                        <h2 className="text-2xl font-bold">{currentChapter?.name_simple}</h2>
                        <p className="text-emerald-100/80 text-sm mt-1">{currentChapter?.verses_count} Verses • {currentChapter?.revelation_place}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-arabic" dir="rtl">{currentChapter?.name_arabic}</p>
                      </div>
                    </div>
                    {/* Abstract decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gold-400/10 rounded-full -ml-12 -mb-12 blur-xl" />
                  </div>

                  {isLoadingVerses ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="animate-spin text-emerald-600" size={32} />
                      <p className="text-sm text-gray-500 animate-pulse">Fetching ayahs...</p>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-20">
                      {versesList.map((verse) => (
                        <div 
                          key={verse.id}
                          className="group bg-white rounded-2xl border border-gray-200 p-6 transition-all hover:border-emerald-200 hover:shadow-md relative overflow-hidden"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                              {verse.verse_key}
                            </span>
                            <button
                              onClick={() => setReflectionVerseKey(verse.verse_key)}
                              className="md:opacity-0 group-hover:opacity-100 flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 font-bold transition-all px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100 active:scale-95"
                            >
                              <MessageSquarePlus size={14} />
                              REFLECT
                            </button>
                          </div>
                          
                          <div 
                            className="text-right mb-6 font-arabic text-3xl leading-[2.2] text-gray-900" 
                            dir="rtl" 
                            lang="ar"
                            translate="no"
                          >
                            {verse.text_uthmani}
                          </div>
                          
                          <div className="relative">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-100 rounded-full" />
                            <p className="text-gray-600 leading-relaxed text-base pl-4">
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
        <div className="mb-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
           <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Reflecting on Verse</p>
           <p className="text-sm font-medium text-emerald-900">{reflectionVerseKey}</p>
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
