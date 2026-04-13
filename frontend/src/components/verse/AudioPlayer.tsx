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
    <div className="flex items-center gap-3">
      <button
        onClick={handlePlayPause}
        className="flex items-center justify-center w-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors active:scale-95"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
      </button>
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={handleAudioEnd}
        className="flex-1"
      />
      <span className="text-sm text-gray-600">
        {isPlaying ? 'Playing...' : 'Tap to listen'}
      </span>
    </div>
  )
}
