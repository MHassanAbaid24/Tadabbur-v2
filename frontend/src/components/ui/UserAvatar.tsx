import { useState } from 'react'

interface UserAvatarProps {
  avatarUrl?: string
  username?: string
  displayName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function UserAvatar({ 
  avatarUrl, 
  username, 
  displayName, 
  size = 'md',
  className = '' 
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false)
  
  const initial = (displayName || username || '?')[0].toUpperCase()
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-[0.8rem]',
    md: 'w-11 h-11 text-[1.1rem]',
    lg: 'w-16 h-16 text-[1.4rem]',
    xl: 'w-[100px] h-[100px] text-[2rem]'
  }
  
  const showImage = avatarUrl && !hasError
  
  return (
    <div className={`rounded-full bg-cream border border-border flex items-center justify-center text-gold font-cinzel font-medium overflow-hidden shadow-sm ${sizeClasses[size]} ${className}`}>
      {showImage ? (
        <img 
          src={avatarUrl} 
          alt={displayName || username} 
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        initial
      )}
    </div>
  )
}
