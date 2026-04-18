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
      className="bg-white rounded-[4px] border border-border shadow-xl overflow-hidden max-w-[480px] w-full mx-auto relative z-10"
    >
      <div className="p-5 border-b border-border flex items-center justify-between bg-parchment/30">
        <h3 className="font-cinzel text-[1rem] tracking-[0.06em] text-ink font-medium flex items-center gap-3">
          Circle Members
          <span className="font-sans text-[0.75rem] font-medium text-gold bg-gold-faint px-2.5 py-0.5 rounded-[2px] border border-gold/20">
            {members.length}
          </span>
        </h3>
        <button onClick={onClose} className="text-muted hover:text-gold transition-colors p-1">
          <X size={20} />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
        {isLoadingMembers ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted gap-3">
             <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="font-cinzel text-[0.7rem] tracking-[0.1em] uppercase">Loading members...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div 
                key={member.user_id}
                className="flex items-center justify-between p-3 rounded-[2px] hover:bg-parchment/40 transition-colors border border-transparent hover:border-gold/20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-cream border border-border flex items-center justify-center text-gold font-cinzel font-medium text-[1.1rem] overflow-hidden shadow-sm">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.display_name} className="w-full h-full object-cover" />
                    ) : (
                      member.display_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-sans text-[0.95rem] font-medium text-ink leading-none">
                        {member.user_id === user?.id ? 'You' : member.display_name}
                      </span>
                      {member.is_admin && (
                        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-gold-faint text-gold" title="Admin">
                          <Shield size={10} className="fill-gold" />
                        </div>
                      )}
                    </div>
                    <p className="font-cinzel text-[0.65rem] tracking-[0.1em] text-muted uppercase">@{member.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-4">
                  {isCurrentUserCreator && member.user_id !== user?.id && member.is_admin && (
                    <button
                      onClick={() => handleDemoteAdmin(member.user_id)}
                      disabled={!!actionLoading}
                      title="Demote Admin"
                      className="p-2 text-muted hover:text-amber-600 hover:bg-amber-50 rounded-[2px] transition-colors"
                    >
                       {actionLoading === member.user_id ? (
                        <div className="w-4 h-4 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                      ) : (
                        <ShieldOff size={16} />
                      )}
                    </button>
                  )}

                  {isCurrentUserAdmin && member.user_id !== user?.id && !member.is_admin && (
                    <button
                      onClick={() => handleMakeAdmin(member.user_id)}
                      disabled={!!actionLoading}
                      title="Make Admin"
                      className="p-2 text-muted hover:text-gold hover:bg-gold-faint rounded-[2px] transition-colors"
                    >
                      {actionLoading === member.user_id ? (
                        <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      ) : (
                        <UserPlus size={16} />
                      )}
                    </button>
                  )}
                  
                  {(isCurrentUserAdmin || member.user_id === user?.id) && !member.is_creator && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={!!actionLoading}
                      title={member.user_id === user?.id ? 'Leave Circle' : 'Remove Member'}
                      className="p-2 text-muted hover:text-red-700 hover:bg-red-50 rounded-[2px] transition-colors"
                    >
                      {actionLoading === member.user_id ? (
                        <div className="w-4 h-4 border-2 border-red-700/30 border-t-red-700 rounded-full animate-spin" />
                      ) : member.user_id === user?.id ? (
                        <LogOut size={16} />
                      ) : (
                        <UserMinus size={16} />
                      )}
                    </button>
                  )}

                  {member.user_id === user?.id && member.is_creator && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={!!actionLoading}
                      title="Leave Circle"
                      className="p-2 text-muted hover:text-red-700 hover:bg-red-50 rounded-[2px] transition-colors"
                    >
                      {actionLoading === member.user_id ? (
                        <div className="w-4 h-4 border-2 border-red-700/30 border-t-red-700 rounded-full animate-spin" />
                      ) : (
                        <LogOut size={16} />
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
