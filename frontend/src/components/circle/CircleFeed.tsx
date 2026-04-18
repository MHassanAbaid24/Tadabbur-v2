import { Heart } from 'lucide-react'
import { CircleFeedItem } from '../../types/reflection'
import { useState, useEffect } from 'react'

interface CircleFeedProps {
  items: CircleFeedItem[]
  isLoading?: boolean
  onLike?: (reflectionId: string, isUnlike: boolean) => void
}

const MOOD_EMOJI: Record<string, string> = {
  supplication: '🤲',
  moved: '😢',
  peaceful: '😌',
  grateful: '🌿',
  thoughtful: '💭',
}

export default function CircleFeed({ items, isLoading, onLike }: CircleFeedProps) {
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

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-border p-6 rounded-[4px] shadow-sm flex flex-col gap-4 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-2 bg-parchment rounded w-24" />
                <div className="h-4 bg-parchment rounded w-32" />
              </div>
              <div className="w-8 h-8 rounded-full bg-parchment" />
            </div>
            <div className="space-y-3 pt-4 border-t border-border/50">
              <div className="h-3 bg-parchment rounded w-3/4" />
              <div className="h-3 bg-parchment rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-parchment/10 rounded-[4px] border border-border/50">
        <p className="font-cinzel text-[0.85rem] tracking-[0.05em] text-muted leading-relaxed">
          No shared reflections yet.<br />
          <span className="text-gold">Be the first to share your thoughts today!</span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <div
          key={item.reflection_id}
          className="bg-white border border-border p-5 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col gap-5 relative opacity-100 hover:border-gold transition-colors duration-300 group rounded-[4px]"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-cinzel text-[0.65rem] tracking-[0.14em] text-muted uppercase mb-1">
                {formatDate(item.created_at)}
              </p>
              <div className="flex items-center gap-[6px]">
                <p className="font-sans text-[0.95rem] font-medium text-ink">
                  {getFirstName(item.user_display_name)}
                </p>
              </div>
            </div>
            
            {item.mood && (
              <div className="flex items-center justify-center w-[32px] h-[32px] bg-parchment rounded-full text-[1.1rem] border border-border shadow-[0_2px_6px_rgba(184,146,42,0.15)] bg-opacity-70 backdrop-blur-sm relative z-10" title={item.mood}>
                {MOOD_EMOJI[item.mood] || ''}
              </div>
            )}
          </div>

          {/* Answers */}
          <div className="flex flex-col gap-6 pt-1 border-t border-border/50">
            {/* Verse Context */}
            {(item.verse_text || item.verse_translation) && (
              <div className="bg-green-light border-l-[3px] border-green p-4 pt-3">
                {item.verse_text && (
                  <p 
                    className="font-scheherazade text-[1.4rem] leading-[2] text-right text-green-mid mb-2" 
                    dir="rtl" 
                    translate="no"
                  >
                    {item.verse_text}
                  </p>
                )}
                {item.verse_translation && (
                  <p className="font-sans text-[0.85rem] leading-[1.6] text-ink-soft italic">
                    "{item.verse_translation}"
                  </p>
                )}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h4 className="font-cinzel text-[0.68rem] tracking-[0.1em] text-gold uppercase mb-2">What does this ayah mean?</h4>
                <p className="font-sans text-[0.95rem] leading-[1.6] text-ink whitespace-pre-wrap">
                  {item.prompt_1_answer}
                </p>
              </div>

              <div>
                <h4 className="font-cinzel text-[0.68rem] tracking-[0.1em] text-gold uppercase mb-2">What will you do differently?</h4>
                <p className="font-sans text-[0.95rem] leading-[1.6] text-ink whitespace-pre-wrap">
                  {item.prompt_2_answer}
                </p>
              </div>
            </div>
          </div>

          {/* Footer (Verse Ref + Like) */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <p className="font-cinzel text-[0.65rem] tracking-[0.14em] text-muted font-medium bg-parchment/60 px-2.5 py-1 rounded-[2px]">{item.verse_key}</p>

            <button
              onClick={() => handleLike(item.reflection_id)}
              disabled={loadingIds.has(item.reflection_id)}
              className={`flex items-center gap-[6px] font-cinzel text-[0.7rem] tracking-[0.1em] uppercase ${likedIds.has(item.reflection_id) ? 'text-green' : 'text-muted hover:text-gold'} disabled:opacity-50 transition-colors`}
            >
              <Heart
                size={15}
                className={likedIds.has(item.reflection_id) ? 'fill-green' : ''}
              />
              <div className="flex items-center gap-1">
                {item.likes_count && item.likes_count > 0 ? (
                  <span className="font-sans font-medium">{likedIds.has(item.reflection_id) && !item.is_liked ? item.likes_count + 1 : !likedIds.has(item.reflection_id) && item.is_liked ? item.likes_count - 1 : item.likes_count}</span>
                ) : (
                  likedIds.has(item.reflection_id) && !item.is_liked ? <span className="font-sans font-medium">1</span> : null
                )}
                <span className="hidden sm:inline">{likedIds.has(item.reflection_id) ? 'Liked' : 'Like'}</span>
              </div>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
