import { useState, useRef } from 'react'
import { Play, Pause } from 'lucide-react'

interface AudioPlayerProps {
  audioUrl: string | null
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handlePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleAudioEnd = () => {
    setIsPlaying(false)
  }

  if (!audioUrl) {
    return (
      <div className="flex items-center justify-center h-12 bg-gray-100 rounded-lg text-gray-500 text-sm">
        No audio available
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handlePlayPause}
        className="w-[44px] h-[44px] rounded-full bg-green border-none flex items-center justify-center text-white transition-all duration-200 hover:bg-green-mid hover:scale-105 active:scale-95 shrink-0"
        aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
      </button>
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={handleAudioEnd}
        className="hidden"
      />
      <span className="text-[0.85rem] text-muted italic flex-1">
        {isPlaying ? 'Playing recitation...' : 'Listen to recitation'}
      </span>
    </>
  )
}
