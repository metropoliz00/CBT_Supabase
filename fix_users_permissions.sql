-- FIX PERMISSIONS FOR USERS TABLE
-- Ensure anon user can read all users data for dashboard
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any to avoid conflict
DROP POLICY IF EXISTS "Allow public read access" ON users;
DROP POLICY IF EXISTS "Allow authenticated read access" ON users;
DROP POLICY IF EXISTS "Allow anon read access" ON users;
DROP POLICY IF EXISTS "Allow public update access" ON users;

-- Create new policy allowing SELECT for everyone (anon and authenticated)
CREATE POLICY "Allow public read access" ON users FOR SELECT USING (true);

-- Also ensure update is allowed for login status
CREATE POLICY "Allow public update access" ON users FOR UPDATE USING (true);

-- Grant permissions explicitly
GRANT SELECT, UPDATE ON users TO anon;
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT ALL ON users TO service_role;
