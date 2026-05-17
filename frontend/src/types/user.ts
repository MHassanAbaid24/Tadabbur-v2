/** User-related types for authentication and profile data. */

export interface User {
  id: string
  username: string
  display_name: string
  xp: number
  level: number
  qf_connected: boolean
  onboarded: boolean
  avatar_url?: string
  daily_reminder_time?: string
  timezone?: string
  reminders_enabled?: boolean
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  username: string
  display_name: string
}

export interface AuthResponse {
  access_token: string
  user_id: string
  username: string
  display_name: string
  onboarded: boolean
}
