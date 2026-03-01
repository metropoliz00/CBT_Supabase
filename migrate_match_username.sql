-- SCRIPT MIGRASI PRESISI (MATCH USERNAME)
-- Script ini hanya akan memproses data jika Username SUDAH ADA di database.
-- Tidak akan membuat user baru. Tidak akan membuat data ganda.

-- 1. BERSIHKAN DATA INPUT (PENTING!)
-- Seringkali data tidak match karena ada spasi tersembunyi (contoh: "User1 " vs "User1")
UPDATE temp_scores SET username = TRIM(username), mapel = TRIM(mapel);

-- 2. UPDATE NILAI YANG SUDAH ADA
-- Hanya update jika Username & Mapel COCOK PERSIS dengan database.
UPDATE exam_results er
SET 
    score = CASE 
        WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 
        ELSE CAST(REPLACE(t.nilai, ',', '.') AS numeric) 
    END
FROM temp_scores t
WHERE er.username = t.username AND er.exam_id = t.mapel;

-- 3. MASUKKAN NILAI BARU (HANYA UNTUK SISWA YANG VALID)
-- Hanya insert jika:
-- a. Siswa tersebut ADA di tabel 'users'
-- b. Siswa tersebut BELUM punya nilai untuk mapel ini
INSERT INTO exam_results (
    username, 
    exam_id, 
    score, 
    answers, 
    start_time, 
    end_time
)
SELECT 
    t.username,
    t.mapel,
    CASE 
        WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 
        ELSE CAST(REPLACE(t.nilai, ',', '.') AS numeric) 
    END,
    '{}'::jsonb,
    (EXTRACT(EPOCH FROM NOW()) * 1000),
    (EXTRACT(EPOCH FROM NOW()) * 1000)
FROM temp_scores t
WHERE 
    -- Syarat 1: User HARUS sudah ada di tabel users (Mencegah user hantu)
    EXISTS (SELECT 1 FROM users u WHERE u.username = t.username)
    -- Syarat 2: Data nilai belum ada (Mencegah duplikat)
    AND NOT EXISTS (SELECT 1 FROM exam_results er WHERE er.username = t.username AND er.exam_id = t.mapel);
