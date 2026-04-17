import { useState, useEffect } from 'react'
import { Copy, Check, X, Share2 } from 'lucide-react'

interface CircleInviteProps {
  inviteCode: string
  circleName: string
}

export default function CircleInvite({ inviteCode, circleName }: CircleInviteProps) {
  const [copied, setCopied] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const isDismissed = localStorage.getItem(`dismissed_invite_${inviteCode}`)
    if (isDismissed) {
      setDismissed(true)
    }
  }, [inviteCode])

  const inviteLink = `${window.location.origin}/circle/join/${inviteCode}`

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDismiss = () => {
    localStorage.setItem(`dismissed_invite_${inviteCode}`, 'true')
    setDismissed(true)
  }

  if (dismissed) {
    return (
      <div className="flex justify-end">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center w-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md transition-all active:scale-95"
          title="Copy invite link"
        >
          {copied ? <Check size={20} /> : <Share2 size={20} />}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-full p-1 transition-colors"
        title="Dismiss invite box"
      >
        <X size={16} />
      </button>

      <h3 className="font-semibold text-emerald-900 pr-6">Invite to {circleName}</h3>

      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={inviteLink}
          className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded text-xs font-mono text-gray-700"
        />
        <button
          onClick={handleCopy}
          className="flex items-center justify-center w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>

      <p className="text-xs text-emerald-700">
        {copied ? '✅ Copied!' : 'Share this link with your circle members.'}
      </p>
    </div>
  )
}
