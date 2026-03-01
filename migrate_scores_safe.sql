-- SCRIPT MIGRASI AMAN (Tanpa ON CONFLICT)
-- Script ini bekerja TANPA perlu mengubah struktur database (tanpa unique constraint).

-- 1. Amankan User (Buat user dummy jika belum ada)
INSERT INTO users (username, password, nama_lengkap, role, id_sekolah, kelas_id)
SELECT DISTINCT 
    t.username, 
    '123456', 
    t.username, 
    'siswa', 
    'SEKOLAH_IMPORT', 
    '-'
FROM temp_scores t
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.username = t.username);

-- 2. UPDATE data yang SUDAH ADA
-- Kita update nilai siswa yang sudah punya data ujian sebelumnya
UPDATE exam_results er
SET 
    score = CASE 
        WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 
        ELSE CAST(REPLACE(t.nilai, ',', '.') AS numeric) 
    END
FROM temp_scores t
WHERE er.username = t.username AND er.exam_id = t.mapel;

-- 3. INSERT data BARU
-- Kita masukkan data siswa yang BELUM punya nilai ujian tersebut
INSERT INTO exam_results (
    username, 
    exam_id, 
    score, 
    answers, 
    start_time, 
    end_time
)
SELECT DISTINCT 
    t.username,
    t.mapel, 
    CASE 
        WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 
        ELSE CAST(REPLACE(t.nilai, ',', '.') AS numeric) 
    END,
    '{}'::jsonb, -- Kosongkan jawaban detail
    (EXTRACT(EPOCH FROM NOW()) * 1000), -- Set waktu sekarang (ms)
    (EXTRACT(EPOCH FROM NOW()) * 1000)
FROM temp_scores t
WHERE NOT EXISTS (
    SELECT 1 FROM exam_results er 
    WHERE er.username = t.username AND er.exam_id = t.mapel
);
