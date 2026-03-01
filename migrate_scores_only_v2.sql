-- SCRIPT MIGRASI KHUSUS NILAI (SCORE ONLY) - VERSI 2 (Tanpa created_at/updated_at)

-- 1. Siapkan tabel penampungan (Jika belum ada)
CREATE TABLE IF NOT EXISTS temp_scores (
    username text,
    mapel text,
    nilai text
);

-- 2. Bersihkan data lama di penampungan
TRUNCATE temp_scores;

-- [STOP DISINI]
-- SILAKAN IMPORT CSV KE TABEL 'temp_scores' DULU.
-- SETELAH IMPORT SELESAI, JALANKAN BAGIAN DI BAWAH INI:

-- 3. Amankan User (Buat user dummy jika belum ada)
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

-- 4. Pindahkan/Update Nilai ke Tabel Utama (exam_results)
-- Versi ini TIDAK menggunakan kolom created_at atau updated_at
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
    -- Konversi Nilai: Ganti koma jadi titik, handle kosong jadi 0
    CASE 
        WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 
        ELSE CAST(REPLACE(t.nilai, ',', '.') AS numeric) 
    END,
    '{}'::jsonb, -- Kosongkan jawaban detail
    (EXTRACT(EPOCH FROM NOW()) * 1000), -- Set waktu sekarang (ms)
    (EXTRACT(EPOCH FROM NOW()) * 1000)
FROM temp_scores t
ON CONFLICT (username, exam_id) 
DO UPDATE SET 
    score = EXCLUDED.score;
