
import { User, Exam, QuestionWithOptions, QuestionRow, SchoolSchedule } from '../types';
import { supabase } from './supabase';

// Helper to format Google Drive URLs to direct image links
const formatGoogleDriveUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    if (typeof url !== 'string') return url;
    try {
        if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
            const match = url.match(/[-\w]{25,}/);
            if (match) {
                return `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;
            }
        }
    } catch (e) { 
        return url; 
    }
    return url;
};

export const api = {
  // Unified Login Function
  login: async (username: string, password?: string): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error("Supabase login error:", error);
      // If the error is PGRST116, it means no rows returned (user not found)
      if (error.code === 'PGRST116') {
          throw new Error('Username tidak ditemukan.');
      }
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Username tidak ditemukan.');
    }

    if (password && data.password !== password) {
      throw new Error('Password salah.');
    }

    // Update status to ONLINE
    await supabase.from('users').update({ status: 'ONLINE', last_active: new Date().toISOString() }).eq('username', username);

    return {
        id: data.username || data.id || '',
        username: data.username || '',
        role: data.role || 'siswa',
        nama_lengkap: data.nama_lengkap || '',
        jenis_kelamin: data.jenis_kelamin || 'L', 
        kelas_id: data.kelas_id || '',
        kecamatan: data.kecamatan || '', 
        active_exam: data.active_exam || '', 
        session: data.session || '',
        photo_url: formatGoogleDriveUrl(data.photo_url),
        id_sekolah: data.id_sekolah || '',
        id_gugus: data.id_gugus || '',
        id_kecamatan: data.id_kecamatan || '',
        id_paket: data.id_paket || ''
    };
  },

  // Start Exam
  startExam: async (username: string, fullname: string, subject: string): Promise<any> => {
      await supabase.from('users').update({ status: 'EXAM', last_active: new Date().toISOString() }).eq('username', username);
      return { success: true };
  },

  // Check Status (For Polling Reset)
  checkStatus: async (username: string): Promise<{ status: string, message?: string }> => {
      const { data, error } = await supabase.from('users').select('status').eq('username', username).single();
      if (error || !data) return { status: 'UNKNOWN' };
      
      // Update last active
      await supabase.from('users').update({ last_active: new Date().toISOString() }).eq('username', username);
      
      return { status: data.status || 'ONLINE' };
  },

  // Get Exams / Subject List
  getExams: async (): Promise<Exam[]> => {
    const { data: configData } = await supabase.from('config').select('*');
    const configs = configData?.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}) || {};
    
    const duration = parseInt(configs['DURATION'] || '60');
    const maxQuestions = parseInt(configs['MAX_QUESTIONS'] || '0');
    const surveyDuration = parseInt(configs['SURVEY_DURATION'] || '30');

    const { data: subjects, error } = await supabase.from('exams').select('*');
    
    let exams: Exam[] = [];
    if (subjects && !error) {
        exams = subjects.map((s: any) => ({
            id: s.id,
            nama_ujian: s.nama_ujian,
            waktu_mulai: s.waktu_mulai || new Date().toISOString(),
            durasi: s.durasi || duration,
            token_akses: s.token_akses || 'TOKEN', 
            is_active: s.is_active !== false,
            max_questions: s.max_questions || maxQuestions,
            id_sekolah: s.id_sekolah, 
            id_kecamatan: s.id_kecamatan,
            id_gelombang: s.id_gelombang 
        }));
    }

    // Always add surveys
    exams.push(
        {
            id: 'Survey_Karakter',
            nama_ujian: 'Survey Karakter',
            waktu_mulai: new Date().toISOString(),
            durasi: surveyDuration,
            token_akses: '',
            is_active: true,
            max_questions: 0
        },
        {
            id: 'Survey_Lingkungan',
            nama_ujian: 'Survey Lingkungan Belajar',
            waktu_mulai: new Date().toISOString(),
            durasi: surveyDuration,
            token_akses: '',
            is_active: true,
            max_questions: 0
        }
    );
    return exams;
  },

  // Get Server Token
  getServerToken: async (): Promise<string> => {
      const { data } = await supabase.from('config').select('value').eq('key', 'TOKEN').single();
      return data?.value || '12345';
  },

  // Save Config
  saveConfig: async (key: string, value: any): Promise<{success: boolean}> => {
      const { error } = await supabase.from('config').upsert({ key, value: String(value) });
      return { success: !error };
  },

  saveToken: async (newToken: string) => api.saveConfig('TOKEN', newToken),
  saveDuration: async (minutes: number) => api.saveConfig('DURATION', minutes),
  saveSurveyDuration: async (minutes: number) => api.saveConfig('SURVEY_DURATION', minutes),
  saveMaxQuestions: async (amount: number) => api.saveConfig('MAX_QUESTIONS', amount),

  // Get All Config
  getAllConfig: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.from('config').select('*');
      if (error || !data) return {};
      return data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
  },

  // Get Questions from Sheet (Formatted for Exam)
  getQuestions: async (subject: string): Promise<QuestionWithOptions[]> => {
    const { data: questions, error } = await supabase.from('questions').select('*').eq('exam_id', subject);
    if (error || !questions) return [];

    return questions.map((q: any) => {
        const options = [];
        if (q.opsi_a) options.push({ id: 'A', question_id: q.id, text_jawaban: q.opsi_a, is_correct: q.kunci_jawaban === 'A' });
        if (q.opsi_b) options.push({ id: 'B', question_id: q.id, text_jawaban: q.opsi_b, is_correct: q.kunci_jawaban === 'B' });
        if (q.opsi_c) options.push({ id: 'C', question_id: q.id, text_jawaban: q.opsi_c, is_correct: q.kunci_jawaban === 'C' });
        if (q.opsi_d) options.push({ id: 'D', question_id: q.id, text_jawaban: q.opsi_d, is_correct: q.kunci_jawaban === 'D' });

        return {
            id: q.id,
            exam_id: subject,
            text_soal: q.text_soal || "Pertanyaan tanpa teks",
            tipe_soal: q.tipe_soal || 'PG',
            bobot_nilai: q.bobot_nilai || 10,
            gambar: q.gambar || undefined,
            keterangan_gambar: q.keterangan_gambar || undefined,
            options: options
        };
    });
  },

  // --- SURVEY SPECIFIC ---
  getSurveyQuestions: async (surveyType: 'Survey_Karakter' | 'Survey_Lingkungan'): Promise<QuestionWithOptions[]> => {
      const { data: questions, error } = await supabase.from('questions').select('*').eq('exam_id', surveyType);
      if (error || !questions) return [];

      return questions.map((q: any) => {
          const options = [];
          if (q.opsi_a) options.push({ id: 'A', question_id: q.id, text_jawaban: q.opsi_a, is_correct: false });
          if (q.opsi_b) options.push({ id: 'B', question_id: q.id, text_jawaban: q.opsi_b, is_correct: false });
          if (q.opsi_c) options.push({ id: 'C', question_id: q.id, text_jawaban: q.opsi_c, is_correct: false });
          if (q.opsi_d) options.push({ id: 'D', question_id: q.id, text_jawaban: q.opsi_d, is_correct: false });

          return {
              id: q.id,
              exam_id: surveyType,
              text_soal: q.text_soal || "Pertanyaan tanpa teks",
              tipe_soal: 'LIKERT',
              bobot_nilai: 0,
              options: options
          };
      });
  },

  submitSurvey: async (payload: { user: User, surveyType: string, answers: any, startTime: number }) => {
      const { error } = await supabase.from('survey_results').insert({
          username: payload.user.username,
          survey_type: payload.surveyType,
          answers: payload.answers,
          start_time: payload.startTime,
          end_time: new Date().getTime()
      });
      return { success: !error };
  },

  getSurveyRecap: async (surveyType: string): Promise<any[]> => {
      const { data, error } = await supabase
        .from('survey_results')
        .select(`*, users (nama_lengkap, kelas_id, kecamatan, id_sekolah, id_gugus, id_kecamatan)`)
        .eq('survey_type', surveyType);
      
      if (error || !data) return [];
      
      return data.map((r: any) => ({
          ...r,
          nama: r.users?.nama_lengkap || '',
          sekolah: r.users?.kelas_id || '',
          kecamatan: r.users?.kecamatan || '',
          id_sekolah: r.users?.id_sekolah || '',
          id_gugus: r.users?.id_gugus || '',
          id_kecamatan: r.users?.id_kecamatan || ''
      }));
  },

  // --- ADMIN CRUD ---
  getRawQuestions: async (subject: string): Promise<QuestionRow[]> => {
      const { data, error } = await supabase.from('questions').select('*').eq('exam_id', subject);
      if (error || !data) return [];
      return data as QuestionRow[];
  },
  
  saveQuestion: async (subject: string, data: QuestionRow): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('questions').upsert({ ...data, exam_id: subject });
      return { success: !error, message: error ? error.message : 'Berhasil disimpan' };
  },

  importQuestions: async (subject: string, data: QuestionRow[]): Promise<{success: boolean, message: string}> => {
      const questions = data.map(q => ({ ...q, exam_id: subject }));
      const { error } = await supabase.from('questions').upsert(questions);
      return { success: !error, message: error ? error.message : 'Berhasil diimport' };
  },

  deleteQuestion: async (subject: string, id: string): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('questions').delete().eq('id', id).eq('exam_id', subject);
      return { success: !error, message: error ? error.message : 'Berhasil dihapus' };
  },

  getUsers: async (): Promise<any[]> => {
      const { data, error } = await supabase.from('users').select('*');
      if (error || !data) return [];
      return data.map((u: any) => ({
          ...u,
          photo_url: formatGoogleDriveUrl(u.photo_url)
      }));
  },

  saveUser: async (userData: any): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('users').upsert(userData);
      return { success: !error, message: error ? error.message : 'Berhasil disimpan' };
  },

  deleteUser: async (userId: string): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('users').delete().eq('username', userId);
      return { success: !error, message: error ? error.message : 'Berhasil dihapus' };
  },

  importUsers: async (users: any[]): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('users').upsert(users);
      return { success: !error, message: error ? error.message : 'Berhasil diimport' };
  },

  assignTestGroup: async (usernames: string[], examId: string, session: string, idPaket?: string): Promise<{success: boolean}> => {
      const { error } = await supabase.from('users').update({ active_exam: examId, session, id_paket: idPaket }).in('username', usernames);
      return { success: !error };
  },

  updateUserSessions: async (updates: {username: string, session: string}[]): Promise<{success: boolean}> => {
      // Supabase doesn't have bulk update with different values easily, so we loop
      for (const update of updates) {
          await supabase.from('users').update({ session: update.session }).eq('username', update.username);
      }
      return { success: true };
  },

  resetLogin: async (username: string): Promise<{success: boolean}> => {
      const { error } = await supabase.from('users').update({ status: 'RESET' }).eq('username', username);
      return { success: !error };
  },
  
  checkSession: async (username: string): Promise<{success: boolean, message: string}> => {
      const { data, error } = await supabase.from('users').select('status').eq('username', username).single();
      if (error || !data) return { success: false, message: 'User tidak ditemukan' };
      if (data.status === 'RESET') return { success: false, message: 'Sesi telah direset' };
      return { success: true, message: 'Sesi aktif' };
  },
  
  getSchoolSchedules: async (): Promise<SchoolSchedule[]> => {
      const { data, error } = await supabase.from('school_schedules').select('*');
      if (error || !data) return [];
      return data as SchoolSchedule[];
  },

  saveSchoolSchedules: async (schedules: SchoolSchedule[]): Promise<{success: boolean}> => {
      const { error } = await supabase.from('school_schedules').upsert(schedules);
      return { success: !error };
  },

  getRecap: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`*, users (nama_lengkap, kelas_id, kecamatan, id_sekolah, id_gugus, id_kecamatan, id_paket)`);
        
      if (error || !data) return [];
      
      return data.map((r: any) => ({
          ...r,
          nama: r.users?.nama_lengkap || '',
          sekolah: r.users?.kelas_id || '',
          mapel: r.exam_id || '',
          durasi: r.end_time ? Math.round((r.end_time - r.start_time) / 60000) : 0,
          nilai: r.score || 0,
          kecamatan: r.users?.kecamatan || '',
          id_sekolah: r.users?.id_sekolah || '',
          id_gugus: r.users?.id_gugus || '',
          id_kecamatan: r.users?.id_kecamatan || '',
          id_paket: r.users?.id_paket || ''
      }));
  },

  getAnalysis: async (subject: string): Promise<any> => {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`*, users (nama_lengkap, kelas_id)`)
        .eq('exam_id', subject);
        
      if (error || !data) return { students: [], questions: [] };
      
      return {
          students: data.map((r: any) => ({
              username: r.username,
              nama: r.users?.nama_lengkap,
              sekolah: r.users?.kelas_id,
              score: r.score,
              answers: r.answers
          })),
          questions: [] // Ideally fetch questions here to build full analysis
      };
  },

  submitExam: async (payload: { user: User, subject: string, answers: any, startTime: number, displayedQuestionCount?: number, questionIds?: string[] }) => {
      let score = 0;
      // Calculate score if possible, or do it on backend.
      // For now, we just save the answers.
      const { error } = await supabase.from('exam_results').upsert({
          username: payload.user.username,
          exam_id: payload.subject,
          answers: payload.answers,
          score: score, // Need a way to calculate score properly based on questions
          start_time: payload.startTime,
          end_time: new Date().getTime(),
          status: 'completed'
      });
      
      await supabase.from('users').update({ status: 'FINISHED' }).eq('username', payload.user.username);
      
      return { success: !error };
  },
  
  clearAllCache: async (): Promise<{success: boolean, message: string}> => {
      return { success: true, message: 'Cache cleared' };
  },

  getDashboardData: async () => {
      const { data: users } = await supabase.from('users').select('*');
      const { data: exams } = await supabase.from('exams').select('*');
      
      return {
          allUsers: users || [],
          activeExams: exams || []
      };
  },

  saveExamProgress: async (userId: string, examId: string, progress: { answers: Record<string, any>, currentQuestionIndex: number }): Promise<{success: boolean}> => {
      const { error } = await supabase.from('exam_results').upsert({
          username: userId,
          exam_id: examId,
          answers: progress.answers,
          current_question_index: progress.currentQuestionIndex,
          status: 'ongoing'
      });
      return { success: !error };
  },

  getExamProgress: async (userId: string, examId: string): Promise<{ answers: Record<string, any>, currentQuestionIndex: number } | null> => {
      const { data, error } = await supabase
        .from('exam_results')
        .select('answers, current_question_index')
        .eq('username', userId)
        .eq('exam_id', examId)
        .single();
        
      if (error || !data) return null;
      
      return {
          answers: data.answers || {},
          currentQuestionIndex: data.current_question_index || 0
      };
  }
};

