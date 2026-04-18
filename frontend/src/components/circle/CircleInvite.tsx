import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'

interface CircleInviteProps {
  inviteCode: string
  circleName: string
}

export default function CircleInvite({ inviteCode }: CircleInviteProps) {
  const [copied, setCopied] = useState(false)

  const inviteLink = `${window.location.origin}/circle/join/${inviteCode}`

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border font-cinzel text-[0.7rem] sm:text-[0.75rem] tracking-[0.12em] uppercase rounded-[2px] transition-all duration-300 ${
          copied 
            ? 'bg-gold text-white border-gold shadow-md' 
            : 'bg-transparent border-gold-light text-gold hover:bg-gold-faint'
        }`}
        title="Copy invite link"
      >
        {copied ? (
          <>
            <Check size={16} />
            <span className="font-medium">Copied</span>
          </>
        ) : (
          <>
            <Share2 size={16} />
            <span className="font-medium">Share</span>
          </>
        )}
      </button>
    </div>
  )
}

