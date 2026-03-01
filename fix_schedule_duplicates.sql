-- FIX SCHOOL SCHEDULES DUPLICATES
-- Script ini akan menghapus data ganda pada tabel school_schedules dan membuat kolom 'school' menjadi unik.
-- Ini diperlukan agar fitur "Atur Gelombang" bisa bersifat EDIT (Update), bukan tambah data baru terus.

-- 1. Hapus duplikat (sisakan satu per sekolah)
DELETE FROM school_schedules a USING school_schedules b
WHERE a.id < b.id AND a.school = b.school;

-- 2. Tambahkan Constraint Unik pada kolom school
-- Jika constraint sudah ada, perintah ini mungkin error (abaikan saja).
ALTER TABLE school_schedules ADD CONSTRAINT school_schedules_school_key UNIQUE (school);
