
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
  // Helper to log activity
  logActivity: async (username: string, action: string, subject?: string, meta?: any) => {
      try {
          // Use upsert or insert. Insert is fine.
          await supabase.from('activity_logs').insert({
              username,
              action,
              subject,
              meta
          });
      } catch (e) {
          // Silent fail is okay, but maybe warn in dev
          console.warn("Activity log failed:", e);
      }
  },

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

    // Check Status: Only allow login if status is NOT 'EXAM' or 'FINISHED'
    // This is more robust: Allow OFFLINE, ONLINE (re-login), RESET, etc.
    // EXCEPTION: Admin/Proktor can bypass this check
    const isBypassRole = ['admin_pusat', 'proktor', 'admin_sekolah'].includes(data.role);
    
    if (!isBypassRole) {
        const rawStatus = data.status || 'OFFLINE';
        const status = String(rawStatus).trim().toUpperCase();
        
        // BLOCK only if currently in exam or finished
        // We allow 'ONLINE' to permit re-login if browser was closed
        const blockedStatuses = ['EXAM', 'WORKING', 'MENGERJAKAN', 'FINISHED', 'SELESAI'];
        
        if (blockedStatuses.includes(status)) {
             throw new Error(`Status peserta sedang ${data.status}. Hubungi proktor untuk reset login.`);
        }
    }

    // Update status to LOGGED_IN (more explicit than ONLINE)
    const { error: updateError } = await supabase
        .from('users')
        .update({ 
            status: 'LOGGED_IN', 
            last_active: new Date().toISOString() 
        })
        .eq('username', username);
    
    if (updateError) {
        console.warn("Login status update warning:", updateError);
    }

    // Log Login Activity
    if (data.role === 'siswa') {
        await api.logActivity(username, 'LOGIN');
    }

    return {
        id: data.username || data.id || '',
        username: String(data.username || ''),
        role: data.role || 'siswa',
        nama_lengkap: String(data.nama_lengkap || ''),
        jenis_kelamin: String(data.jenis_kelamin || 'L'), 
        kelas_id: String(data.kelas_id || ''),
        kecamatan: String(data.kecamatan || ''), 
        active_exam: String(data.active_exam || ''), 
        session: String(data.session || ''),
        photo_url: formatGoogleDriveUrl(data.photo_url),
        id_sekolah: String(data.id_sekolah || ''),
        id_gugus: String(data.id_gugus || ''),
        id_kecamatan: String(data.id_kecamatan || ''),
        id_paket: String(data.id_paket || '')
    };
  },

  // Start Exam
  startExam: async (username: string, fullname: string, subject: string): Promise<any> => {
      await supabase.from('users').update({ status: 'EXAM', last_active: new Date().toISOString() }).eq('username', username);
      await api.logActivity(username, 'START', subject);
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
        const uniqueExams = new Map();
        subjects.forEach((s: any) => {
            const id = String(s.id || '');
            if (!uniqueExams.has(id)) {
                uniqueExams.set(id, {
                    id: id,
                    nama_ujian: String(s.nama_ujian || ''),
                    waktu_mulai: String(s.waktu_mulai || new Date().toISOString()),
                    durasi: Number(s.durasi || duration),
                    token_akses: String(s.token_akses || 'TOKEN'), 
                    is_active: s.is_active !== false,
                    max_questions: Number(s.max_questions || maxQuestions),
                    id_sekolah: String(s.id_sekolah || ''), 
                    id_kecamatan: String(s.id_kecamatan || ''),
                    id_gelombang: String(s.id_gelombang || '') 
                });
            }
        });
        exams = Array.from(uniqueExams.values());
    }
    return exams;
  },

  addExam: async (id: string, nama_ujian: string): Promise<{success: boolean, message: string}> => {
      const { data: configData } = await supabase.from('config').select('value').eq('key', 'DURATION').single();
      const duration = parseInt(configData?.value || '60');
      const { error } = await supabase.from('exams').insert({ id, nama_ujian, durasi: duration, is_active: true });
      return { success: !error, message: error ? error.message : 'Berhasil ditambahkan' };
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
  saveDuration: async (minutes: number) => {
      const res = await api.saveConfig('DURATION', minutes);
      if (res.success) await api.syncExamsDuration();
      return res;
  },
  saveSurveyDuration: async (minutes: number) => {
      const res = await api.saveConfig('SURVEY_DURATION', minutes);
      if (res.success) await api.syncExamsDuration();
      return res;
  },
  saveMaxQuestions: async (amount: number) => api.saveConfig('MAX_QUESTIONS', amount),

  // Sync exam durations with config
  syncExamsDuration: async (): Promise<{success: boolean, message: string}> => {
      try {
          const { data: configData } = await supabase.from('config').select('*');
          const configs = configData?.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}) || {};
          
          const duration = parseInt(configs['DURATION'] || '60');
          const surveyDuration = parseInt(configs['SURVEY_DURATION'] || '30');

          // Update regular exams
          const { error: err1 } = await supabase
            .from('exams')
            .update({ durasi: duration })
            .not('id', 'ilike', 'Survey_%');

          // Update survey exams
          const { error: err2 } = await supabase
            .from('exams')
            .update({ durasi: surveyDuration })
            .ilike('id', 'Survey_%');

          if (err1 || err2) {
              return { success: false, message: (err1?.message || '') + ' ' + (err2?.message || '') };
          }
          return { success: true, message: 'Durasi ujian berhasil disinkronkan' };
      } catch (e: any) {
          return { success: false, message: e.message };
      }
  },

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
        if (q.opsi_a && String(q.opsi_a).trim() !== '') options.push({ id: 'A', question_id: String(q.id), text_jawaban: String(q.opsi_a), is_correct: String(q.kunci_jawaban) === 'A' });
        if (q.opsi_b && String(q.opsi_b).trim() !== '') options.push({ id: 'B', question_id: String(q.id), text_jawaban: String(q.opsi_b), is_correct: String(q.kunci_jawaban) === 'B' });
        if (q.opsi_c && String(q.opsi_c).trim() !== '') options.push({ id: 'C', question_id: String(q.id), text_jawaban: String(q.opsi_c), is_correct: String(q.kunci_jawaban) === 'C' });
        if (q.opsi_d && String(q.opsi_d).trim() !== '') options.push({ id: 'D', question_id: String(q.id), text_jawaban: String(q.opsi_d), is_correct: String(q.kunci_jawaban) === 'D' });
        if (q.opsi_e && String(q.opsi_e).trim() !== '') options.push({ id: 'E', question_id: String(q.id), text_jawaban: String(q.opsi_e), is_correct: String(q.kunci_jawaban) === 'E' });

        return {
            id: String(q.id),
            exam_id: String(subject),
            text_soal: String(q.text_soal || "Pertanyaan tanpa teks"),
            tipe_soal: (q.tipe_soal || 'PG') as any,
            bobot_nilai: Number(q.bobot_nilai || 10),
            gambar: q.gambar ? String(q.gambar) : undefined,
            keterangan_gambar: q.keterangan_gambar ? String(q.keterangan_gambar) : undefined,
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
          if (q.opsi_a !== undefined && q.opsi_a !== null) options.push({ id: 'A', question_id: String(q.id), text_jawaban: String(q.opsi_a), is_correct: false });
          if (q.opsi_b !== undefined && q.opsi_b !== null) options.push({ id: 'B', question_id: String(q.id), text_jawaban: String(q.opsi_b), is_correct: false });
          if (q.opsi_c !== undefined && q.opsi_c !== null) options.push({ id: 'C', question_id: String(q.id), text_jawaban: String(q.opsi_c), is_correct: false });
          if (q.opsi_d !== undefined && q.opsi_d !== null) options.push({ id: 'D', question_id: String(q.id), text_jawaban: String(q.opsi_d), is_correct: false });

          return {
              id: String(q.id),
              exam_id: String(surveyType),
              text_soal: String(q.text_soal || "Pertanyaan tanpa teks"),
              tipe_soal: 'LIKERT',
              bobot_nilai: 0,
              options: options
          };
      });
  },

  submitSurvey: async (payload: { user: User, surveyType: string, answers: any, startTime: number }) => {
      const { data: existing } = await supabase
        .from('survey_results')
        .select('id')
        .eq('username', payload.user.username)
        .eq('survey_type', payload.surveyType)
        .single();

      const resultPayload = {
          username: payload.user.username,
          survey_type: payload.surveyType,
          answers: payload.answers,
          start_time: payload.startTime,
          end_time: new Date().getTime()
      };

      let error;
      if (existing) {
          const res = await supabase.from('survey_results').update(resultPayload).eq('id', existing.id);
          error = res.error;
      } else {
          const res = await supabase.from('survey_results').insert(resultPayload);
          error = res.error;
      }

      // Log Survey Activity
      await api.logActivity(payload.user.username, 'SURVEY', payload.surveyType);

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
      return data.map((q: any) => ({
          ...q,
          bobot: q.bobot_nilai
      })) as QuestionRow[];
  },
  
  saveQuestion: async (subject: string, data: QuestionRow): Promise<{success: boolean, message: string}> => {
      const payload = { ...data, exam_id: subject, bobot_nilai: data.bobot };
      delete (payload as any).bobot;
      const { error } = await supabase.from('questions').upsert(payload);
      return { success: !error, message: error ? error.message : 'Berhasil disimpan' };
  },

  importQuestions: async (subject: string, data: QuestionRow[]): Promise<{success: boolean, message: string}> => {
      const questions = data.map(q => {
          const payload = { ...q, exam_id: subject, bobot_nilai: q.bobot };
          delete (payload as any).bobot;
          return payload;
      });
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
          username: String(u.username || ''),
          nama_lengkap: String(u.nama_lengkap || ''),
          kelas_id: String(u.kelas_id || ''),
          kecamatan: String(u.kecamatan || ''),
          id_sekolah: String(u.id_sekolah || ''),
          id_gugus: String(u.id_gugus || ''),
          id_kecamatan: String(u.id_kecamatan || ''),
          active_exam: String(u.active_exam || ''),
          session: String(u.session || ''),
          id_paket: String(u.id_paket || ''),
          photo_url: formatGoogleDriveUrl(u.photo_url)
      }));
  },

  saveUser: async (userData: any): Promise<{success: boolean, message: string}> => {
      const payload = { ...userData };
      // If id is empty, remove it so Supabase can generate a new UUID
      if (!payload.id) {
          delete payload.id;
      }
      delete payload.fullname;
      delete payload.school;
      delete payload.gender;
      delete payload.photo; // photo is base64, we shouldn't save it directly to table if there's no column, or we should handle it. The table only has photo_url.
      
      const { error } = await supabase.from('users').upsert(payload, { onConflict: 'username' });
      return { success: !error, message: error ? error.message : 'Berhasil disimpan' };
  },

  deleteUser: async (userId: string): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('users').delete().eq('username', userId);
      return { success: !error, message: error ? error.message : 'Berhasil dihapus' };
  },

  importUsers: async (users: any[]): Promise<{success: boolean, message: string}> => {
      const cleanUsers = users.map(u => {
          const { fullname, school, gender, photo, ...rest } = u;
          return rest;
      });
      const { error } = await supabase.from('users').upsert(cleanUsers, { onConflict: 'username' });
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

  resetLogins: async (usernames: string[]): Promise<{success: boolean}> => {
      const { error } = await supabase.from('users').update({ status: 'RESET' }).in('username', usernames);
      return { success: !error };
  },
  
  checkSession: async (username: string): Promise<{success: boolean, message: string}> => {
      const { data, error } = await supabase.from('users').select('status').eq('username', username).single();
      if (error || !data) return { success: false, message: 'User tidak ditemukan' };
      if (data.status === 'RESET') return { success: false, message: 'Sesi telah direset' };
      return { success: true, message: 'Sesi aktif' };
  },

  initSystem: async (): Promise<{success: boolean, message: string}> => {
      return { success: true, message: 'Sistem siap' };
  },

  seedSurveys: async (): Promise<{success: boolean, message: string}> => {
      // Ambil durasi survey dari config
      const { data: configData } = await supabase.from('config').select('value').eq('key', 'SURVEY_DURATION').single();
      const surveyDuration = parseInt(configData?.value || '30');

      // Pastikan data ujian survey ada di tabel exams untuk menghindari error foreign key
      const surveyExams = [
          { id: 'Survey_Karakter', nama_ujian: 'Survey Karakter', durasi: surveyDuration, is_active: true },
          { id: 'Survey_Lingkungan', nama_ujian: 'Survey Lingkungan Belajar', durasi: surveyDuration, is_active: true }
      ];

      const { error: examErr } = await supabase.from('exams').upsert(surveyExams);
      if (examErr) {
          console.error("Error seeding survey exams:", examErr);
          return { success: false, message: 'Gagal membuat data ujian survey: ' + examErr.message };
      }

      const surveyKarakterQuestions = [
          { id: 'SK-01', exam_id: 'Survey_Karakter', text_soal: 'Saya selalu mengerjakan tugas sekolah tepat waktu.', tipe_soal: 'LIKERT', bobot_nilai: 1, opsi_a: 'Sangat Kurang Sesuai', opsi_b: 'Kurang Sesuai', opsi_c: 'Sesuai', opsi_d: 'Sangat Sesuai', kunci_jawaban: '4' },
          { id: 'SK-02', exam_id: 'Survey_Karakter', text_soal: 'Saya menghormati perbedaan pendapat dengan teman.', tipe_soal: 'LIKERT', bobot_nilai: 1, opsi_a: 'Sangat Kurang Sesuai', opsi_b: 'Kurang Sesuai', opsi_c: 'Sesuai', opsi_d: 'Sangat Sesuai', kunci_jawaban: '4' },
          { id: 'SK-03', exam_id: 'Survey_Karakter', text_soal: 'Saya berani mengakui kesalahan jika berbuat salah.', tipe_soal: 'LIKERT', bobot_nilai: 1, opsi_a: 'Sangat Kurang Sesuai', opsi_b: 'Kurang Sesuai', opsi_c: 'Sesuai', opsi_d: 'Sangat Sesuai', kunci_jawaban: '4' },
          { id: 'SK-04', exam_id: 'Survey_Karakter', text_soal: 'Saya peduli terhadap kebersihan lingkungan sekolah.', tipe_soal: 'LIKERT', bobot_nilai: 1, opsi_a: 'Sangat Kurang Sesuai', opsi_b: 'Kurang Sesuai', opsi_c: 'Sesuai', opsi_d: 'Sangat Sesuai', kunci_jawaban: '4' },
          { id: 'SK-05', exam_id: 'Survey_Karakter', text_soal: 'Saya tidak mudah menyerah saat menghadapi soal yang sulit.', tipe_soal: 'LIKERT', bobot_nilai: 1, opsi_a: 'Sangat Kurang Sesuai', opsi_b: 'Kurang Sesuai', opsi_c: 'Sesuai', opsi_d: 'Sangat Sesuai', kunci_jawaban: '4' }
      ];

      const surveyLingkunganQuestions = [
          { id: 'SL-01', exam_id: 'Survey_Lingkungan', text_soal: 'Fasilitas di sekolah saya sangat mendukung kegiatan belajar.', tipe_soal: 'LIKERT', bobot_nilai: 1, opsi_a: 'Sangat Kurang Sesuai', opsi_b: 'Kurang Sesuai', opsi_c: 'Sesuai', opsi_d: 'Sangat Sesuai', kunci_jawaban: '4' },
          { id: 'SL-02', exam_id: 'Survey_Lingkungan', text_soal: 'Guru-guru di sekolah saya mengajar dengan cara yang mudah dipahami.', tipe_soal: 'LIKERT', bobot_nilai: 1, opsi_a: 'Sangat Kurang Sesuai', opsi_b: 'Kurang Sesuai', opsi_c: 'Sesuai', opsi_d: 'Sangat Sesuai', kunci_jawaban: '4' },
          { id: 'SL-03', exam_id: 'Survey_Lingkungan', text_soal: 'Saya merasa aman dari perundungan (bullying) di sekolah.', tipe_soal: 'LIKERT', bobot_nilai: 1, opsi_a: 'Sangat Kurang Sesuai', opsi_b: 'Kurang Sesuai', opsi_c: 'Sesuai', opsi_d: 'Sangat Sesuai', kunci_jawaban: '4' },
          { id: 'SL-04', exam_id: 'Survey_Lingkungan', text_soal: 'Sekolah menyediakan ruang perpustakaan yang nyaman.', tipe_soal: 'LIKERT', bobot_nilai: 1, opsi_a: 'Sangat Kurang Sesuai', opsi_b: 'Kurang Sesuai', opsi_c: 'Sesuai', opsi_d: 'Sangat Sesuai', kunci_jawaban: '4' },
          { id: 'SL-05', exam_id: 'Survey_Lingkungan', text_soal: 'Teman-teman di kelas saling mendukung dalam belajar.', tipe_soal: 'LIKERT', bobot_nilai: 1, opsi_a: 'Sangat Kurang Sesuai', opsi_b: 'Kurang Sesuai', opsi_c: 'Sesuai', opsi_d: 'Sangat Sesuai', kunci_jawaban: '4' }
      ];

      const { error: err1 } = await supabase.from('questions').upsert(surveyKarakterQuestions);
      const { error: err2 } = await supabase.from('questions').upsert(surveyLingkunganQuestions);

      if (err1 || err2) {
          return { success: false, message: (err1?.message || '') + ' ' + (err2?.message || '') };
      }
      return { success: true, message: 'Soal survey berhasil di-generate' };
  },
  
  getSchoolSchedules: async (): Promise<SchoolSchedule[]> => {
      const { data, error } = await supabase.from('school_schedules').select('*');
      if (error || !data) return [];
      return data as SchoolSchedule[];
  },

  saveSchoolSchedules: async (schedules: SchoolSchedule[]): Promise<{success: boolean}> => {
      const { error } = await supabase.from('school_schedules').upsert(schedules, { onConflict: 'school' });
      return { success: !error };
  },

  deleteExamResult: async (id: string): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('exam_results').delete().eq('id', id);
      return { success: !error, message: error ? error.message : 'Berhasil dihapus' };
  },

  updateExamResult: async (id: string, updates: any): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('exam_results').update(updates).eq('id', id);
      return { success: !error, message: error ? error.message : 'Berhasil diupdate' };
  },

  createExamResult: async (payload: any): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('exam_results').insert(payload);
      return { success: !error, message: error ? error.message : 'Berhasil ditambahkan' };
  },

  getRecap: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`*, users (nama_lengkap, kelas_id, kecamatan, id_sekolah, id_gugus, id_kecamatan, id_paket)`);
        
      if (error || !data) return [];
      
      // Ranking is calculated on the frontend based on the score
      return data.map((r: any) => ({
          ...r,
          nama: String(r.users?.nama_lengkap || ''),
          sekolah: String(r.users?.kelas_id || ''),
          mapel: String(r.exam_id || ''),
          durasi: r.end_time ? Math.round((Number(r.end_time) - Number(r.start_time)) / 60000) : 0,
          nilai: Number(r.score || 0),
          kecamatan: String(r.users?.kecamatan || ''),
          id_sekolah: String(r.users?.id_sekolah || ''),
          id_gugus: String(r.users?.id_gugus || ''),
          id_kecamatan: String(r.users?.id_kecamatan || ''),
          id_paket: String(r.users?.id_paket || '')
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
      
      // Calculate Score
      try {
          const { data: questions } = await supabase.from('questions').select('id, kunci_jawaban, bobot_nilai, tipe_soal').eq('exam_id', payload.subject);
          
          if (questions && questions.length > 0) {
              let totalScore = 0;
              let maxScore = 0;

              questions.forEach((q: any) => {
                  const qId = String(q.id);
                  const userAnswer = payload.answers[qId];
                  const weight = Number(q.bobot_nilai || 1);
                  
                  // Only count if question was displayed (if questionIds provided)
                  if (payload.questionIds && !payload.questionIds.includes(qId)) return;

                  maxScore += weight;

                  if (userAnswer) {
                      if (q.tipe_soal === 'PG' || q.tipe_soal === 'BS') {
                          // PG: Single Answer (A, B, C, D, E)
                          // BS: Boolean (true/false) mapped to key
                          if (String(userAnswer) === String(q.kunci_jawaban)) {
                              totalScore += weight;
                          }
                      } else if (q.tipe_soal === 'PGK') {
                          // PGK: Multiple Answers (Array)
                          // Simple scoring: All correct must be selected (exact match) or partial?
                          // Let's assume exact match for now or partial credit logic if needed.
                          // For simplicity: If array matches exactly (sorted)
                          const correctKeys = String(q.kunci_jawaban).split(',').map(k => k.trim());
                          const userKeys = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
                          
                          // Check if arrays have same elements
                          const isCorrect = correctKeys.length === userKeys.length && correctKeys.every(k => userKeys.includes(k));
                          if (isCorrect) totalScore += weight;
                      }
                  }
              });
              
              // Normalize score to 0-100 scale if needed, or keep raw score
              // Usually exams are 0-100.
              if (maxScore > 0) {
                  score = (totalScore / maxScore) * 100;
              }
          }
      } catch (e) {
          console.error("Error calculating score:", e);
      }
      
      // Check if exists
      const { data: existing } = await supabase
        .from('exam_results')
        .select('id')
        .eq('username', payload.user.username)
        .eq('exam_id', payload.subject)
        .single();

      const resultPayload = {
          username: payload.user.username,
          exam_id: payload.subject,
          answers: payload.answers,
          score: score,
          start_time: payload.startTime,
          end_time: new Date().getTime(),
          status: 'completed'
      };

      let error;
      if (existing) {
          const res = await supabase.from('exam_results').update(resultPayload).eq('id', existing.id);
          error = res.error;
      } else {
          const res = await supabase.from('exam_results').insert(resultPayload);
          error = res.error;
      }
      
      await supabase.from('users').update({ status: 'FINISHED' }).eq('username', payload.user.username);
      
      // Log Finish Activity
      await api.logActivity(payload.user.username, 'FINISH', payload.subject, { score: score });
      
      return { success: !error };
  },
  
  clearAllCache: async (): Promise<{success: boolean, message: string}> => {
      return { success: true, message: 'Cache cleared' };
  },

  getDashboardData: async () => {
      const { data: usersData } = await supabase.from('users').select('*');
      const { data: exams } = await supabase.from('exams').select('*');
      const { data: configData } = await supabase.from('config').select('*');
      const { data: schedules } = await supabase.from('school_schedules').select('*');
      
      // Fetch Activity Logs - JOIN IN MEMORY (More robust if FK is missing)
      const { data: activityFeed } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

      const feed = activityFeed?.map((log: any) => {
          const logUsername = String(log.username || '').toLowerCase();
          const user = (usersData || []).find((u: any) => String(u.username || '').toLowerCase() === logUsername);
          
          return {
              ...log,
              nama_lengkap: user?.nama_lengkap || log.username,
              school: user?.kelas_id || user?.id_sekolah || '-',
              kelas_id: user?.kelas_id || '-',
              kecamatan: user?.kecamatan || user?.id_kecamatan || '-',
              id_sekolah: user?.id_sekolah || '-',
              id_kecamatan: user?.id_kecamatan || '-'
          };
      }) || [];
      
      const users = (usersData || []).map((u: any) => ({
          ...u,
          username: String(u.username || ''),
          nama_lengkap: String(u.nama_lengkap || ''),
          role: String(u.role || 'siswa'), // Default to siswa
          status: String(u.status || 'OFFLINE'), // Default to OFFLINE
          kelas_id: String(u.kelas_id || ''),
          kecamatan: String(u.kecamatan || ''),
          id_sekolah: String(u.id_sekolah || ''),
          id_gugus: String(u.id_gugus || ''),
          id_kecamatan: String(u.id_kecamatan || ''),
          active_exam: String(u.active_exam || ''),
          session: String(u.session || ''),
          id_paket: String(u.id_paket || ''),
          photo_url: formatGoogleDriveUrl(u.photo_url)
      }));

      const configs = configData?.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}) || {};
      
      const activeSessions = [];
      for (let i = 1; i <= 4; i++) {
          const status = configs[`SESSION_${i}_STATUS`] || 'OFF';
          if (status === 'ON' || status === 'AKTIF' || status === 'ACTIVE' || status === 'TRUE' || status === '1') {
              activeSessions.push(i.toString());
          }
      }

      return {
          allUsers: users || [],
          activeExams: exams || [],
          token: configs['TOKEN'] || 'TOKEN',
          duration: parseInt(configs['DURATION'] || '60'),
          maxQuestions: parseInt(configs['MAX_QUESTIONS'] || '0'),
          surveyDuration: parseInt(configs['SURVEY_DURATION'] || '30'),
          configs: configs,
          activeSessions: activeSessions,
          schedules: schedules || [],
          activityFeed: feed
      };
  },

  saveExamProgress: async (userId: string, examId: string, progress: { answers: Record<string, any>, currentQuestionIndex: number }): Promise<{success: boolean}> => {
      // Check if exists
      const { data: existing } = await supabase
        .from('exam_results')
        .select('id')
        .eq('username', userId)
        .eq('exam_id', examId)
        .single();

      const payload = {
          username: userId,
          exam_id: examId,
          answers: progress.answers,
          current_question_index: progress.currentQuestionIndex,
          status: 'ongoing'
      };

      let error;
      if (existing) {
          const res = await supabase.from('exam_results').update(payload).eq('id', existing.id);
          error = res.error;
      } else {
          const res = await supabase.from('exam_results').insert(payload);
          error = res.error;
      }

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

