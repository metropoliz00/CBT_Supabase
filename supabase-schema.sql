-- Supabase Schema for CBT System

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT,
  role TEXT DEFAULT 'siswa',
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
  status TEXT DEFAULT 'OFFLINE', -- OFFLINE, ONLINE, EXAM, FINISHED
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Exams Table
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  nama_ujian TEXT NOT NULL,
  waktu_mulai TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  durasi INTEGER DEFAULT 60,
  token_akses TEXT,
  is_active BOOLEAN DEFAULT true,
  max_questions INTEGER DEFAULT 0,
  id_sekolah TEXT,
  id_kecamatan TEXT,
  id_gelombang TEXT
);

-- 3. Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  exam_id TEXT REFERENCES exams(id) ON DELETE CASCADE,
  text_soal TEXT NOT NULL,
  gambar TEXT,
  keterangan_gambar TEXT,
  tipe_soal TEXT DEFAULT 'PG',
  bobot_nilai INTEGER DEFAULT 10,
  opsi_a TEXT,
  opsi_b TEXT,
  opsi_c TEXT,
  opsi_d TEXT,
  kunci_jawaban TEXT,
  id_paket TEXT
);

-- 4. Options Table (Optional if you use opsi_a, b, c, d in questions, but for flexibility)
CREATE TABLE IF NOT EXISTS options (
  id TEXT PRIMARY KEY,
  question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
  text_jawaban TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false
);

-- 5. Config Table
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Insert default configs
INSERT INTO config (key, value) VALUES 
('TOKEN', '12345'),
('DURATION', '60'),
('SURVEY_DURATION', '30'),
('MAX_QUESTIONS', '0')
ON CONFLICT (key) DO NOTHING;

-- 6. Exam Progress / Results Table
CREATE TABLE IF NOT EXISTS exam_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT REFERENCES users(username) ON DELETE CASCADE,
  exam_id TEXT,
  answers JSONB,
  score INTEGER DEFAULT 0,
  start_time BIGINT,
  end_time BIGINT,
  status TEXT DEFAULT 'ongoing',
  current_question_index INTEGER DEFAULT 0
);

-- 7. Survey Results Table
CREATE TABLE IF NOT EXISTS survey_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT REFERENCES users(username) ON DELETE CASCADE,
  survey_type TEXT,
  answers JSONB,
  start_time BIGINT,
  end_time BIGINT
);

-- 8. School Schedules Table
CREATE TABLE IF NOT EXISTS school_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school TEXT,
  gelombang TEXT,
  tanggal TEXT,
  tanggal_selesai TEXT,
  show_token BOOLEAN DEFAULT false
);

-- Enable RLS (Row Level Security) - Optional but recommended
-- For now, we will allow all access for simplicity during migration
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_schedules ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to avoid errors
DROP POLICY IF EXISTS "Allow all access" ON users;
DROP POLICY IF EXISTS "Allow all access" ON exams;
DROP POLICY IF EXISTS "Allow all access" ON questions;
DROP POLICY IF EXISTS "Allow all access" ON options;
DROP POLICY IF EXISTS "Allow all access" ON config;
DROP POLICY IF EXISTS "Allow all access" ON exam_results;
DROP POLICY IF EXISTS "Allow all access" ON survey_results;
DROP POLICY IF EXISTS "Allow all access" ON school_schedules;

CREATE POLICY "Allow all access" ON users FOR ALL USING (true);
CREATE POLICY "Allow all access" ON exams FOR ALL USING (true);
CREATE POLICY "Allow all access" ON questions FOR ALL USING (true);
CREATE POLICY "Allow all access" ON options FOR ALL USING (true);
CREATE POLICY "Allow all access" ON config FOR ALL USING (true);
CREATE POLICY "Allow all access" ON exam_results FOR ALL USING (true);
CREATE POLICY "Allow all access" ON survey_results FOR ALL USING (true);
CREATE POLICY "Allow all access" ON school_schedules FOR ALL USING (true);

-- Insert default admin
INSERT INTO users (username, password, role, nama_lengkap) 
VALUES ('admin', 'admin123', 'admin_pusat', 'Administrator')
ON CONFLICT (username) DO NOTHING;
