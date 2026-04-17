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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm font-medium ${
          copied 
            ? 'bg-emerald-100 text-emerald-700 w-24 justify-center' 
            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
        }`}
        title="Copy invite link"
      >
        {copied ? (
          <>
            <Check size={16} />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Share2 size={16} />
            <span>Share</span>
          </>
        )}
      </button>
    </div>
  )
}

