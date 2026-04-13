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
    <div className="bg-cream-50 border-2 border-gold-500 rounded-lg p-6 space-y-6">
      {/* Arabic Text */}
      <div className="text-center">
        <ArabicText text={textUthmani} />
      </div>

      {/* Reference */}
      <div className="text-center text-sm text-gray-600">
        {surahName} {surahNum}:{ayahNum}
      </div>

      {/* Translation */}
      <div className="text-gray-700 text-base leading-relaxed">
        <p className="italic">"{translation}"</p>
      </div>

      {/* Audio Player */}
      <div className="pt-2">
        <AudioPlayer audioUrl={audioUrl} />
      </div>

      {/* Tafsir Drawer */}
      <div>
        <TafsirDrawer tafsir={tafsir} verseKey={verseKey} />
      </div>
    </div>
  )
}
