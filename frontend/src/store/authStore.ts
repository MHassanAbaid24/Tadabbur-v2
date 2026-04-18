import { create } from 'zustand'
import type { User, AuthState, LoginRequest, RegisterRequest, AuthResponse } from '../types/user'
import api from '../lib/api'

const TOKEN_KEY = 'tadabbur_token'
const VERIFICATION_USER_ID_KEY = 'tadabbur_verification_user_id'
const VERIFICATION_EMAIL_KEY = 'tadabbur_verification_email'

export interface VerificationState {
  pendingUserId: string | null
  pendingEmail: string | null
  verificationStatus: 'idle' | 'pending' | 'verified' | 'failed'
  verificationMessage: string | null
}

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>
  initRegister: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<{ user_id: string; email: string }>
  verifyOTP: (otp: string) => Promise<void>
  resendOTP: () => Promise<void>
  getVerificationStatus: () => Promise<VerificationState>
  logout: () => void
  loadUser: () => Promise<void>
  setUser: (user: User | null) => void
  verification: VerificationState
  setVerification: (state: Partial<VerificationState>) => void
  clearVerification: () => void
  initiateQFOAuth: () => Promise<void>
  updateProfile: (data: any) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  verification: {
    pendingUserId: localStorage.getItem(VERIFICATION_USER_ID_KEY),
    pendingEmail: localStorage.getItem(VERIFICATION_EMAIL_KEY),
    verificationStatus: 'idle',
    verificationMessage: null,
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true })
      const response = await api.post<{ data: AuthResponse }>('/api/auth/login', {
        email,
        password,
      })

      const { access_token, user_id, username, display_name } = response.data.data

      // Store token in localStorage
      localStorage.setItem(TOKEN_KEY, access_token)

      // Update store
      const user: User = {
        id: user_id,
        username,
        display_name,
        xp: 0,
        level: 1,
        qf_connected: false,
      }

      set({
        token: access_token,
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  initRegister: async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => {
    try {
      set({ isLoading: true })
      const response = await api.post<{ data: { user_id: string; email: string; message: string } }>(
        '/api/auth/register',
        {
          email,
          password,
          username,
          display_name: displayName,
        }
      )

      const { user_id, email: registeredEmail, message } = response.data.data

      // Store verification state temporarily
      localStorage.setItem(VERIFICATION_USER_ID_KEY, user_id)
      localStorage.setItem(VERIFICATION_EMAIL_KEY, registeredEmail)

      // Update store
      set((state) => ({
        isLoading: false,
        verification: {
          ...state.verification,
          pendingUserId: user_id,
          pendingEmail: registeredEmail,
          verificationStatus: 'pending',
          verificationMessage: message,
        },
      }))

      return { user_id, email: registeredEmail }
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  verifyOTP: async (otp: string) => {
    try {
      set({ isLoading: true })
      const userId = get().verification.pendingUserId

      if (!userId) {
        throw new Error('No pending verification found')
      }

      const response = await api.post<{ data: AuthResponse }>('/api/auth/verify-otp', {
        user_id: userId,
        otp_code: otp,
      })

      const { access_token, user_id, username, display_name } = response.data.data

      // Clear verification from localStorage
      localStorage.removeItem(VERIFICATION_USER_ID_KEY)
      localStorage.removeItem(VERIFICATION_EMAIL_KEY)

      // Store token
      localStorage.setItem(TOKEN_KEY, access_token)

      // Update store
      const user: User = {
        id: user_id,
        username,
        display_name,
        xp: 0,
        level: 1,
        qf_connected: false,
      }

      set({
        token: access_token,
        user,
        isAuthenticated: true,
        isLoading: false,
        verification: {
          pendingUserId: null,
          pendingEmail: null,
          verificationStatus: 'verified',
          verificationMessage: 'Email verified successfully!',
        },
      })
    } catch (error) {
      set((state) => ({
        isLoading: false,
        verification: {
          ...state.verification,
          verificationStatus: 'failed',
          verificationMessage: error instanceof Error ? error.message : 'Verification failed',
        },
      }))
      throw error
    }
  },

  resendOTP: async () => {
    try {
      const userId = get().verification.pendingUserId

      if (!userId) {
        throw new Error('No pending verification found')
      }

      await api.post('/api/auth/resend-otp', {
        user_id: userId,
      })

      set((state) => ({
        verification: {
          ...state.verification,
          verificationMessage: 'OTP resent successfully. Check your email.',
        },
      }))
    } catch (error) {
      set((state) => ({
        verification: {
          ...state.verification,
          verificationMessage: error instanceof Error ? error.message : 'Failed to resend OTP',
        },
      }))
      throw error
    }
  },

  getVerificationStatus: async () => {
    try {
      const userId = get().verification.pendingUserId

      if (!userId) {
        return {
          pendingUserId: null,
          pendingEmail: null,
          verificationStatus: 'idle',
          verificationMessage: null,
        }
      }

      const response = await api.get(`/api/auth/verification-status/${userId}`)
      const status = response.data.data

      return {
        pendingUserId: userId,
        pendingEmail: get().verification.pendingEmail,
        verificationStatus: status.verified ? 'verified' : 'pending',
        verificationMessage: `OTP expires at ${status.expires_at}`,
      }
    } catch {
      return get().verification
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(VERIFICATION_USER_ID_KEY)
    localStorage.removeItem(VERIFICATION_EMAIL_KEY)
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      verification: {
        pendingUserId: null,
        pendingEmail: null,
        verificationStatus: 'idle',
        verificationMessage: null,
      },
    })
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) {
        set({ isLoading: false })
        return
      }

      const response = await api.get<{ data: User }>('/api/auth/me')
      const user = response.data.data

      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      // Token is invalid/expired
      localStorage.removeItem(TOKEN_KEY)
      set({ isLoading: false })
    }
  },

  setUser: (user: User | null) => {
    set({ user })
  },

  setVerification: (state: Partial<VerificationState>) => {
    set((current) => ({
      verification: {
        ...current.verification,
        ...state,
      },
    }))
  },

  clearVerification: () => {
    localStorage.removeItem(VERIFICATION_USER_ID_KEY)
    localStorage.removeItem(VERIFICATION_EMAIL_KEY)
    set({
      verification: {
        pendingUserId: null,
        pendingEmail: null,
        verificationStatus: 'idle',
        verificationMessage: null,
      },
    })
  },

  initiateQFOAuth: async () => {
    try {
      const response = await api.get<{ data: { authorization_url: string; state: string } }>(
        '/api/auth/qf/connect'
      )
      const { authorization_url } = response.data.data
      // Redirect to QF OAuth
      window.location.href = authorization_url
    } catch (error) {
      throw error
    }
  },

  updateProfile: async (data: any) => {
    try {
      set({ isLoading: true })
      const response = await api.put<{ data: any }>('/api/auth/profile', data)
      const updatedUser = response.data.data
      
      // Update local user state
      set((state) => ({
        user: state.user ? { ...state.user, ...updatedUser } : updatedUser,
        isLoading: false,
      }))
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<{ data: { avatar_url: string } }>(
      '/api/profile/avatar',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    const { avatar_url } = response.data.data
    set((state) => ({
      user: state.user ? { ...state.user, avatar_url } : state.user,
    }))
  },
}))

