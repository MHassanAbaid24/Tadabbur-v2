import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import PageWrapper from '../components/layout/PageWrapper'
import UserAvatar from '../components/ui/UserAvatar'
import { User as UserIcon, LogOut, Save, Bell, Camera, Loader2 } from 'lucide-react'

const MAX_SIZE_MB = 2
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function Profile() {
  const { user, updateProfile, logout, uploadAvatar } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [reminderTime, setReminderTime] = useState(user?.daily_reminder_time || '08:00')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      // Get HH:MM format from time string
      const timeStr = user.daily_reminder_time ? (user.daily_reminder_time as string).substring(0, 5) : '08:00'
      setReminderTime(timeStr)
    }
  }, [user])

  const handleAvatarClick = () => {
    if (!isUploadingAvatar) fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!e.target.files) return
    // Reset input so same file can be re-selected after an error
    e.target.value = ''

    if (!file) return
    setAvatarError(null)

    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarError('Invalid file type. Please use JPEG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setAvatarError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`)
      return
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)

    setIsUploadingAvatar(true)
    try {
      await uploadAvatar(file)
    } catch (err: any) {
      setAvatarPreview(null)
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Failed to upload avatar.'
      setAvatarError(msg)
    } finally {
      setIsUploadingAvatar(false)
      URL.revokeObjectURL(previewUrl)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      await updateProfile({
        display_name: displayName,
        daily_reminder_time: reminderTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      console.error('Update profile error:', err)
      const errorMsg = err.response?.data?.detail || 'Failed to update profile.'
      setMessage({ type: 'error', text: errorMsg })
    } finally {
      setIsSaving(false)
    }
  }

  const currentAvatar = avatarPreview || (user as any)?.avatar_url

  return (
    <PageWrapper>
      <div className="max-w-[600px] mx-auto space-y-8 py-8 fade-up">
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              className="hidden"
              onChange={handleFileChange}
            />
            
            <UserAvatar 
              avatarUrl={currentAvatar || undefined}
              username={user?.username}
              displayName={user?.display_name}
              size="xl"
              className="shadow-[0_4px_15px_rgba(184,146,42,0.1)]"
            />
            {/* Upload overlay */}
            {isUploadingAvatar && (
              <div className="absolute inset-x-0 inset-y-0 rounded-full bg-black/40 flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}

            <button
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 bg-ink p-[7px] rounded-full text-white border border-border shadow-md hover:bg-gold transition-colors disabled:opacity-60"
              title="Change profile photo"
            >
              <Camera size={14} />
            </button>
          </div>

          {/* Avatar error */}
          {avatarError && (
            <p className="font-sans text-[0.8rem] text-red-600 font-medium bg-red-50 px-4 py-2 rounded-[2px] border border-red-100 max-w-xs text-center">
              {avatarError}
            </p>
          )}

          <div className="text-center">
            <h1 className="font-cinzel text-[1.4rem] font-medium tracking-[0.06em] text-ink">{user?.display_name || user?.username}</h1>
            <p className="font-cinzel text-[0.7rem] tracking-[0.1em] text-muted uppercase mt-1">@{user?.username}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-[4px] border border-border flex items-center gap-4 hover:border-gold/30 transition-colors">
            <div className="p-2.5 bg-parchment/60 text-gold rounded-full border border-gold-light">
               <span className="font-cinzel text-[0.9rem] font-medium tracking-wide">LVL</span>
            </div>
            <div>
              <p className="font-cinzel text-[0.65rem] tracking-[0.14em] text-muted uppercase">Level</p>
              <p className="font-sans text-[1.2rem] font-bold text-ink">{user?.level || 1}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[4px] border border-border flex items-center gap-4 hover:border-gold/30 transition-colors">
            <div className="p-2.5 bg-green-light text-green rounded-full border border-green/20">
               <span className="font-cinzel text-[0.9rem] font-medium tracking-wide">EXP</span>
            </div>
            <div>
              <p className="font-cinzel text-[0.65rem] tracking-[0.14em] text-muted uppercase">Exp</p>
              <p className="font-sans text-[1.2rem] font-bold text-ink">{user?.xp || 0}</p>
            </div>
          </div>
        </div>

        {/* Form Sections */}
        <div className="bg-white rounded-[4px] border border-border overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="p-6 md:p-8 space-y-8">
            <div className="space-y-4">
              <h3 className="font-cinzel text-[0.9rem] tracking-[0.06em] text-ink font-medium flex items-center gap-3">
                <div className="bg-parchment/50 p-2 rounded-full border border-gold-faint">
                  <UserIcon size={14} className="text-gold" />
                </div>
                Personal Details
              </h3>
              <div className="space-y-3">
                <label className="block font-cinzel text-[0.7rem] tracking-[0.1em] uppercase text-ink">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-cream border border-border p-4 rounded-[2px] font-sans text-[0.95rem] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all disabled:opacity-60"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-border"></div>
              <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-border"></div>
            </div>

            <div className="space-y-4">
              <h3 className="font-cinzel text-[0.9rem] tracking-[0.06em] text-ink font-medium flex items-center gap-3">
                <div className="bg-parchment/50 p-2 rounded-full border border-gold-faint">
                  <Bell size={14} className="text-gold" />
                </div>
                Reminders
              </h3>
              <div className="space-y-3">
                <label className="block font-cinzel text-[0.7rem] tracking-[0.1em] uppercase text-ink">Daily Goal Time</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full bg-cream border border-border p-4 rounded-[2px] font-sans text-[0.95rem] text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all disabled:opacity-60"
                />
                <p className="font-sans text-[0.8rem] text-muted leading-relaxed">We'll send you a nudge at this time if you haven't reflected yet.</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 md:p-8 bg-parchment/20 border-t border-border flex flex-col gap-4">
             {message && (
               <div className={`p-4 rounded-[2px] font-sans text-[0.85rem] border animate-[fadeIn_0.3s_ease] ${message.type === 'success' ? 'bg-green-light text-green-mid border-green-mid' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                 <div className="flex items-center gap-2">
                   {message.type === 'success' && <div className="w-[6px] h-[6px] rounded-full bg-green" />}
                   {message.text}
                 </div>
               </div>
             )}
             <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-ink hover:bg-gold text-white font-cinzel text-[0.75rem] tracking-[0.14em] uppercase py-4 rounded-[2px] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:bg-ink"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-6 pb-2">
          <button
            onClick={logout}
            className="w-full bg-transparent border border-[#d9534f]/30 text-[#d9534f] hover:bg-[#d9534f]/5 font-cinzel text-[0.75rem] tracking-[0.14em] uppercase py-[0.9rem] rounded-[2px] transition-all duration-300 flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
          <p className="text-center font-cinzel text-[0.6rem] text-muted/60 mt-6 uppercase tracking-[0.2em]">Tadabbur v3.0</p>
        </div>
      </div>
    </PageWrapper>
  )
}
