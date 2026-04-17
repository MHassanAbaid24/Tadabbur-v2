-- Tadabbur PostgreSQL Database Schema
-- Supabase Migration File
-- Run this entire file in Supabase SQL Editor

-- ============================================================================
-- DROP TABLES (with CASCADE for development/re-runs)
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

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,  -- Whether user has verified their email
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'blocked')),  -- Email verification status
  qf_access_token TEXT,  -- Encrypted in prod; nullable (user may not connect QF)
  qf_token_expires_at TIMESTAMPTZ,  -- When per-user QF token expires
  xp INTEGER DEFAULT 0,  -- Total XP earned (denormalized from xp_events)
  level INTEGER DEFAULT 1,  -- User level 1-5 based on XP thresholds
  daily_reminder_time TIME,  -- User's preferred daily reflection reminder (nullable)
  timezone TEXT DEFAULT 'UTC',  -- User's timezone for notifications
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profiles
-- username: used in WHERE clauses (auth, lookups)
CREATE UNIQUE INDEX idx_profiles_username ON profiles(username);
-- id: already covered by PRIMARY KEY, but used in JOINs frequently
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
  qf_room_id TEXT UNIQUE NOT NULL,  -- QF Room ID (proves QF API integration)
  name TEXT NOT NULL,  -- Circle name (e.g., "Family", "Mosque Study Group")
  invite_code TEXT UNIQUE NOT NULL,  -- UUID for shareable invite link
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- Creator may leave circle
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for circles
CREATE INDEX idx_circles_qf_room_id ON circles(qf_room_id);
CREATE INDEX idx_circles_invite_code ON circles(invite_code);  -- Used when joining by code
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

-- Indexes for circle_members
-- circle_id: used in WHERE clauses (find members of a circle)
CREATE INDEX idx_circle_members_circle_id ON circle_members(circle_id);
-- user_id: used in WHERE clauses (find circles a user belongs to)
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
  date DATE PRIMARY KEY,  -- UTC date (YYYY-MM-DD)
  verse_key TEXT NOT NULL,  -- Format: "chapter:verse"
  chapter_number INTEGER NOT NULL,  -- For sorting/filtering
  verse_number INTEGER NOT NULL  -- For sorting/filtering
);

-- Indexes for daily_verse_log
-- date: already covered by PRIMARY KEY (used in WHERE for "today's verse")
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
  verse_key TEXT NOT NULL,  -- Reference to verse (format: "chapter:verse")
  date DATE NOT NULL,  -- Date of reflection (UTC)
  prompt_1_answer TEXT,  -- "What does this ayah mean to you...?"
  prompt_2_answer TEXT,  -- "What will you do differently...?"
  mood TEXT CHECK (mood IN ('peaceful', 'grateful', 'hopeful', 'challenged', 'moved')),
  is_shared BOOLEAN DEFAULT FALSE,  -- Whether shared to circle
  qf_note_id TEXT,  -- QF Notes API ID (nullable until submitted)
  qf_post_id TEXT,  -- QF Posts API ID (nullable unless is_shared=true)
  ai_action_suggestion TEXT,  -- AI-generated action suggestion (nullable if API fails)
  xp_earned INTEGER DEFAULT 0,  -- XP awarded for this reflection
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)  -- One reflection per user per day
);

-- Indexes for reflections
-- user_id: used in WHERE (get user's reflections), JOINs
CREATE INDEX idx_reflections_user_id ON reflections(user_id);
-- date: used in WHERE (get reflections for a date range), sorting
CREATE INDEX idx_reflections_date ON reflections(date);
-- verse_key: used in WHERE (get all reflections for a verse)
CREATE INDEX idx_reflections_verse_key ON reflections(verse_key);
-- is_shared: used in WHERE (filter for circle feed — only shared=true)
CREATE INDEX idx_reflections_is_shared ON reflections(is_shared);
-- Combined index for common query: (user_id, date) for uniqueness check
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
  event_type TEXT NOT NULL,  -- Type of XP-earning event
  xp_amount INTEGER NOT NULL,  -- XP awarded (always positive)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for xp_events
-- user_id: used in WHERE (get XP events for a user)
CREATE INDEX idx_xp_events_user_id ON xp_events(user_id);
-- created_at: used for sorting (newest first) and time-range queries
CREATE INDEX idx_xp_events_created_at ON xp_events(created_at);
-- event_type: used for filtering by event type (analytics)
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
--   - ON DELETE CASCADE: if user deleted, verification records deleted

CREATE TABLE email_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,  -- Email being verified
  otp_code TEXT,  -- Hashed OTP code (nullable for non-OTP methods like magic_link)
  otp_attempts INTEGER DEFAULT 0,  -- Failed verification attempts
  verification_method TEXT NOT NULL CHECK (verification_method IN ('otp', 'magic_link', 'password_reset', 'invite')),
  verified_at TIMESTAMPTZ,  -- When verification succeeded (null if not verified)
  otp_sent_at TIMESTAMPTZ DEFAULT NOW(),  -- When OTP was sent
  otp_last_resend_at TIMESTAMPTZ,  -- Last time OTP was resent
  otp_resend_count INTEGER DEFAULT 0,  -- Number of times user requested new OTP
  expires_at TIMESTAMPTZ,  -- When OTP expires (usually otp_sent_at + 10 min)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)  -- One pending verification per user
);

-- Indexes for email_verification
-- user_id: used in WHERE (check if user has pending verification)
CREATE INDEX idx_email_verification_user_id ON email_verification(user_id);
-- email: used for lookup during verification process
CREATE INDEX idx_email_verification_email ON email_verification(email);
-- verification_method: used for filtering by method type
CREATE INDEX idx_email_verification_method ON email_verification(verification_method);
-- verified_at: used to find verified users
CREATE INDEX idx_email_verification_verified_at ON email_verification(verified_at);
-- expires_at: used to find expired OTPs for cleanup
CREATE INDEX idx_email_verification_expires_at ON email_verification(expires_at);


-- ============================================================================
-- FINAL SETUP: RLS POLICIES
-- ============================================================================

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_verse_log ENABLE ROW LEVEL SECURITY;

-- Non-recursive circle_members SELECT policy
-- (Avoids infinite recursion by not querying circle_members in the USING clause)
CREATE POLICY circle_members_select ON circle_members FOR SELECT USING (true);

-- Other basic policies
CREATE POLICY circles_select ON circles FOR SELECT USING (true);
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (auth.uid() = id);

-- Profiles INSERT policy: allow users to create their own profile
CREATE POLICY profiles_insert_own ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Profiles UPDATE policy: allow users to update their own profile
CREATE POLICY profiles_update_own ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY reflections_select_own ON reflections FOR SELECT USING (auth.uid() = user_id);

-- Reflections INSERT policy: allow users to insert their own reflections
CREATE POLICY reflections_insert_own ON reflections FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Reflections UPDATE policy: allow users to update their own reflections
CREATE POLICY reflections_update_own ON reflections FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- XP Events INSERT policy: allow users to insert their own XP events (when backend awards XP)
CREATE POLICY xp_events_insert_own ON xp_events FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- NOTES FOR VERIFICATION
-- ============================================================================
-- Run this in Supabase SQL Editor. Verify each table in the Table Editor after running.
--
-- Expected results:
--   ✓ 7 tables created (profiles, circles, circle_members, daily_verse_log, reflections, xp_events, email_verification)
--   ✓ 20+ indexes created (one per critical column)
--   ✓ All foreign keys with ON DELETE clauses
--   ✓ UNIQUE constraints on profiles(username), reflections(user_id, date), email_verification(user_id)
--   ✓ CHECK constraints on reflections(mood) and email_verification(verification_method)
--
-- If any errors occur, check:
--   1. Auth.users table exists (required by Supabase)
--   2. auth.users(id) is UUID type
--   3. All foreign keys reference valid tables
