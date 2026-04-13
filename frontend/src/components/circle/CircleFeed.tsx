import { Heart } from 'lucide-react'
import { CircleFeedItem } from '../../types/reflection'
import { useState } from 'react'

interface CircleFeedProps {
  items: CircleFeedItem[]
  onLike?: (reflectionId: string) => void
}

const MOOD_EMOJI: Record<string, string> = {
  peaceful: '☮️',
  grateful: '🙏',
  hopeful: '🌅',
  challenged: '💪',
  moved: '🥹',
}

export default function CircleFeed({ items, onLike }: CircleFeedProps) {
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  const handleLike = async (reflectionId: string) => {
    if (likedIds.has(reflectionId)) return
    setLikedIds((prev) => new Set(prev).add(reflectionId))
    onLike?.(reflectionId)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0]
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-sm">
          No shared reflections yet. Be the first to share!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.reflection_id}
          className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 text-sm">
                {getFirstName(item.user_display_name)}
              </p>
              {item.mood && (
                <span className="text-lg">
                  {MOOD_EMOJI[item.mood] || ''}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
          </div>

          {/* Preview */}
          <p className="text-gray-700 text-sm leading-relaxed">
            {item.prompt_1_preview.length > 200
              ? `${item.prompt_1_preview.substring(0, 200)}...`
              : item.prompt_1_preview}
          </p>

          {/* Verse Reference */}
          <p className="text-xs font-medium text-gray-500">{item.verse_key}</p>

          {/* Like Button */}
          <button
            onClick={() => handleLike(item.reflection_id)}
            disabled={likedIds.has(item.reflection_id)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-emerald-600 disabled:opacity-50 transition-colors"
          >
            <Heart
              size={16}
              className={likedIds.has(item.reflection_id) ? 'fill-emerald-600' : ''}
            />
            <span>Like</span>
          </button>
        </div>
      ))}
    </div>
  )
}
