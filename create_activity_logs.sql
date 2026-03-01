-- Create activity_logs table for tracking user actions
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'LOGIN', 'START', 'FINISH', 'SURVEY'
    subject TEXT, -- Exam ID or Subject Name
    meta JSONB, -- Extra details
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Grant permissions (adjust based on your RLS policies, usually anon/authenticated needs insert/select)
GRANT SELECT, INSERT ON activity_logs TO authenticated;
GRANT SELECT, INSERT ON activity_logs TO anon;
GRANT SERVICE_ROLE ON activity_logs TO service_role;
