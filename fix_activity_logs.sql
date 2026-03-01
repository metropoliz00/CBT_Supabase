-- FIXED SCRIPT FOR ACTIVITY LOGS
-- Jalankan ini untuk membuat tabel log aktivitas dengan izin yang benar.

-- 1. Buat Tabel (Jika belum ada)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'LOGIN', 'START', 'FINISH', 'SURVEY'
    subject TEXT, -- Exam ID or Subject Name
    meta JSONB, -- Extra details
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Index (Agar cepat)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 3. Berikan Izin Akses (FIXED: Menggunakan GRANT ALL untuk service_role)
GRANT SELECT, INSERT ON activity_logs TO authenticated;
GRANT SELECT, INSERT ON activity_logs TO anon;
GRANT ALL ON activity_logs TO service_role;
