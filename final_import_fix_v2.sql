-- SCRIPT PERBAIKAN V2 (Tanpa kolom updated_at)
-- Jalankan ini di SQL Editor Supabase

-- 1. Masukkan User yang Hilang (Agar tidak error Foreign Key)
INSERT INTO users (username, password, nama_lengkap, role, id_sekolah, kelas_id)
SELECT DISTINCT 
    t.username, 
    '123456', 
    t.nama, 
    'siswa', 
    'SEKOLAH_IMPORT', 
    t.kelas
FROM temp_exam_results t
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.username = t.username);

-- 2. Update Data Nilai yang Sudah Ada (Tanpa updated_at)
UPDATE exam_results er
SET 
    score = CASE WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 ELSE CAST(t.nilai AS numeric) END,
    answers = CASE WHEN t.analisis_json = '' OR t.analisis_json IS NULL THEN '{}'::jsonb ELSE t.analisis_json::jsonb END
FROM temp_exam_results t
WHERE er.username = t.username AND er.exam_id = t.mapel;

-- 3. Masukkan Data Nilai Baru
INSERT INTO exam_results (username, exam_id, score, answers, start_time, end_time)
SELECT DISTINCT ON (t.username, t.mapel)
    t.username,
    t.mapel,
    CASE WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 ELSE CAST(t.nilai AS numeric) END,
    CASE WHEN t.analisis_json = '' OR t.analisis_json IS NULL THEN '{}'::jsonb ELSE t.analisis_json::jsonb END,
    (EXTRACT(EPOCH FROM NOW()) * 1000) - (CASE WHEN t.durasi = '' OR t.durasi IS NULL THEN 0 ELSE CAST(t.durasi AS numeric) END * 60000), 
    EXTRACT(EPOCH FROM NOW()) * 1000
FROM temp_exam_results t
WHERE NOT EXISTS (
    SELECT 1 FROM exam_results er 
    WHERE er.username = t.username AND er.exam_id = t.mapel
);
