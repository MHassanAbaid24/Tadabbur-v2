import { Heart } from 'lucide-react'
import { CircleFeedItem } from '../../types/reflection'
import { useState, useEffect } from 'react'

interface CircleFeedProps {
  items: CircleFeedItem[]
  onLike?: (reflectionId: string, isUnlike: boolean) => void
}

const MOOD_EMOJI: Record<string, string> = {
  peaceful: '☮️',
  grateful: '🙏',
  hopeful: '🌅',
  challenged: '💪',
  moved: '🥹',
}

export default function CircleFeed({ items, onLike }: CircleFeedProps) {
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    const initialLiked = new Set<string>();
    items.forEach(item => {
      if (item.is_liked) initialLiked.add(item.reflection_id);
    });
    return initialLiked;
  });
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  // update likedIds when items change (e.g. initial load vs refetch)
  useEffect(() => {
    setLikedIds(() => {
      const next = new Set<string>();
      items.forEach(item => {
        if (item.is_liked) next.add(item.reflection_id);
      });
      return next;
    });
  }, [items]);


  const handleLike = async (reflectionId: string) => {
    if (loadingIds.has(reflectionId)) return;
    
    setLoadingIds((prev) => new Set(prev).add(reflectionId));
    const isUnlike = likedIds.has(reflectionId);
    
    try {
      if (isUnlike) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(reflectionId);
          return next;
        });
      } else {
        setLikedIds((prev) => new Set(prev).add(reflectionId));
      }
      
      if (onLike) {
        try {
          await onLike(reflectionId, isUnlike);
        } catch (e) {
          // Revert on error
          if (isUnlike) {
            setLikedIds((prev) => new Set(prev).add(reflectionId));
          } else {
            setLikedIds((prev) => {
              const next = new Set(prev);
              next.delete(reflectionId);
              return next;
            });
          }
        }
      }
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(reflectionId);
        return next;
      });
    }
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
          className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 space-y-4"
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

          {/* Answers */}
          <div className="space-y-6">
            {/* Verse Context */}
            {(item.verse_text || item.verse_translation) && (
              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/50">
                {item.verse_text && (
                  <p 
                    className="text-right text-lg font-arabic text-emerald-900 leading-loose mb-2" 
                    dir="rtl" 
                    translate="no"
                  >
                    {item.verse_text}
                  </p>
                )}
                {item.verse_translation && (
                  <p className="text-xs text-emerald-700 italic leading-relaxed">
                    "{item.verse_translation}"
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">
                  What does this ayah mean to you?
                </p>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {item.prompt_1_answer}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">
                  What will you do differently today?
                </p>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {item.prompt_2_answer}
                </p>
              </div>
            </div>
          </div>

          {/* Verse Reference */}
          <p className="text-xs font-medium text-gray-500">{item.verse_key}</p>

          {/* Like Button */}
          <button
            onClick={() => handleLike(item.reflection_id)}
            disabled={loadingIds.has(item.reflection_id)}
            className={`flex items-center gap-1.5 text-sm ${likedIds.has(item.reflection_id) ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'} disabled:opacity-50 transition-colors`}
          >
            <Heart
              size={16}
              className={likedIds.has(item.reflection_id) ? 'fill-emerald-600' : ''}
            />
            {item.likes_count && item.likes_count > 1 ? (
              <span className="font-medium">{item.likes_count}</span>
            ) : null}
            <span>{likedIds.has(item.reflection_id) ? 'Liked' : 'Like'}</span>
          </button>
        </div>
      ))}
    </div>
  )
}
