-- ============================================================================
-- MIGRATION 003: ADD LIKES TRACKING
-- Purpose: Track user likes on reflections to enable local persistence, sorting, 
-- and fetching counts efficiently without querying external APIs.
-- ============================================================================

CREATE TABLE IF NOT EXISTS reflection_likes (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reflection_id UUID NOT NULL REFERENCES reflections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, reflection_id)
);

CREATE INDEX idx_reflection_likes_reflection_id ON reflection_likes(reflection_id);
CREATE INDEX idx_reflection_likes_user_id ON reflection_likes(user_id);

-- Enable RLS
ALTER TABLE reflection_likes ENABLE ROW LEVEL SECURITY;

-- Everyone can read likes
CREATE POLICY reflection_likes_select_all
ON reflection_likes FOR SELECT
USING (true);

-- A user can only insert/like if they are the authenticated user
CREATE POLICY reflection_likes_insert_own
ON reflection_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- A user can only delete/unlike if they are the authenticated user
CREATE POLICY reflection_likes_delete_own
ON reflection_likes FOR DELETE
USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY reflection_likes_service_role_all
ON reflection_likes FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
