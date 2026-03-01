-- FINAL FIX FOR ACTIVITY LOGS
-- Script ini akan memastikan tabel log aktivitas berfungsi 100%.

-- 1. Pastikan kolom username di tabel users bersifat UNIQUE
-- Ini wajib agar tabel activity_logs bisa terhubung (Foreign Key).
DO $$ 
BEGIN 
    -- Cek apakah constraint unique sudah ada, jika belum buat baru
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN
        -- Kita coba tambahkan constraint. Jika gagal karena ada duplikat, script akan error.
        -- Namun asumsinya data user sudah bersih dari duplikat username.
        ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END $$;

-- 2. Reset Tabel Activity Logs
-- Kita hapus dan buat ulang untuk memastikan strukturnya benar-benar sesuai.
DROP TABLE IF EXISTS activity_logs;

CREATE TABLE activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL,
    action TEXT NOT NULL, -- 'LOGIN', 'START', 'FINISH', 'SURVEY'
    subject TEXT, -- Nama Mapel atau ID Ujian
    meta JSONB, -- Data tambahan (skor, dll)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hubungkan ke tabel users
    CONSTRAINT fk_activity_users FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- 3. Tambahkan Index untuk performa
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_username ON activity_logs(username);

-- 4. Berikan Izin Akses (Permissions)
GRANT SELECT, INSERT ON activity_logs TO authenticated;
GRANT SELECT, INSERT ON activity_logs TO anon;
GRANT ALL ON activity_logs TO service_role;

-- 5. Masukkan Data Dummy (Untuk Pancingan)
-- Ini akan membuat satu log aktivitas palsu agar dashboard tidak kosong saat pertama kali dibuka.
INSERT INTO activity_logs (username, action, subject, meta)
SELECT username, 'LOGIN', NULL, '{"note": "System Init Log"}'::jsonb
FROM users
WHERE role = 'siswa'
LIMIT 1;
