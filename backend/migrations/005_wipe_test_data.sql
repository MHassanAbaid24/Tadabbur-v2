-- ============================================================================
-- MIGRATION: 005_wipe_test_data.sql
-- Purpose: Safely purge all user-generated and cached test data from Supabase
--          WITHOUT altering table schemas, RLS policies, indexes, or types.
--
-- WARNING: This is a DESTRUCTIVE action. Do NOT run this in a production
--          environment. Run only in local development or staging.
--
-- Instructions:
--   1. Open Supabase Dashboard → SQL Editor.
--   2. Copy and paste the contents of this file.
--   3. Run the SQL query to reset test data.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 1: Purge Supabase Auth Users
-- ----------------------------------------------------------------------------
-- Deleting from auth.users will automatically trigger cascading deletions
-- across the public schema tables due to defined foreign keys:
--   ✓ public.profiles (ON DELETE CASCADE)
--   ✓ public.reflections (ON DELETE CASCADE)
--   ✓ public.reflection_likes (ON DELETE CASCADE)
--   ✓ public.circle_members (ON DELETE CASCADE)
--   ✓ public.xp_events (ON DELETE CASCADE)
--   ✓ public.email_verification (ON DELETE CASCADE)
-- ----------------------------------------------------------------------------
DELETE FROM auth.users;

-- ----------------------------------------------------------------------------
-- STEP 2: Purge Reflection Circles
-- ----------------------------------------------------------------------------
-- Because public.circles.created_by has ON DELETE SET NULL, the circle objects
-- themselves persist even after the profiles that created them are deleted.
-- We must explicitly clear the circles table to complete the wipe.
-- ----------------------------------------------------------------------------
DELETE FROM public.circles;

-- ----------------------------------------------------------------------------
-- STEP 3: Purge Cached Daily Verse Logs
-- ----------------------------------------------------------------------------
-- Wipes all cached daily verses and lazy-generated reflection prompts so that
-- they will be fresh-generated and cached again upon next request.
-- ----------------------------------------------------------------------------
DELETE FROM public.daily_verse_log;

COMMIT;
