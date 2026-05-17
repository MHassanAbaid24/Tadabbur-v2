-- ============================================================================
-- MIGRATION 004: ADD ONBOARDED TO PROFILES
-- Purpose: Persist user onboarding status to Supabase database profiles.
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT FALSE;
