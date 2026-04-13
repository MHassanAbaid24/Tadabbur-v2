/** Reflection-related types for daily reflections and submissions. */

export interface Reflection {
  id: string
  verse_key: string
  date: string
  prompt_1_answer: string
  prompt_2_answer: string
  mood: Mood | null
  is_shared: boolean
  qf_note_id: string | null
  ai_action_suggestion: string | null
  xp_earned: number
}

export type Mood = 'peaceful' | 'grateful' | 'hopeful' | 'challenged' | 'moved'

export interface ReflectionSubmitRequest {
  verse_key: string
  prompt_1_answer: string
  prompt_2_answer: string
  mood: Mood | null
  is_shared: boolean
  circle_id?: string
}

export interface ReflectionResponse {
  id: string
  verse_key: string
  date: string
  mood: Mood | null
  is_shared: boolean
  qf_note_id: string | null
  qf_post_id: string | null
  ai_action_suggestion: string | null
  xp_earned: number
}

export interface CircleFeedItem {
  reflection_id: string
  user_display_name: string
  mood: Mood
  prompt_1_preview: string
  verse_key: string
  created_at: string
  likes_count?: number
  is_liked?: boolean
}
