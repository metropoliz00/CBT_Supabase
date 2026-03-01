-- SCRIPT PERBAIKAN V3 (Fix Durasi "1:00:27" & Nilai Koma)
-- Jalankan ini di SQL Editor Supabase

-- 1. Masukkan User yang Hilang
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

-- 2. Update Data Nilai yang Sudah Ada
UPDATE exam_results er
SET 
    score = CASE 
        WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 
        -- Ganti koma dengan titik untuk desimal, lalu cast
        ELSE CAST(REPLACE(t.nilai, ',', '.') AS numeric)
    END,
    answers = CASE WHEN t.analisis_json = '' OR t.analisis_json IS NULL THEN '{}'::jsonb ELSE t.analisis_json::jsonb END
FROM temp_exam_results t
WHERE er.username = t.username AND er.exam_id = t.mapel;

-- 3. Masukkan Data Nilai Baru (Fix Durasi)
INSERT INTO exam_results (username, exam_id, score, answers, start_time, end_time)
SELECT DISTINCT ON (t.username, t.mapel)
    t.username,
    t.mapel,
    CASE 
        WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 
        ELSE CAST(REPLACE(t.nilai, ',', '.') AS numeric)
    END,
    CASE WHEN t.analisis_json = '' OR t.analisis_json IS NULL THEN '{}'::jsonb ELSE t.analisis_json::jsonb END,
    (EXTRACT(EPOCH FROM NOW()) * 1000) - 
    CASE 
        -- Jika format jam:menit:detik (contoh: 1:00:27) -> Konversi ke milidetik
        WHEN t.durasi LIKE '%:%' THEN EXTRACT(EPOCH FROM CAST(t.durasi AS INTERVAL)) * 1000
        -- Jika kosong
        WHEN t.durasi = '' OR t.durasi IS NULL THEN 0 
        -- Jika angka biasa (asumsi menit) -> Konversi ke milidetik
        ELSE CAST(REPLACE(t.durasi, ',', '.') AS numeric) * 60000 
    END, 
    EXTRACT(EPOCH FROM NOW()) * 1000
FROM temp_exam_results t
WHERE NOT EXISTS (
    SELECT 1 FROM exam_results er 
    WHERE er.username = t.username AND er.exam_id = t.mapel
);
