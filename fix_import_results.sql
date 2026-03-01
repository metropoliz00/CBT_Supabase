-- LANGKAH 1: Buat tabel sementara untuk menampung data CSV (tanpa validasi ketat)
CREATE TABLE IF NOT EXISTS temp_exam_results (
    timestamp text,
    username text,
    nama text,
    kelas text,
    mapel text,
    nilai text,
    analisis_json text,
    durasi text
);

-- LANGKAH 2: Bersihkan data lama di tabel temp (jika ada)
TRUNCATE temp_exam_results;

-- LANGKAH 3:
-- Silakan IMPORT file CSV Anda ke tabel 'temp_exam_results' melalui Supabase Dashboard.
-- Pastikan kolom CSV cocok dengan kolom tabel ini.
-- JANGAN import ke 'exam_results' langsung.

-- LANGKAH 4: (Jalankan setelah import CSV selesai)
-- Masukkan user yang hilang ke tabel 'users' secara otomatis
INSERT INTO users (username, password, nama_lengkap, role, id_sekolah, kelas_id)
SELECT DISTINCT 
    t.username, 
    '123456', -- Password default
    t.nama, 
    'siswa', 
    'SEKOLAH_IMPORT', -- ID Sekolah default untuk data import
    t.kelas
FROM temp_exam_results t
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.username = t.username
);

-- LANGKAH 5: Pindahkan data dari temp ke tabel asli 'exam_results'
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
    t.mapel, -- Pastikan ini sesuai dengan ID Ujian di sistem (misal: 'B. INDO', 'MATEMATIKA')
    CASE WHEN t.nilai = '' THEN 0 ELSE CAST(t.nilai AS numeric) END,
    CASE 
        WHEN t.analisis_json IS NULL OR t.analisis_json = '' THEN '{}'::jsonb 
        ELSE t.analisis_json::jsonb 
    END,
    -- Konversi durasi (menit) ke timestamp ms
    (EXTRACT(EPOCH FROM NOW()) * 1000) - (CASE WHEN t.durasi = '' THEN 0 ELSE CAST(t.durasi AS numeric) END * 60000), 
    EXTRACT(EPOCH FROM NOW()) * 1000,
    NOW()
FROM temp_exam_results t
ON CONFLICT (username, exam_id) DO UPDATE 
SET 
    score = EXCLUDED.score,
    answers = EXCLUDED.answers,
    updated_at = NOW();

-- LANGKAH 6: Hapus tabel sementara (Opsional)
-- DROP TABLE temp_exam_results;
