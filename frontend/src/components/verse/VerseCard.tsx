import ArabicText from './ArabicText'
import AudioPlayer from './AudioPlayer'
import TafsirDrawer from './TafsirDrawer'

interface VerseCardProps {
  verseKey: string
  textUthmani: string
  translation: string
  tafsir: string
  audioUrl: string | null
}

export default function VerseCard({
  verseKey,
  textUthmani,
  translation,
  tafsir,
  audioUrl,
}: VerseCardProps) {
  const chapterVerse = verseKey.split(':')
  const surahNum = parseInt(chapterVerse[0], 10)
  const ayahNum = parseInt(chapterVerse[1], 10)

  const surahNames: Record<number, string> = {
    1: 'Al-Fatiha',
    2: 'Al-Baqarah',
    3: 'Ali Imran',
    // ... (in production, import full list)
  }

  const surahName = surahNames[surahNum] || `Chapter ${surahNum}`

  return (
    <div className="bg-white border border-border rounded-[4px] p-0 overflow-hidden shadow-[0_4px_40px_rgba(184,146,42,0.08),0_1px_4px_rgba(0,0,0,0.06)] mb-10 fade-up">
      {/* Gold ornamental top strip */}
      <div className="bg-green py-[0.85rem] px-8 flex items-center justify-center gap-4">
        <span className="text-gold-light text-[1.1rem] opacity-70 tracking-[0.3em]">❧ ✦ ❧</span>
        <span className="font-cinzel text-[0.7rem] tracking-[0.14em] text-white/80 uppercase">
          {surahName} · {surahNum}:{ayahNum}
        </span>
        <span className="text-gold-light text-[1.1rem] opacity-70 tracking-[0.3em]">❧ ✦ ❧</span>
      </div>

      <div className="pt-10 px-5 md:px-10 pb-8">
        <p className="font-scheherazade text-[1.6rem] md:text-[2rem] leading-[2.1] md:leading-[2.2] text-right text-ink mb-8 pb-7 border-b border-border" dir="rtl" lang="ar" translate="no">
          {textUthmani}
        </p>

        <p className="text-[1.1rem] leading-[1.85] text-ink-soft italic font-light mb-8">
          "{translation}"
        </p>

        <div className="flex items-center gap-4 pt-2">
          <AudioPlayer audioUrl={audioUrl} />
          <TafsirDrawer tafsir={tafsir} verseKey={verseKey} />
        </div>
      </div>
    </div>
  )
}
