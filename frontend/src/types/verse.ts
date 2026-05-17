/** Verse-related types for Quranic content. */

export interface Verse {
  verse_key: string
  text_uthmani: string
  translation: string
  tafsir: string
  audio_url: string | null
  prompt_1?: string
  prompt_2?: string
}

export interface Chapter {
  id: number
  revelation_place: string
  revelation_order: number
  bismillah_pre: boolean
  name_simple: string
  name_complex: string
  name_arabic: string
  verses_count: number
  pages: number[]
}

export interface VerseListItem {
  id: number
  verse_number: number
  verse_key: string
  text_uthmani: string
  translation: string
}
