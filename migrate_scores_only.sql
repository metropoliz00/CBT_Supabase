-- SCRIPT MIGRASI KHUSUS NILAI (SCORE ONLY)
-- Langkah 1: Jalankan bagian ini dulu untuk menyiapkan tempat penampungan
CREATE TABLE IF NOT EXISTS temp_scores (
    username text,
    mapel text,
    nilai text
);

-- Bersihkan data lama di penampungan
TRUNCATE temp_scores;

-- [STOP DISINI]
-- SEKARANG LAKUKAN IMPORT CSV ANDA KE TABEL 'temp_scores' MELALUI SUPABASE DASHBOARD.
-- Pastikan CSV Anda punya header: username, mapel, nilai

-- Langkah 2: Setelah Import CSV Selesai, Jalankan Script di Bawah Ini:

-- A. Amankan User (Buat user dummy jika username belum ada di tabel users agar tidak error)
INSERT INTO users (username, password, nama_lengkap, role, id_sekolah, kelas_id)
SELECT DISTINCT 
    t.username, 
    '123456', 
    t.username, -- Nama disamakan dengan username sementara
    'siswa', 
    'SEKOLAH_IMPORT', 
    '-'
FROM temp_scores t
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.username = t.username);

-- B. Pindahkan/Update Nilai ke Tabel Utama (exam_results)
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
    t.mapel, -- Pastikan penulisan Mapel di CSV SAMA PERSIS dengan ID Ujian di database
    -- Konversi Nilai: Ganti koma jadi titik, handle kosong jadi 0
    CASE 
        WHEN t.nilai = '' OR t.nilai IS NULL THEN 0 
        ELSE CAST(REPLACE(t.nilai, ',', '.') AS numeric) 
    END,
    '{}'::jsonb, -- Kosongkan jawaban detail karena kita cuma migrasi nilai
    EXTRACT(EPOCH FROM NOW()) * 1000, -- Set waktu sekarang
    EXTRACT(EPOCH FROM NOW()) * 1000,
    NOW()
FROM temp_scores t
ON CONFLICT (username, exam_id) 
DO UPDATE SET 
    score = EXCLUDED.score,
    updated_at = NOW();

-- C. Bersihkan tabel sementara (Opsional)
-- DROP TABLE temp_scores;
