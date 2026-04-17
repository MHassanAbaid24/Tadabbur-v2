-- Migration: Add missing RLS INSERT/UPDATE policies for reflections and xp_events
-- Purpose: Fix reflection submission errors (RLS policy violations)
-- Run this if you already have the schema but are missing these policies

-- Drop existing incomplete policies (if they exist - avoids conflicts)
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS reflections_insert_own ON reflections;
DROP POLICY IF EXISTS reflections_update_own ON reflections;
DROP POLICY IF EXISTS xp_events_insert_own ON xp_events;

-- Profiles INSERT policy: allow users to create their own profile
CREATE POLICY profiles_insert_own ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Profiles UPDATE policy: allow users to update their own profile
CREATE POLICY profiles_update_own ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Reflections INSERT policy: allow users to insert their own reflections
CREATE POLICY reflections_insert_own ON reflections FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Reflections UPDATE policy: allow users to update their own reflections
CREATE POLICY reflections_update_own ON reflections FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- XP Events INSERT policy: allow users to insert their own XP events
CREATE POLICY xp_events_insert_own ON xp_events FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Verify policies were created
-- Run this query to confirm:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('profiles', 'reflections', 'xp_events');

