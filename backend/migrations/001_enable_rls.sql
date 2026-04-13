-- Enable Row Level Security on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own profile
CREATE POLICY profiles_insert_own 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Policy: Users can view their own profile
CREATE POLICY profiles_select_own 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY profiles_update_own 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Service role (backend) can do all operations for admin operations
CREATE POLICY profiles_service_role_all
ON profiles FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Enable RLS on other tables
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_verse_log ENABLE ROW LEVEL SECURITY;

-- Circles: Users can view all circles they're a member of
CREATE POLICY circles_select
ON circles FOR SELECT
USING (EXISTS (
  SELECT 1 FROM circle_members 
  WHERE circle_members.circle_id = circles.id 
  AND circle_members.user_id = auth.uid()
));

-- Circles: Only creator can update/delete
CREATE POLICY circles_update
ON circles FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY circles_delete
ON circles FOR DELETE
USING (auth.uid() = created_by);

-- Circle members: Users can view members of their circles
CREATE POLICY circle_members_select
ON circle_members FOR SELECT
USING (EXISTS (
  SELECT 1 FROM circle_members cm2
  WHERE cm2.circle_id = circle_members.circle_id 
  AND cm2.user_id = auth.uid()
));

-- Circle members: Users can insert themselves into circles
CREATE POLICY circle_members_insert
ON circle_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Reflections: Users can view their own reflections
CREATE POLICY reflections_select_own
ON reflections FOR SELECT
USING (auth.uid() = user_id);

-- Reflections: Users can insert their own reflections
CREATE POLICY reflections_insert_own
ON reflections FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Reflections: Users can update their own reflections
CREATE POLICY reflections_update_own
ON reflections FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- XP Events: Users can view their own XP events
CREATE POLICY xp_events_select_own
ON xp_events FOR SELECT
USING (auth.uid() = user_id);

-- Daily verse log: Anyone can read (public content)
CREATE POLICY daily_verse_log_select
ON daily_verse_log FOR SELECT
USING (true);

-- Service role bypass for all tables
CREATE POLICY bypass_service_role_profiles
ON profiles FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY bypass_service_role_circles
ON circles FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY bypass_service_role_circle_members
ON circle_members FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY bypass_service_role_reflections
ON reflections FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY bypass_service_role_xp_events
ON xp_events FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY bypass_service_role_daily_verse_log
ON daily_verse_log FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
