/** Verse-related types for Quranic content. */

export interface Verse {
  verse_key: string
  text_uthmani: string
  translation: string
  tafsir: string
  audio_url: string | null
}
