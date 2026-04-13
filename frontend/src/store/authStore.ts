import { create } from 'zustand'
import type { User, AuthState, LoginRequest, RegisterRequest, AuthResponse } from '../types/user'
import api from '../lib/api'

const TOKEN_KEY = 'tadabbur_token'

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string, displayName: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

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

  register: async (email: string, password: string, username: string, displayName: string) => {
    try {
      set({ isLoading: true })
      const response = await api.post<{ data: AuthResponse }>('/api/auth/register', {
        email,
        password,
        username,
        display_name: displayName,
      })

      const { access_token, user_id, username: returnedUsername, display_name } = response.data.data

      // Store token in localStorage
      localStorage.setItem(TOKEN_KEY, access_token)

      // Update store
      const user: User = {
        id: user_id,
        username: returnedUsername,
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

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
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
}))
