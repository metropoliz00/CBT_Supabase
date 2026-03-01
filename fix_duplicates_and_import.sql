-- SCRIPT ANTI-DUPLIKAT & IMPORT BERSIH
-- Jalankan script ini untuk membersihkan data ganda dan mengimpor ulang dengan benar.

-- 1. HAPUS DUPLIKAT (PENTING!)
-- Script ini akan menghapus data nilai ganda, menyisakan data terbaru saja.
DELETE FROM exam_results
WHERE id NOT IN (
    SELECT MAX(id)
    FROM exam_results
    GROUP BY username, exam_id
);

-- 2. TAMBAHKAN PENGAMAN (CONSTRAINT)
-- Ini mencegah data "menumpuk" lagi di masa depan.
-- Jika error "relation already exists", abaikan saja (berarti sudah aman).
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_results_username_exam_id_key') THEN 
        ALTER TABLE exam_results ADD CONSTRAINT exam_results_username_exam_id_key UNIQUE (username, exam_id);
    END IF; 
END $$;

-- 3. IMPORT DATA DARI CSV (TABEL SEMENTARA)
-- Data yang ada di CSV akan mengupdate database.
-- Data yang TIDAK ada di CSV tidak akan berubah.

-- A. Buat User Baru jika belum ada (Sesuai data CSV)
INSERT INTO users (username, password, nama_lengkap, role, id_sekolah, kelas_id)
SELECT DISTINCT t.username, '123456', t.username, 'siswa', 'SEKOLAH_IMPORT', '-'
FROM temp_scores t
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.username = t.username);

-- B. Upsert Nilai (Insert atau Update jika sudah ada)
INSERT INTO exam_results (username, exam_id, score, answers, start_time, end_time)
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
