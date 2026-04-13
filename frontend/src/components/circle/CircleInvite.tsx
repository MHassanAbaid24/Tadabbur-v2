import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CircleInviteProps {
  inviteCode: string
  circleName: string
}

export default function CircleInvite({ inviteCode, circleName }: CircleInviteProps) {
  const [copied, setCopied] = useState(false)

  const inviteLink = `${window.location.origin}/circle/join/${inviteCode}`

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-emerald-900">Invite to {circleName}</h3>

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
