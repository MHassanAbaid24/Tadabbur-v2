import { useEffect, useState } from 'react'
import { useCircleStore } from '../../store/circleStore'
import { useAuthStore } from '../../store/authStore'
import { Loader2, Shield, UserMinus, UserPlus, X, LogOut, ShieldOff } from 'lucide-react'
import { motion } from 'framer-motion'

interface CircleMembersProps {
  onClose: () => void
}

export default function CircleMembers({ onClose }: CircleMembersProps) {
  const { members, isLoadingMembers, fetchMembers, makeAdmin, demoteAdmin, removeMember, circle } = useCircleStore()
  const { user } = useAuthStore()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const currentUserMember = members.find(m => m.user_id === user?.id)
  const isCurrentUserAdmin = currentUserMember?.is_admin
  const isCurrentUserCreator = currentUserMember?.is_creator

  const handleMakeAdmin = async (userId: string) => {
    if (!window.confirm('Make this member an admin? They will be able to manage other members.')) return
    setActionLoading(userId)
    try {
      await makeAdmin(userId)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDemoteAdmin = async (userId: string) => {
    if (!window.confirm('Remove admin status from this member?')) return
    setActionLoading(userId)
    try {
      await demoteAdmin(userId)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    const isSelf = userId === user?.id
    const message = isSelf 
      ? 'Are you sure you want to leave this circle?' 
      : 'Remove this member from the circle?'
      
    if (!window.confirm(message)) return
    
    setActionLoading(userId)
    try {
      await removeMember(userId)
      if (isSelf) onClose()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-w-md w-full mx-auto relative z-10"
    >
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          Circle Members
          <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
            {members.length}
          </span>
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
          <X size={20} />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {isLoadingMembers ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
            <Loader2 className="animate-spin" size={24} />
            <p className="text-sm">Loading members...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {members.map((member) => (
              <div 
                key={member.user_id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.display_name} className="w-full h-full object-cover" />
                    ) : (
                      member.display_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-900 text-sm">
                        {member.user_id === user?.id ? 'You' : member.display_name}
                      </span>
                      {member.is_admin && (
                        <Shield size={12} className="text-emerald-600 fill-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">@{member.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isCurrentUserCreator && member.user_id !== user?.id && member.is_admin && (
                    <button
                      onClick={() => handleDemoteAdmin(member.user_id)}
                      disabled={!!actionLoading}
                      title="Demote Admin"
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      <ShieldOff size={18} />
                    </button>
                  )}

                  {isCurrentUserAdmin && member.user_id !== user?.id && !member.is_admin && (
                    <button
                      onClick={() => handleMakeAdmin(member.user_id)}
                      disabled={!!actionLoading}
                      title="Make Admin"
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <UserPlus size={18} />
                    </button>
                  )}
                  
                  {(isCurrentUserAdmin || member.user_id === user?.id) && !member.is_creator && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={!!actionLoading}
                      title={member.user_id === user?.id ? 'Leave Circle' : 'Remove Member'}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      {actionLoading === member.user_id ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : member.user_id === user?.id ? (
                        <LogOut size={18} />
                      ) : (
                        <UserMinus size={18} />
                      )}
                    </button>
                  )}

                  {member.user_id === user?.id && member.is_creator && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={!!actionLoading}
                      title="Leave Circle"
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      {actionLoading === member.user_id ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <LogOut size={18} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
