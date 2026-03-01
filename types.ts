
// 1. Tabel Users
export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin_pusat' | 'admin_sekolah' | 'siswa' | 'proktor' | 'admin_kecamatan';
  nama_lengkap: string;
  jenis_kelamin?: string; // New Field
  kelas_id: string; // Used for School Name
  kecamatan?: string; // New Field: Kecamatan
  active_exam?: string; // Assigned Exam
  session?: string; // Assigned Session
  photo_url?: string; // New Field: Profile Photo URL
  photo?: string; // client-side only for new photo uploads
  id_sekolah?: string; // New Field: School ID
  id_gugus?: string; // New Field: Gugus ID
  id_kecamatan?: string; // New Field: Kecamatan ID
  id_paket?: string; // New Field: Active Package ID
}

// 2. Tabel Exams (Ujian)
export interface Exam {
  id: string;
  nama_ujian: string;
  waktu_mulai: string; // ISO String
  durasi: number; // in minutes
  token_akses: string;
  is_active: boolean;
  max_questions?: number; // New Field: Limit questions
  id_sekolah?: string; // New Field: School ID for Exam
  id_kecamatan?: string; // New Field: Kecamatan ID for Exam
  id_gelombang?: string; // New Field: Gelombang ID for Exam
}

// 3. Tabel Questions (Bank Soal)
export type QuestionType = 'PG' | 'PGK' | 'BS' | 'LIKERT';

export interface Question {
  id: string;
  exam_id: string;
  text_soal: string;
  gambar?: string;
  keterangan_gambar?: string; // New Field: Image Caption
  tipe_soal: QuestionType;
  bobot_nilai: number;
}

// Interface for Admin CRUD (Flat structure matching spreadsheet columns)
export interface QuestionRow {
  id: string;
  text_soal: string;
  tipe_soal: QuestionType;
  gambar: string;
  keterangan_gambar?: string; // New Field
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  kunci_jawaban: string;
  bobot: number;
  id_paket?: string;
}

// 4. Tabel Options (Pilihan Jawaban)
export interface Option {
  id: string;
  question_id: string;
  text_jawaban: string;
  is_correct: boolean;
}

// 5. Tabel Student Exams (Hasil/Progres)
export interface StudentExam {
  id: string;
  user_id: string;
  exam_id: string;
  status: 'ongoing' | 'completed';
  nilai_akhir: number;
  waktu_submit?: string;
}

// 6. Tabel Answers (Jawaban Siswa)
export interface AnswerDB {
  id: string;
  student_exam_id: string;
  question_id: string;
  option_id: string; 
  answer_value?: string; 
  is_marked: boolean;
}

// 7. Jadwal Sekolah (Gelombang)
export interface SchoolSchedule {
  school: string;
  gelombang: string;
  tanggal: string; // YYYY-MM-DD (Start Date)
  tanggal_selesai?: string; // YYYY-MM-DD (End Date)
  show_token?: boolean; // New field
}

// UI State Helper Types
export interface QuestionWithOptions extends Question {
  options: Option[];
}

export type UserAnswerValue = string | string[] | Record<string, boolean> | number;

export interface ExamSessionState {
  answers: Record<string, UserAnswerValue>;
  doubtful: Record<string, boolean>;
  timeLeft: number;
  currentQuestionIndex: number;
  lastSavedQuestionIndex?: number; // To track where the last autosave occurred
}

// Google Apps Script Global Interface
declare global {
  interface Window {
    google?: {
      script: {
        run: {
          withSuccessHandler(callback: (data: any) => void): any;
          withFailureHandler(callback: (error: any) => void): any;
          [key: string]: any;
        };
      };
    };
  }
}
