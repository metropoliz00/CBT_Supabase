-- NUCLEAR OPTION: DISABLE RLS ON ALL TABLES
-- Jalankan ini jika data masih tidak muncul. 
-- Ini akan mematikan fitur keamanan Row Level Security (RLS) sehingga semua data bisa dibaca/tulis oleh aplikasi.

-- 1. Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on activity_logs table
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- 3. Disable RLS on exam_results table
ALTER TABLE exam_results DISABLE ROW LEVEL SECURITY;

-- 4. Disable RLS on questions table
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;

-- 5. Disable RLS on exams table
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;

-- 6. Disable RLS on config table
ALTER TABLE config DISABLE ROW LEVEL SECURITY;

-- 7. Disable RLS on school_schedules table
ALTER TABLE school_schedules DISABLE ROW LEVEL SECURITY;

-- 8. Disable RLS on survey_results table
ALTER TABLE survey_results DISABLE ROW LEVEL SECURITY;

-- 9. Grant full access just in case
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
