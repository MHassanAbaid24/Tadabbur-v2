-- ============================================================================
-- TADABBUR MASTER MIGRATION
-- Complete database schema with all tables, indexes, and RLS policies
-- Run this ONCE in Supabase SQL Editor after dropping all existing tables
-- ============================================================================

-- ============================================================================
-- CLEANUP: Drop existing tables (if any) to start fresh
-- ============================================================================

DROP TABLE IF EXISTS email_verification CASCADE;
DROP TABLE IF EXISTS xp_events CASCADE;
DROP TABLE IF EXISTS reflections CASCADE;
DROP TABLE IF EXISTS daily_verse_log CASCADE;
DROP TABLE IF EXISTS circle_members CASCADE;
DROP TABLE IF EXISTS circles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;


-- ============================================================================
-- TABLE 1: profiles
-- ============================================================================
-- Purpose: User profiles, extended auth metadata, QF OAuth2 tokens, progression data
-- Note: id is FK to auth.users(id) — managed by Supabase Auth
-- 
-- Key Design:
--   - qf_access_token: nullable because user may not have connected QF account yet
--   - qf_token_expires_at: timestamp when QF OAuth2 token expires (for refresh logic)
--   - xp, level: denormalized from xp_events for fast UI rendering
--   - daily_reminder_time: user's preferred daily notification time (nullable if not set)
--   - email_verified: tracks whether user has verified their email via OTP
--   - verification_status: pending/verified/blocked

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'blocked')),
  qf_access_token TEXT,
  qf_token_expires_at TIMESTAMPTZ,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  daily_reminder_time TIME,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);


-- ============================================================================
-- TABLE 2: circles
-- ============================================================================
-- Purpose: Reflection circles — groups of family/friends on the same verse
-- 
-- Key Design:
--   - qf_room_id: Quran Foundation Room ID (from POST /api/v1/rooms/groups)
--   - invite_code: UUID-based invite link (generated on creation)
--   - created_by: FK to profiles; ON DELETE SET NULL so circle persists if creator leaves

CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qf_room_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_circles_qf_room_id ON circles(qf_room_id);
CREATE INDEX idx_circles_invite_code ON circles(invite_code);
CREATE INDEX idx_circles_created_by ON circles(created_by);


-- ============================================================================
-- TABLE 3: circle_members
-- ============================================================================
-- Purpose: Join table between circles and profiles — tracks circle membership
-- 
-- Key Design:
--   - Composite PK (circle_id, user_id) ensures no duplicate memberships
--   - ON DELETE CASCADE: if circle deleted, memberships deleted
--   - ON DELETE CASCADE: if user deleted, their memberships deleted

CREATE TABLE circle_members (
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (circle_id, user_id)
);

CREATE INDEX idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX idx_circle_members_user_id ON circle_members(user_id);


-- ============================================================================
-- TABLE 4: daily_verse_log
-- ============================================================================
-- Purpose: Log of which verse is assigned to which day (deterministic verse rotation)
-- 
-- Key Design:
--   - date: PRIMARY KEY — one verse per day, globally
--   - verse_key: format "chapter:verse" (e.g., "2:255")
--   - chapter_number, verse_number: denormalized from verse_key for sorting/filtering
--   - This table is pre-populated or lazily-filled on first request each day

CREATE TABLE daily_verse_log (
  date DATE PRIMARY KEY,
  verse_key TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL
);

CREATE INDEX idx_daily_verse_log_verse_key ON daily_verse_log(verse_key);


-- ============================================================================
-- TABLE 5: reflections
-- ============================================================================
-- Purpose: User reflections on verses — journaled answers to reflection prompts
-- 
-- Key Design:
--   - UNIQUE(user_id, date): enforces one reflection per user per day
--   - qf_note_id: ID returned by QF Notes API (proves integration)
--   - qf_post_id: ID returned by QF Posts API (if shared to circle, proves integration)
--   - Both qf_note_id and qf_post_id are nullable until submitted to QF
--   - ai_action_suggestion: nullable if OpenRouter fails (graceful degradation)
--   - mood: CHECK constraint on allowed emotions
--   - ON DELETE CASCADE for user: if user deleted, their reflections deleted

CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verse_key TEXT NOT NULL,
  date DATE NOT NULL,
  prompt_1_answer TEXT,
  prompt_2_answer TEXT,
  mood TEXT CHECK (mood IN ('peaceful', 'grateful', 'hopeful', 'challenged', 'moved')),
  is_shared BOOLEAN DEFAULT FALSE,
  qf_note_id TEXT,
  qf_post_id TEXT,
  ai_action_suggestion TEXT,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_reflections_user_id ON reflections(user_id);
CREATE INDEX idx_reflections_date ON reflections(date);
CREATE INDEX idx_reflections_verse_key ON reflections(verse_key);
CREATE INDEX idx_reflections_is_shared ON reflections(is_shared);
CREATE INDEX idx_reflections_user_date ON reflections(user_id, date);


-- ============================================================================
-- TABLE 6: xp_events
-- ============================================================================
-- Purpose: Immutable log of XP-earning events for audit trail and analytics
-- 
-- Key Design:
--   - event_type: "reflection_complete", "share_circle", "react_post", "7day_streak", etc.
--   - Immutable: never updated, only inserted
--   - Used to calculate user.xp and user.level
--   - Enables historical analysis ("when did user reach level 3?")
--   - ON DELETE CASCADE: if user deleted, their XP history deleted

CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_events_user_id ON xp_events(user_id);
CREATE INDEX idx_xp_events_created_at ON xp_events(created_at);
CREATE INDEX idx_xp_events_event_type ON xp_events(event_type);


-- ============================================================================
-- TABLE 7: email_verification
-- ============================================================================
-- Purpose: Store OTP and verification state for email verification flow
-- 
-- Key Design:
--   - UNIQUE(user_id): only one pending verification per user at a time
--   - otp_code: hashed OTP using bcrypt (never store plaintext)
--   - otp_attempts: failed verification attempts (max 5 before block)
--   - verification_method: 'otp', 'magic_link', 'password_reset', 'invite' (extensible)
--   - verified_at: null until successful verification
--   - otp_resend_count: track resend attempts (max 3 per 10 minutes)
--   - expires_at: OTP expiration time (typically 10 minutes from otp_sent_at)
--   - password_hash: temporarily stores hashed password for registration flow
--   - display_name: temporarily stores display name for registration flow
--   - ON DELETE CASCADE: if user deleted, verification records deleted

CREATE TABLE email_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_code TEXT,
  otp_attempts INTEGER DEFAULT 0,
  verification_method TEXT NOT NULL CHECK (verification_method IN ('otp', 'magic_link', 'password_reset', 'invite')),
  verified_at TIMESTAMPTZ,
  otp_sent_at TIMESTAMPTZ DEFAULT NOW(),
  otp_last_resend_at TIMESTAMPTZ,
  otp_resend_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  password_hash TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_email_verification_user_id ON email_verification(user_id);
CREATE INDEX idx_email_verification_email ON email_verification(email);
CREATE INDEX idx_email_verification_method ON email_verification(verification_method);
CREATE INDEX idx_email_verification_verified_at ON email_verification(verified_at);
CREATE INDEX idx_email_verification_expires_at ON email_verification(expires_at);
CREATE INDEX idx_email_verification_password_hash ON email_verification(password_hash) WHERE password_hash IS NOT NULL;


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_verse_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- profiles table policies
-- ============================================================================

CREATE POLICY profiles_insert_own 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_select_own 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY profiles_update_own 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_service_role_all
ON profiles FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- circles table policies
-- ============================================================================

CREATE POLICY circles_select
ON circles FOR SELECT
USING (EXISTS (
  SELECT 1 FROM circle_members 
  WHERE circle_members.circle_id = circles.id 
  AND circle_members.user_id = auth.uid()
));

CREATE POLICY circles_update
ON circles FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY circles_delete
ON circles FOR DELETE
USING (auth.uid() = created_by);

CREATE POLICY circles_service_role_all
ON circles FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- circle_members table policies
-- ============================================================================

CREATE POLICY circle_members_select
ON circle_members FOR SELECT
USING (true);

CREATE POLICY circle_members_insert
ON circle_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY circle_members_service_role_all
ON circle_members FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- reflections table policies
-- ============================================================================

CREATE POLICY reflections_select_own
ON reflections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY reflections_insert_own
ON reflections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY reflections_update_own
ON reflections FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY reflections_service_role_all
ON reflections FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- xp_events table policies
-- ============================================================================

CREATE POLICY xp_events_select_own
ON xp_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY xp_events_service_role_all
ON xp_events FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- email_verification table policies
-- ============================================================================

CREATE POLICY email_verification_select_own
ON email_verification FOR SELECT
USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY email_verification_insert_own
ON email_verification FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY email_verification_update_own
ON email_verification FOR UPDATE
USING (auth.uid() = user_id OR auth.role() = 'service_role')
WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY email_verification_service_role_all
ON email_verification FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- daily_verse_log table policies
-- ============================================================================

CREATE POLICY daily_verse_log_select
ON daily_verse_log FOR SELECT
USING (true);

CREATE POLICY daily_verse_log_service_role_all
ON daily_verse_log FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this script, verify in Supabase Table Editor:
--   ✓ 7 tables created (profiles, circles, circle_members, daily_verse_log, reflections, xp_events, email_verification)
--   ✓ All indexes created
--   ✓ All RLS policies enabled
--   ✓ All foreign keys in place
--
-- Then restart backend and try registration.
