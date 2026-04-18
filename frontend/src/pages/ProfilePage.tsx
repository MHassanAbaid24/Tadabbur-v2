import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import PageWrapper from '../components/layout/PageWrapper'
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
        daily_reminder_time: reminderTime
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
    <PageWrapper className="bg-gradient-to-b from-cream-50 to-white pb-20">
      <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              className="hidden"
              onChange={handleFileChange}
            />
            
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
               {currentAvatar ? (
                  <img src={currentAvatar} alt={user?.username} className="w-full h-full object-cover" />
               ) : (
                  <span className="text-3xl font-bold text-emerald-700">
                    {user?.display_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
               )}
               {/* Upload overlay */}
               {isUploadingAvatar && (
                 <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                   <Loader2 size={20} className="text-white animate-spin" />
                 </div>
               )}
            </div>

            <button
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 bg-emerald-600 p-2 rounded-full text-white border-2 border-white shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-60"
              title="Change profile photo"
            >
              <Camera size={16} />
            </button>
          </div>

          {/* Avatar error */}
          {avatarError && (
            <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 max-w-xs text-center">
              {avatarError}
            </p>
          )}

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">{user?.display_name || user?.username}</h1>
            <p className="text-gray-500 text-sm">@{user?.username}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
               <span className="font-bold text-lg">Lvl</span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Level</p>
              <p className="font-bold text-gray-900">{user?.level || 1}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
               <span className="font-bold text-lg">XP</span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Exp</p>
              <p className="font-bold text-gray-900">{user?.xp || 0}</p>
            </div>
          </div>
        </div>

        {/* Form Sections */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <div className="bg-emerald-100 p-1.5 rounded-lg">
                  <UserIcon size={16} className="text-emerald-700" />
                </div>
                Personal Details
              </h3>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-xl p-3 focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium text-gray-900 outline-none"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <div className="bg-amber-100 p-1.5 rounded-lg">
                  <Bell size={16} className="text-amber-700" />
                </div>
                Reminders
              </h3>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">Daily Goal Time</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-xl p-3 focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium text-gray-900 outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-1 ml-1 font-medium">We'll send you a nudge at this time if you haven't reflected yet.</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50/50 flex flex-col gap-3">
             {message && (
               <div className={`p-4 rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                 <div className="flex items-center gap-2">
                   {message.type === 'success' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                   {message.text}
                 </div>
               </div>
             )}
             <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-emerald-600 text-white rounded-2xl py-4 font-bold shadow-lg shadow-emerald-200/50 hover:bg-emerald-700 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-4">
          <button
            onClick={logout}
            className="w-full bg-red-50 text-red-600 rounded-2xl py-4 font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100 shadow-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-[0.2em]">Tadabbur v3.0</p>
        </div>
      </div>
    </PageWrapper>
  )
}
