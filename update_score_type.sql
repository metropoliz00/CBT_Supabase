-- Ubah tipe kolom score agar bisa menyimpan nilai desimal (misal 66.67)
ALTER TABLE exam_results ALTER COLUMN score TYPE NUMERIC(5,2);

-- Opsional: Jika ingin memastikan kolom answers bisa menerima JSON text dari CSV
-- (Supabase biasanya menangani ini otomatis jika formatnya benar)
