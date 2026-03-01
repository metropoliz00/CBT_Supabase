-- LANGKAH PERBAIKAN:
-- Error "42P10" terjadi karena database belum memiliki aturan bahwa satu siswa hanya boleh punya satu nilai per mata pelajaran.
-- Script ini akan memperbaiki hal tersebut dan melanjutkan proses import.

-- 1. Bersihkan duplikat data di tabel exam_results (jika ada) agar tidak error saat pembuatan constraint
DELETE FROM exam_results a USING exam_results b
WHERE a.id < b.id AND a.username = b.username AND a.exam_id = b.exam_id;

-- 2. Tambahkan Aturan Unik (Unique Constraint)
-- Ini memungkinkan perintah "ON CONFLICT" bekerja
ALTER TABLE exam_results 
ADD CONSTRAINT exam_results_username_exam_id_key UNIQUE (username, exam_id);

-- 3. Jalankan Import Data (Lanjutan dari script sebelumnya)
INSERT INTO exam_results (
    username, 
    exam_id, 
    score, 
    answers, 
    start_time, 
    end_time, 
    created_at
)
SELECT 
    t.username,
    t.mapel, 
    CASE WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 ELSE CAST(t.nilai AS numeric) END,
    CASE 
        WHEN t.analisis_json IS NULL OR t.analisis_json = '' THEN '{}'::jsonb 
        ELSE t.analisis_json::jsonb 
    END,
    -- Konversi durasi menit ke milidetik (estimasi dari waktu sekarang)
    (EXTRACT(EPOCH FROM NOW()) * 1000) - (CASE WHEN t.durasi = '' OR t.durasi IS NULL THEN 0 ELSE CAST(t.durasi AS numeric) END * 60000), 
    EXTRACT(EPOCH FROM NOW()) * 1000,
    NOW()
FROM temp_exam_results t
ON CONFLICT (username, exam_id) DO UPDATE 
SET 
    score = EXCLUDED.score,
    answers = EXCLUDED.answers,
    updated_at = NOW();
