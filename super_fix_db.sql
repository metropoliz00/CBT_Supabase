-- SUPER FIX SCRIPT
-- Jalankan ini untuk memperbaiki semua masalah database sekaligus.

-- 1. Pastikan tabel users memiliki kolom status yang benar
ALTER TABLE users ALTER COLUMN status TYPE TEXT;
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'OFFLINE';

-- 2. Perbaiki Permissions (RLS) untuk Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON users;
CREATE POLICY "Public Access" ON users FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON users TO anon, authenticated, service_role;

-- 3. Perbaiki Tabel Activity Logs (Hapus dan Buat Ulang)
DROP TABLE IF EXISTS activity_logs;
CREATE TABLE activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    subject TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_logs_created ON activity_logs(created_at DESC);
GRANT ALL ON activity_logs TO anon, authenticated, service_role;

-- 4. Masukkan Data Dummy Log
INSERT INTO activity_logs (username, action, subject, meta)
SELECT username, 'LOGIN', NULL, '{"note": "System Init"}'::jsonb
FROM users LIMIT 1;

-- 5. Update status user yang 'null' menjadi 'OFFLINE'
UPDATE users SET status = 'OFFLINE' WHERE status IS NULL OR status = '';
