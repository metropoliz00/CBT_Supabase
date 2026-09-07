-- ==============================================================================
-- MASTER DATABASE SCHEMA & SETUP FOR CBT TKA SYSTEM (SUPABASE / POSTGRESQL)
-- Versi: 1.0 (Skema Database Tunggal & Terpadu)
-- ==============================================================================
-- Petunjuk:
-- 1. Buka Supabase Dashboard -> SQL Editor
-- 2. Salin dan tempelkan seluruh isi file ini ke SQL Editor
-- 3. Klik "Run" (Jalankan)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. EKSTENSI (EXTENSIONS)
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TABEL PENGGUNA (USERS)
-- Menyimpan data peserta (siswa), proktor, admin sekolah, dan admin pusat.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT DEFAULT '12345',
    role TEXT DEFAULT 'siswa', -- 'siswa', 'proktor', 'admin_sekolah', 'admin_kecamatan', 'admin_pusat'
    nama_lengkap TEXT,
    jenis_kelamin TEXT DEFAULT 'L', -- 'L' (Laki-laki) / 'P' (Perempuan)
    kelas_id TEXT, -- Menyimpan Nama Sekolah / Kelas
    kecamatan TEXT,
    active_exam TEXT, -- ID Mapel / Ujian yang ditugaskan
    session TEXT, -- Sesi Ujian (contoh: 'Sesi 1', 'Sesi 2', 'Sesi 3', 'Sesi 4')
    photo_url TEXT, -- URL Foto Siswa
    id_sekolah TEXT, -- Kode Sekolah (contoh: 'S01')
    id_gugus TEXT, -- Kode Gugus (contoh: 'G01')
    id_kecamatan TEXT, -- Kode Kecamatan (contoh: 'KEC01')
    id_paket TEXT, -- Kode Paket Soal (contoh: 'PAKET-01')
    status TEXT DEFAULT 'OFFLINE', -- 'OFFLINE', 'ONLINE', 'WORKING', 'FINISHED', 'RESET'
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan username selalu unik
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABEL MATA UJIAN (EXAMS)
-- Menyimpan daftar mata pelajaran / tes / survey.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    nama_ujian TEXT NOT NULL,
    waktu_mulai TIMESTAMPTZ DEFAULT NOW(),
    durasi INTEGER DEFAULT 60, -- Durasi dalam menit
    token_akses TEXT,
    is_active BOOLEAN DEFAULT true,
    max_questions INTEGER DEFAULT 0, -- 0 = Semua soal
    id_sekolah TEXT,
    id_kecamatan TEXT,
    id_gelombang TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. TABEL BANK SOAL (QUESTIONS)
-- Menyimpan butir soal, opsi jawaban (A, B, C, D), kunci, bobot, dan gambar.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    exam_id TEXT REFERENCES exams(id) ON DELETE CASCADE,
    text_soal TEXT NOT NULL,
    gambar TEXT,
    keterangan_gambar TEXT,
    tipe_soal TEXT DEFAULT 'PG', -- 'PG' (Pilihan Ganda), 'PGK' (Kompleks), 'BS' (Benar Salah), 'LIKERT'
    bobot_nilai NUMERIC DEFAULT 10,
    opsi_a TEXT,
    opsi_b TEXT,
    opsi_c TEXT,
    opsi_d TEXT,
    kunci_jawaban TEXT,
    id_paket TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. TABEL OPSI JAWABAN (OPTIONS) - Opsional / Fleksibel
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS options (
    id TEXT PRIMARY KEY,
    question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
    text_jawaban TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false
);

-- ------------------------------------------------------------------------------
-- 5. TABEL KONFIGURASI SISTEM (CONFIG)
-- Menyimpan pengaturan global: token, status sesi, jam mulai/selesai, developer info.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- ------------------------------------------------------------------------------
-- 6. TABEL HASIL UJIAN SISWA (EXAM_RESULTS)
-- Menyimpan jawaban siswa, skor/nilai (desimal), durasi, dan waktu pengerjaan.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT REFERENCES users(username) ON DELETE CASCADE,
    exam_id TEXT,
    answers JSONB DEFAULT '{}'::jsonb,
    score NUMERIC(5,2) DEFAULT 0, -- Mendukung nilai desimal (contoh: 87.50)
    start_time BIGINT, -- Timestamp milidetik
    end_time BIGINT, -- Timestamp milidetik
    status TEXT DEFAULT 'ongoing', -- 'ongoing', 'completed'
    current_question_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan satu siswa hanya memiliki satu rekor per mata ujian (mencegah duplikasi data)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_results_username_exam_id_key') THEN
        ALTER TABLE exam_results ADD CONSTRAINT exam_results_username_exam_id_key UNIQUE (username, exam_id);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. TABEL HASIL SURVEY (SURVEY_RESULTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS survey_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT REFERENCES users(username) ON DELETE CASCADE,
    survey_type TEXT,
    answers JSONB DEFAULT '{}'::jsonb,
    start_time BIGINT,
    end_time BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. TABEL JADWAL & GELOMBANG SEKOLAH (SCHOOL_SCHEDULES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school TEXT NOT NULL,
    gelombang TEXT DEFAULT 'Gelombang 1',
    tanggal TEXT, -- Tanggal mulai (YYYY-MM-DD)
    tanggal_selesai TEXT, -- Tanggal selesai (YYYY-MM-DD)
    show_token BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan nama sekolah unik agar fitur "Atur Gelombang" memperbarui data sekolah yang ada
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_schedules_school_key') THEN
        ALTER TABLE school_schedules ADD CONSTRAINT school_schedules_school_key UNIQUE (school);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 9. TABEL LOG AKTIVITAS (ACTIVITY_LOGS)
-- Mencatat realtime feed aktivitas siswa (Login, Mulai Ujian, Selesai Ujian, Survey).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL,
    action TEXT NOT NULL, -- 'LOGIN', 'START', 'FINISH', 'SURVEY', 'RESET'
    subject TEXT, -- Nama Mapel / Kode Ujian
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_activity_users FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- ------------------------------------------------------------------------------
-- 10. TABEL PENAMPUNGAN SEMENTARA (TEMPORARY TABLES UNTUK IMPORT EXCEL/CSV)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 11. INDEX PERFORMA (PERFORMANCE INDEXES)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_kelas_id ON users(kelas_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_exam ON exam_results(username, exam_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_username ON activity_logs(username);
CREATE INDEX IF NOT EXISTS idx_school_schedules_school ON school_schedules(school);

-- ------------------------------------------------------------------------------
-- 12. KEAMANAN & HAK AKSES (ROW LEVEL SECURITY & PERMISSIONS)
-- ------------------------------------------------------------------------------
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

-- Buat Kebijakan Akses Penuh untuk Klien CBT (Anon & Authenticated)
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

-- Berikan izin GRANT ke role anon, authenticated, dan service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 13. SUPABASE REALTIME REPLICATION
-- Mengaktifkan sinkronisasi realtime pada tabel-tabel utama untuk live monitoring dashboard
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE users;
        ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
        ALTER PUBLICATION supabase_realtime ADD TABLE config;
        ALTER PUBLICATION supabase_realtime ADD TABLE exam_results;
        ALTER PUBLICATION supabase_realtime ADD TABLE school_schedules;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Abaikan jika tabel sudah terdaftar dalam publikasi realtime
    NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 14. DATA DEFAULT & INISIALISASI (INITIAL SEED DATA)
-- ------------------------------------------------------------------------------

-- Default Konfigurasi Sistem
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

-- Akun Administrator Utama Default
INSERT INTO users (username, password, role, nama_lengkap, kelas_id, status)
VALUES ('admin', 'admin123', 'admin_pusat', 'Administrator Pusat', 'Pusat', 'OFFLINE')
ON CONFLICT (username) DO NOTHING;

-- Data dummy log awal (opsional)
INSERT INTO activity_logs (username, action, subject, meta)
SELECT username, 'LOGIN', 'Sistem Diinisialisasi', '{"note": "Database initialized successfully"}'::jsonb
FROM users WHERE role = 'admin_pusat' LIMIT 1;

-- ==============================================================================
-- SELESAI: Database CBT TKA System Siap Digunakan!
-- ==============================================================================
