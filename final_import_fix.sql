-- SCRIPT PERBAIKAN TOTAL (Jalankan ini di SQL Editor)
-- Script ini menggabungkan semua langkah perbaikan dan menghindari error constraint.

-- 1. Masukkan User yang Hilang (PENTING: Agar tidak error "Key not present in table users")
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

-- 2. Update Data Nilai yang Sudah Ada (Menggunakan metode UPDATE FROM, tidak butuh constraint unik)
UPDATE exam_results er
SET 
    score = CASE WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 ELSE CAST(t.nilai AS numeric) END,
    answers = CASE WHEN t.analisis_json = '' OR t.analisis_json IS NULL THEN '{}'::jsonb ELSE t.analisis_json::jsonb END,
    updated_at = NOW()
FROM temp_exam_results t
WHERE er.username = t.username AND er.exam_id = t.mapel;

-- 3. Masukkan Data Nilai Baru (Yang belum ada di exam_results)
-- Menggunakan DISTINCT ON untuk mencegah duplikat dari file CSV itu sendiri
INSERT INTO exam_results (username, exam_id, score, answers, start_time, end_time, created_at)
SELECT DISTINCT ON (t.username, t.mapel)
    t.username,
    t.mapel,
    CASE WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 ELSE CAST(t.nilai AS numeric) END,
    CASE WHEN t.analisis_json = '' OR t.analisis_json IS NULL THEN '{}'::jsonb ELSE t.analisis_json::jsonb END,
    (EXTRACT(EPOCH FROM NOW()) * 1000) - (CASE WHEN t.durasi = '' OR t.durasi IS NULL THEN 0 ELSE CAST(t.durasi AS numeric) END * 60000), 
    EXTRACT(EPOCH FROM NOW()) * 1000,
    NOW()
FROM temp_exam_results t
WHERE NOT EXISTS (
    SELECT 1 FROM exam_results er 
    WHERE er.username = t.username AND er.exam_id = t.mapel
);

-- 4. (Opsional) Bersihkan tabel sementara jika sudah selesai
-- DROP TABLE temp_exam_results;
