// Master SQL Schema String for CBT TKA System
// This corresponds 1:1 with /supabase-schema.sql at the root

export const MASTER_SQL_SCHEMA = `-- ==============================================================================
-- MASTER DATABASE SCHEMA & SETUP FOR CBT TKA SYSTEM (SUPABASE / POSTGRESQL)
-- Versi: 1.0 (Skema Database Tunggal & Terpadu)
-- ==============================================================================
-- Petunjuk:
-- 1. Buka Supabase Dashboard -> SQL Editor
-- 2. Salin dan tempelkan seluruh isi file ini ke SQL Editor
-- 3. Klik "Run" (Jalankan)
-- ==============================================================================

-- 0. EKSTENSI (EXTENSIONS)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABEL PENGGUNA (USERS)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT DEFAULT '12345',
    role TEXT DEFAULT 'siswa', -- 'siswa', 'proktor', 'admin_sekolah', 'admin_kecamatan', 'admin_pusat'
    nama_lengkap TEXT,
    jenis_kelamin TEXT DEFAULT 'L',
    kelas_id TEXT,
    kecamatan TEXT,
    active_exam TEXT,
    session TEXT,
    photo_url TEXT,
    id_sekolah TEXT,
    id_gugus TEXT,
    id_kecamatan TEXT,
    id_paket TEXT,
    status TEXT DEFAULT 'OFFLINE',
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END $$;

-- 2. TABEL MATA UJIAN (EXAMS)
CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    nama_ujian TEXT NOT NULL,
    waktu_mulai TIMESTAMPTZ DEFAULT NOW(),
    durasi INTEGER DEFAULT 60,
    token_akses TEXT,
    is_active BOOLEAN DEFAULT true,
    max_questions INTEGER DEFAULT 0,
    id_sekolah TEXT,
    id_kecamatan TEXT,
    id_gelombang TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL BANK SOAL (QUESTIONS)
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    exam_id TEXT REFERENCES exams(id) ON DELETE CASCADE,
    text_soal TEXT NOT NULL,
    gambar TEXT,
    keterangan_gambar TEXT,
    tipe_soal TEXT DEFAULT 'PG',
    bobot_nilai NUMERIC DEFAULT 10,
    opsi_a TEXT,
    opsi_b TEXT,
    opsi_c TEXT,
    opsi_d TEXT,
    kunci_jawaban TEXT,
    id_paket TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL OPSI JAWABAN (OPTIONS)
CREATE TABLE IF NOT EXISTS options (
    id TEXT PRIMARY KEY,
    question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
    text_jawaban TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false
);

-- 5. TABEL KONFIGURASI SISTEM (CONFIG)
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 6. TABEL HASIL UJIAN SISWA (EXAM_RESULTS)
CREATE TABLE IF NOT EXISTS exam_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT REFERENCES users(username) ON DELETE CASCADE,
    exam_id TEXT,
    answers JSONB DEFAULT '{}'::jsonb,
    score NUMERIC(5,2) DEFAULT 0,
    start_time BIGINT,
    end_time BIGINT,
    status TEXT DEFAULT 'ongoing',
    current_question_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_results_username_exam_id_key') THEN
        ALTER TABLE exam_results ADD CONSTRAINT exam_results_username_exam_id_key UNIQUE (username, exam_id);
    END IF;
END $$;

-- 7. TABEL HASIL SURVEY (SURVEY_RESULTS)
CREATE TABLE IF NOT EXISTS survey_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT REFERENCES users(username) ON DELETE CASCADE,
    survey_type TEXT,
    answers JSONB DEFAULT '{}'::jsonb,
    start_time BIGINT,
    end_time BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL JADWAL & GELOMBANG SEKOLAH (SCHOOL_SCHEDULES)
CREATE TABLE IF NOT EXISTS school_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school TEXT NOT NULL,
    gelombang TEXT DEFAULT 'Gelombang 1',
    tanggal TEXT,
    tanggal_selesai TEXT,
    show_token BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_schedules_school_key') THEN
        ALTER TABLE school_schedules ADD CONSTRAINT school_schedules_school_key UNIQUE (school);
    END IF;
END $$;

-- 9. TABEL LOG AKTIVITAS (ACTIVITY_LOGS)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    subject TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_activity_users FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- 10. TABEL PENAMPUNGAN SEMENTARA (IMPORT CSV)
CREATE TABLE IF NOT EXISTS temp_scores (
    username TEXT,
    mapel TEXT,
    nilai TEXT
);

CREATE TABLE IF NOT EXISTS temp_exam_results (
    username TEXT,
    nama TEXT,
    kelas TEXT,
    mapel TEXT,
    nilai TEXT,
    durasi TEXT,
    analisis_json TEXT
);

-- 11. INDEX PERFORMA
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_kelas_id ON users(kelas_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_exam ON exam_results(username, exam_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_username ON activity_logs(username);
CREATE INDEX IF NOT EXISTS idx_school_schedules_school ON school_schedules(school);

-- 12. KEAMANAN & HAK AKSES (RLS & PERMISSIONS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_exam_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access" ON users;
DROP POLICY IF EXISTS "Public Access" ON exams;
DROP POLICY IF EXISTS "Public Access" ON questions;
DROP POLICY IF EXISTS "Public Access" ON options;
DROP POLICY IF EXISTS "Public Access" ON config;
DROP POLICY IF EXISTS "Public Access" ON exam_results;
DROP POLICY IF EXISTS "Public Access" ON survey_results;
DROP POLICY IF EXISTS "Public Access" ON school_schedules;
DROP POLICY IF EXISTS "Public Access" ON activity_logs;
DROP POLICY IF EXISTS "Public Access" ON temp_scores;
DROP POLICY IF EXISTS "Public Access" ON temp_exam_results;

CREATE POLICY "Public Access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON exam_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON survey_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON school_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON temp_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON temp_exam_results FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 13. SUPABASE REALTIME REPLICATION
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE users;
        ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
        ALTER PUBLICATION supabase_realtime ADD TABLE config;
        ALTER PUBLICATION supabase_realtime ADD TABLE exam_results;
        ALTER PUBLICATION supabase_realtime ADD TABLE school_schedules;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 14. DATA DEFAULT & INISIALISASI
INSERT INTO config (key, value) VALUES
('APP_NAME', 'CBT TKA'),
('TOKEN', 'H4XN3I'),
('DURATION', '60'),
('MAX_QUESTIONS', '30'),
('SURVEY_DURATION', '15'),
('SHOW_REKAP_TO_PROCTOR', 'FALSE'),
('ALLOW_PROCTOR_SESSION_EDIT', 'TRUE'),
('AUTO_TOKEN_STATUS', 'TRUE'),
('AUTO_SESSION_ACTIVATION', 'TRUE'),
('SESSION_1_START', '07:00'),
('SESSION_1_END', '12:30'),
('SESSION_1_STATUS', 'OFF'),
('SESSION_2_START', '08:30'),
('SESSION_2_END', '12:00'),
('SESSION_2_STATUS', 'OFF'),
('SESSION_3_START', '10:30'),
('SESSION_3_END', '11:30'),
('SESSION_3_STATUS', 'OFF'),
('SESSION_4_START', '11:30'),
('SESSION_4_END', '13:00'),
('SESSION_4_STATUS', 'OFF'),
('FOOTER_TEXT', '@2026 | Dev. MeyGa Team Computer Based Test System'),
('DEV_SHOW', 'TRUE'),
('DEV_NAME', 'Dedy Meyga Saputra,S.Pd, M.Pd'),
('DEV_PHOTO_URL', 'https://image2url.com/r2/default/images/1773090090347-b9338c54-e6fd-4b6c-a599-e82f8aca7eb4.jpg'),
('DEV_QUOTE', 'Tidak ada kata terlambat untuk belajar, kamu lakukan bisa dimanapun dan kapanpun')
ON CONFLICT (key) DO NOTHING;

INSERT INTO users (username, password, role, nama_lengkap, kelas_id, status)
VALUES ('admin', 'admin123', 'admin_pusat', 'Administrator Pusat', 'Pusat', 'OFFLINE')
ON CONFLICT (username) DO NOTHING;
`;
