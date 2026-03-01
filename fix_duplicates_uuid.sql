-- SCRIPT PERBAIKAN DUPLIKAT (UUID VERSION)
-- Jalankan ini untuk membersihkan data ganda pada tabel dengan ID bertipe UUID.

-- 1. HAPUS DUPLIKAT
-- Kita gunakan ROW_NUMBER() karena MAX(id) tidak bisa untuk UUID.
-- Script ini akan menyisakan 1 data per siswa/mapel (yang nilainya paling tinggi).
DELETE FROM exam_results
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY username, exam_id ORDER BY score DESC) as rnum
        FROM exam_results
    ) t
    WHERE t.rnum > 1
);

-- 2. PASANG PENGAMAN (CONSTRAINT)
-- Agar tidak bisa ada duplikat lagi di masa depan.
ALTER TABLE exam_results 
ADD CONSTRAINT exam_results_username_exam_id_key UNIQUE (username, exam_id);

-- 3. IMPORT DATA DARI CSV (Update jika ada, Insert jika baru)
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
    CASE WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 ELSE CAST(REPLACE(t.nilai, ',', '.') AS numeric) END,
    '{}'::jsonb,
    (EXTRACT(EPOCH FROM NOW()) * 1000),
    (EXTRACT(EPOCH FROM NOW()) * 1000)
FROM temp_scores t
ON CONFLICT (username, exam_id) 
DO UPDATE SET 
    score = EXCLUDED.score;
