import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  FileCheck, 
  Printer, 
  Search, 
  RefreshCw, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileSpreadsheet, 
  X, 
  Clock, 
  User as UserIcon, 
  Award, 
  Check, 
  MinusCircle,
  HelpCircle,
  BookOpen,
  Filter
} from 'lucide-react';
import { api } from '../../services/api';
import { User, Exam, QuestionRow } from '../../types';
import { useAlert } from '../../context/AlertContext';
import { exportToExcel } from '../../utils/adminHelpers';
import { parseWacana } from '../../utils/wacanaHelper';
import Pagination from './Pagination';

interface HasilPekerjaanTabProps {
  students: any[];
  currentUser: User;
  configs: Record<string, string>;
}

interface StudentWorkItem {
  id: string;
  username: string;
  nama: string;
  sekolah: string;
  kecamatan: string;
  mapel: string;
  id_paket: string;
  session: string;
  nilai: number;
  start_time: number | string;
  end_time: number | string;
  durasi: number;
  answers: Record<string, any>;
  rawRecord: any;
}

interface EvaluatedQuestion {
  question: QuestionRow;
  userAnswer: any;
  status: 'CORRECT' | 'WRONG' | 'EMPTY';
  userScore: number;
  maxScore: number;
  userAnswerText: string;
  correctAnswerText: string;
  bsDetails?: Array<{
    code: string;
    text: string;
    userChoice: boolean | null;
    userChoiceLabel: string;
    correctChoice: boolean;
    isCorrect: boolean;
  }>;
}

const HasilPekerjaanTab: React.FC<HasilPekerjaanTabProps> = ({
  students,
  currentUser,
  configs
}) => {
  const { showAlert } = useAlert();

  // Data States
  const [examResults, setExamResults] = useState<any[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter States
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterPaket, setFilterPaket] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [filterKecamatan, setFilterKecamatan] = useState<string>('all');
  const [filterSession, setFilterSession] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Detail Modal State
  const [selectedStudentWork, setSelectedStudentWork] = useState<StudentWorkItem | null>(null);
  const [filterDetailStatus, setFilterDetailStatus] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'EMPTY'>('ALL');

  // User Map for enrichments
  const userMap = useMemo(() => {
    const map: Record<string, any> = {};
    students.forEach(s => {
      if (s.username) map[s.username] = s;
    });
    return map;
  }, [students]);

  // Load All Required Data
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    try {
      const [recapData, examsList, questionsList] = await Promise.all([
        api.getRecap(),
        api.getExams(),
        api.getAllQuestions()
      ]);

      setExamResults(recapData || []);
      setExams((examsList || []).filter(e => !e.id.startsWith('Survey_')));
      setAllQuestions(questionsList || []);
    } catch (e: any) {
      console.error('Failed to load hasil pekerjaan data:', e);
      showAlert('Gagal memuat data hasil pekerjaan siswa: ' + (e.message || ''), { type: 'error' });
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Map raw results into normalized items
  const normalizedItems = useMemo<StudentWorkItem[]>(() => {
    return examResults.map((r: any) => {
      const user = userMap[r.username];
      let parsedAnswers: Record<string, any> = {};

      if (typeof r.answers === 'string') {
        try {
          parsedAnswers = JSON.parse(r.answers);
        } catch (e) {
          parsedAnswers = {};
        }
      } else if (typeof r.answers === 'object' && r.answers !== null) {
        parsedAnswers = r.answers;
      }

      const durasiMenit = r.end_time && r.start_time
        ? Math.max(1, Math.round((Number(r.end_time) - Number(r.start_time)) / 60000))
        : (Number(r.durasi) || 0);

      return {
        id: String(r.id || `${r.username}_${r.mapel || r.exam_id}`),
        username: String(r.username || ''),
        nama: String(r.nama || user?.nama_lengkap || r.fullname || '-'),
        sekolah: String(r.sekolah || user?.kelas_id || r.school || '-'),
        kecamatan: String(r.kecamatan || user?.kecamatan || '-'),
        mapel: String(r.mapel || r.exam_id || r.subject || '-'),
        id_paket: String(r.id_paket || user?.id_paket || '-'),
        session: String(r.session || user?.session || '-'),
        nilai: Number(r.nilai ?? r.score ?? 0),
        start_time: r.start_time,
        end_time: r.end_time,
        durasi: durasiMenit,
        answers: parsedAnswers,
        rawRecord: r
      };
    });
  }, [examResults, userMap]);

  // Unique filter choices
  const uniqueSubjects = useMemo(() => {
    const subs = new Set<string>();
    normalizedItems.forEach(i => {
      if (i.mapel && i.mapel !== '-') subs.add(i.mapel);
    });
    return Array.from(subs).sort();
  }, [normalizedItems]);

  const uniquePakets = useMemo(() => {
    const pakets = new Set<string>();
    normalizedItems.forEach(i => {
      if (i.id_paket && i.id_paket !== '-') pakets.add(i.id_paket);
    });
    return Array.from(pakets).sort();
  }, [normalizedItems]);

  const uniqueSchools = useMemo(() => {
    const schools = new Set<string>();
    normalizedItems.forEach(i => {
      if (i.sekolah && i.sekolah !== '-') schools.add(i.sekolah);
    });
    return Array.from(schools).sort();
  }, [normalizedItems]);

  const uniqueKecamatans = useMemo(() => {
    const kecs = new Set<string>();
    normalizedItems.forEach(i => {
      if (i.kecamatan && i.kecamatan !== '-') kecs.add(i.kecamatan);
    });
    return Array.from(kecs).sort();
  }, [normalizedItems]);

  const uniqueSessions = useMemo(() => {
    const sessions = new Set<string>();
    normalizedItems.forEach(i => {
      if (i.session && i.session !== '-') sessions.add(i.session);
    });
    return Array.from(sessions).sort();
  }, [normalizedItems]);

  // Filtered List
  const filteredData = useMemo(() => {
    return normalizedItems.filter(item => {
      // Role security restriction
      if (currentUser.role === 'admin_sekolah' || currentUser.role === 'proktor') {
        const userSchool = (currentUser.kelas_id || currentUser.id_sekolah || '').toLowerCase();
        if (item.sekolah.toLowerCase() !== userSchool) return false;
      }

      // Filter Mapel
      if (filterSubject !== 'all' && item.mapel !== filterSubject) return false;

      // Filter Paket
      if (filterPaket !== 'all' && item.id_paket !== filterPaket) return false;

      // Filter Sekolah
      if (filterSchool !== 'all' && item.sekolah !== filterSchool) return false;

      // Filter Kecamatan
      if (filterKecamatan !== 'all' && item.kecamatan.toLowerCase() !== filterKecamatan.toLowerCase()) return false;

      // Filter Sesi
      if (filterSession !== 'all' && item.session !== filterSession) return false;

      // Search Term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = item.nama.toLowerCase().includes(query);
        const matchUser = item.username.toLowerCase().includes(query);
        const matchSchool = item.sekolah.toLowerCase().includes(query);
        if (!matchName && !matchUser && !matchSchool) return false;
      }

      return true;
    });
  }, [normalizedItems, currentUser, filterSubject, filterPaket, filterSchool, filterKecamatan, filterSession, searchTerm]);

  // Overall Statistics for current filtered items
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return { total: 0, avg: 0, max: 0, min: 0 };
    }
    const scores = filteredData.map(d => d.nilai);
    const total = scores.length;
    const sum = scores.reduce((acc, val) => acc + val, 0);
    const avg = Math.round((sum / total) * 10) / 10;
    const max = Math.max(...scores);
    const min = Math.min(...scores);

    return { total, avg, max, min };
  }, [filteredData]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  // Evaluate all questions for a selected student's exam
  const evaluateStudentWork = useCallback((studentItem: StudentWorkItem): {
    evaluatedQuestions: EvaluatedQuestion[];
    summary: {
      total: number;
      correct: number;
      wrong: number;
      empty: number;
      score: number;
      maxScore: number;
      percentage: number;
    };
  } => {
    // Filter questions by subject and optionally by paket
    const relevantQuestions = allQuestions.filter(q => {
      if (q.exam_id !== studentItem.mapel) return false;
      if (studentItem.id_paket && studentItem.id_paket !== '-' && q.id_paket) {
        return q.id_paket === studentItem.id_paket;
      }
      return true;
    });

    // If no questions matched subject+paket, fallback to subject alone
    const questionsToUse = relevantQuestions.length > 0 
      ? relevantQuestions 
      : allQuestions.filter(q => q.exam_id === studentItem.mapel);

    let correctCount = 0;
    let wrongCount = 0;
    let emptyCount = 0;
    let totalScoreEarned = 0;
    let maxScorePossible = 0;

    const evaluatedQuestions: EvaluatedQuestion[] = questionsToUse.map(q => {
      const qId = q.id;
      const rawUserAnswer = studentItem.answers ? studentItem.answers[qId] : undefined;
      const weight = Number(q.bobot || 1);
      maxScorePossible += weight;

      let effectiveRawAnswer = rawUserAnswer;
      if (typeof effectiveRawAnswer === 'string') {
        const trimmed = effectiveRawAnswer.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            effectiveRawAnswer = JSON.parse(trimmed);
          } catch {
            // keep as string
          }
        }
      }

      // Check if answered
      const isAnswerEmpty = effectiveRawAnswer === undefined ||
        effectiveRawAnswer === null ||
        effectiveRawAnswer === '' ||
        (Array.isArray(effectiveRawAnswer) && effectiveRawAnswer.length === 0) ||
        (typeof effectiveRawAnswer === 'object' && Object.keys(effectiveRawAnswer).length === 0);

      const normalizedKunci = String(q.kunci_jawaban || '').trim().toUpperCase();

      let status: 'CORRECT' | 'WRONG' | 'EMPTY' = 'WRONG';
      let userScore = 0;
      let userAnswerText = '-';
      let correctAnswerText = '-';
      let bsDetails: any[] | undefined = undefined;

      const getOptionText = (key: string) => {
        const lower = key.toLowerCase();
        if (lower === 'a') return q.opsi_a;
        if (lower === 'b') return q.opsi_b;
        if (lower === 'c') return q.opsi_c;
        if (lower === 'd') return q.opsi_d;
        return '';
      };

      if (isAnswerEmpty) {
        status = 'EMPTY';
        emptyCount++;
        userAnswerText = '(Tidak Dijawab / Kosong)';

        if (q.tipe_soal === 'PG') {
          correctAnswerText = `${normalizedKunci}. ${getOptionText(normalizedKunci)}`;
        } else if (q.tipe_soal === 'BS') {
          const correctValues = normalizedKunci.split(',').map(v => v.trim()).filter(Boolean);
          const optionKeys = ['A', 'B', 'C', 'D', 'E'];
          correctAnswerText = correctValues.map((v, i) => {
            const optKey = optionKeys[i] || `P${i + 1}`;
            const isTrue = ['B', 'T', '1', 'BENAR', 'TRUE'].includes(v.toUpperCase());
            return `${optKey}: ${isTrue ? 'BENAR' : 'SALAH'}`;
          }).join(', ');
        } else {
          correctAnswerText = normalizedKunci;
        }
      } else if (q.tipe_soal === 'PG') {
        const userChoice = String(effectiveRawAnswer).trim().toUpperCase();
        const optTxt = getOptionText(userChoice);
        userAnswerText = optTxt ? `${userChoice}. ${optTxt}` : userChoice;
        correctAnswerText = `${normalizedKunci}. ${getOptionText(normalizedKunci)}`;

        if (userChoice === normalizedKunci) {
          status = 'CORRECT';
          userScore = weight;
          correctCount++;
          totalScoreEarned += weight;
        } else {
          status = 'WRONG';
          wrongCount++;
        }
      } else if (q.tipe_soal === 'PGK') {
        // Pilihan Ganda Kompleks
        const correctKeys = normalizedKunci.split(',').map(k => k.trim()).filter(Boolean);
        const userKeys = (Array.isArray(effectiveRawAnswer) ? effectiveRawAnswer : String(effectiveRawAnswer).split(','))
          .map(k => String(k).trim().toUpperCase())
          .filter(Boolean);

        userAnswerText = userKeys.length > 0
          ? userKeys.map(k => {
              const optTxt = getOptionText(k);
              return optTxt ? `${k}. ${optTxt}` : k;
            }).join(' | ')
          : '(Tidak Dijawab / Kosong)';
        correctAnswerText = correctKeys.map(k => {
          const optTxt = getOptionText(k);
          return optTxt ? `${k}. ${optTxt}` : k;
        }).join(' | ');

        const isExactMatch = correctKeys.length === userKeys.length && correctKeys.every(k => userKeys.includes(k));
        if (isExactMatch && correctKeys.length > 0) {
          status = 'CORRECT';
          userScore = weight;
          correctCount++;
          totalScoreEarned += weight;
        } else if (userKeys.length === 0) {
          status = 'EMPTY';
          emptyCount++;
        } else {
          status = 'WRONG';
          wrongCount++;
        }
      } else if (q.tipe_soal === 'BS') {
        // Benar / Salah
        const correctValues = normalizedKunci.split(',').map(v => v.trim()).filter(Boolean);
        const optionKeys = ['A', 'B', 'C', 'D', 'E'];

        let userObj: Record<string, any> = {};
        if (typeof effectiveRawAnswer === 'string') {
          const trimmed = effectiveRawAnswer.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              userObj = JSON.parse(trimmed);
            } catch {
              userObj = {};
            }
          } else if (trimmed.includes(',')) {
            trimmed.split(',').forEach((val, idx) => {
              const k = optionKeys[idx] || `P${idx + 1}`;
              userObj[k] = val.trim();
            });
          } else if (trimmed !== '') {
            userObj['A'] = trimmed;
          }
        } else if (Array.isArray(effectiveRawAnswer)) {
          effectiveRawAnswer.forEach((val, idx) => {
            const k = optionKeys[idx] || `P${idx + 1}`;
            userObj[k] = val;
          });
        } else if (typeof effectiveRawAnswer === 'object' && effectiveRawAnswer !== null) {
          userObj = effectiveRawAnswer;
        }

        let allStatementsCorrect = true;
        let anyAnswered = false;

        bsDetails = correctValues.map((corrVal, idx) => {
          const optKey = optionKeys[idx] || `P${idx + 1}`;
          const statementText = getOptionText(optKey);

          const rawVal = userObj[optKey] !== undefined
            ? userObj[optKey]
            : userObj[optKey.toLowerCase()] !== undefined
            ? userObj[optKey.toLowerCase()]
            : userObj[idx] !== undefined
            ? userObj[idx]
            : undefined;

          let isUserChoice: boolean | null = null;
          let userChoiceLabel = '-';

          if (rawVal === true || rawVal === 'true' || rawVal === 'B' || rawVal === '1' || rawVal === 'BENAR' || rawVal === 'TRUE') {
            isUserChoice = true;
            userChoiceLabel = 'BENAR';
            anyAnswered = true;
          } else if (rawVal === false || rawVal === 'false' || rawVal === 'S' || rawVal === '0' || rawVal === 'SALAH' || rawVal === 'FALSE') {
            isUserChoice = false;
            userChoiceLabel = 'SALAH';
            anyAnswered = true;
          } else if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
            userChoiceLabel = String(rawVal).trim().toUpperCase();
            anyAnswered = true;
          }

          const shouldBeTrue = ['B', 'T', '1', 'BENAR', 'TRUE'].includes(corrVal.toUpperCase());
          const isStatementCorrect = isUserChoice !== null && isUserChoice === shouldBeTrue;

          if (!isStatementCorrect) allStatementsCorrect = false;

          return {
            code: optKey,
            text: statementText || `Pernyataan ${idx + 1}`,
            userChoice: isUserChoice,
            userChoiceLabel,
            correctChoice: shouldBeTrue,
            isCorrect: isStatementCorrect
          };
        });

        // Always display whatever the student chose for all statements:
        const studentAnsList = bsDetails.map(d => `${d.code}: ${d.userChoiceLabel}`);

        // If student answered additional keys not in correctValues
        Object.keys(userObj).forEach(key => {
          const upperKey = key.toUpperCase();
          if (!optionKeys.slice(0, correctValues.length).includes(upperKey)) {
            const extraVal = userObj[key];
            const isTrue = extraVal === true || extraVal === 'true' || extraVal === 'B' || extraVal === '1' || extraVal === 'BENAR';
            const isFalse = extraVal === false || extraVal === 'false' || extraVal === 'S' || extraVal === '0' || extraVal === 'SALAH';
            const label = isTrue ? 'BENAR' : isFalse ? 'SALAH' : String(extraVal);
            studentAnsList.push(`${upperKey}: ${label}`);
            anyAnswered = true;
          }
        });

        if (!anyAnswered) {
          if (effectiveRawAnswer !== undefined && effectiveRawAnswer !== null && String(effectiveRawAnswer).trim() !== '') {
            userAnswerText = String(effectiveRawAnswer);
            status = 'WRONG';
            wrongCount++;
          } else {
            status = 'EMPTY';
            emptyCount++;
            userAnswerText = '(Tidak Dijawab / Kosong)';
          }
        } else if (allStatementsCorrect && correctValues.length > 0) {
          status = 'CORRECT';
          userScore = weight;
          correctCount++;
          totalScoreEarned += weight;
          userAnswerText = studentAnsList.join(', ');
        } else {
          status = 'WRONG';
          wrongCount++;
          userAnswerText = studentAnsList.join(', ');
        }

        correctAnswerText = correctValues.map((v, i) => {
          const optKey = optionKeys[i] || `P${i + 1}`;
          const isTrue = ['B', 'T', '1', 'BENAR', 'TRUE'].includes(v.toUpperCase());
          return `${optKey}: ${isTrue ? 'BENAR' : 'SALAH'}`;
        }).join(', ');
      } else {
        // Fallback (Isian / Menjodohkan / etc.)
        let userVal = '';
        if (typeof effectiveRawAnswer === 'object' && effectiveRawAnswer !== null) {
          try {
            userVal = JSON.stringify(effectiveRawAnswer);
          } catch {
            userVal = String(effectiveRawAnswer);
          }
        } else if (effectiveRawAnswer !== undefined && effectiveRawAnswer !== null) {
          userVal = String(effectiveRawAnswer).trim();
        }

        userAnswerText = userVal || '(Tidak Dijawab / Kosong)';
        correctAnswerText = normalizedKunci;
        const normalizedUser = userVal.toUpperCase();
        if (normalizedUser === normalizedKunci && normalizedKunci !== '') {
          status = 'CORRECT';
          userScore = weight;
          correctCount++;
          totalScoreEarned += weight;
        } else if (!userVal) {
          status = 'EMPTY';
          emptyCount++;
        } else {
          status = 'WRONG';
          wrongCount++;
        }
      }

      return {
        question: q,
        userAnswer: rawUserAnswer,
        status,
        userScore,
        maxScore: weight,
        userAnswerText,
        correctAnswerText,
        bsDetails
      };
    });

    const total = evaluatedQuestions.length;
    const finalScore = studentItem.nilai !== undefined && studentItem.nilai !== null
      ? studentItem.nilai
      : maxScorePossible > 0 ? Math.round((totalScoreEarned / maxScorePossible) * 100) : 0;

    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return {
      evaluatedQuestions,
      summary: {
        total,
        correct: correctCount,
        wrong: wrongCount,
        empty: emptyCount,
        score: finalScore,
        maxScore: maxScorePossible,
        percentage
      }
    };
  }, [allQuestions]);

  // Export filtered summary to Excel
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      return showAlert('Tidak ada data untuk diexport.', { type: 'warning' });
    }

    const exportRows = filteredData.map((d, index) => {
      const evaluation = evaluateStudentWork(d);
      return {
        'No': index + 1,
        'Username / NISN': d.username,
        'Nama Siswa': d.nama,
        'Sekolah': d.sekolah,
        'Kecamatan': d.kecamatan,
        'Mata Pelajaran': d.mapel,
        'Paket Soal': d.id_paket,
        'Sesi': d.session,
        'Durasi (Menit)': d.durasi,
        'Total Soal': evaluation.summary.total,
        'Benar': evaluation.summary.correct,
        'Salah': evaluation.summary.wrong,
        'Kosong': evaluation.summary.empty,
        'Nilai Akhir': d.nilai
      };
    });

    exportToExcel(exportRows, `Laporan_Hasil_Pekerjaan_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showAlert('Data berhasil diexport ke Excel.', { type: 'success' });
  };

  // Print Summary Table of All Filtered Students
  const handlePrintSummary = () => {
    if (filteredData.length === 0) {
      return showAlert('Tidak ada data untuk dicetak.', { type: 'warning' });
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return showAlert('Pop-up terblokir. Harap izinkan pop-up browser.', { type: 'error' });
    }

    const logoKiri = configs.LOGO_KIRI_URL || 'https://image2url.com/r2/default/images/1769821786493-a2e4eb8b-c903-460d-b8d9-44f326ff71bb.png';
    const logoKanan = configs.LOGO_KANAN_URL || 'https://image2url.com/r2/default/images/1769821862384-d6ef24bf-e12c-4616-a255-7366afae4c30.png';
    const headerMaster = configs.PRINT_HEADER_MASTER || configs.HEADER_KARTU_PESERTA || 'TRY OUT TKA TAHUN 2026';

    const rowsHtml = filteredData.map((d, idx) => {
      const evaluation = evaluateStudentWork(d);
      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold;">${d.username}</td>
          <td style="font-weight: 600;">${d.nama}</td>
          <td>${d.sekolah}</td>
          <td>${d.kecamatan}</td>
          <td>${d.mapel}</td>
          <td style="text-align: center;">${d.id_paket}</td>
          <td style="text-align: center;">${d.session}</td>
          <td style="text-align: center; color: #16a34a; font-weight: bold;">${evaluation.summary.correct}</td>
          <td style="text-align: center; color: #dc2626; font-weight: bold;">${evaluation.summary.wrong}</td>
          <td style="text-align: center; color: #ca8a04;">${evaluation.summary.empty}</td>
          <td style="text-align: center; font-size: 11pt; font-weight: bold; background-color: #f8fafc;">${d.nilai}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Rekap Hasil Tes Siswa - ${headerMaster}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          *, *::before, *::after { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Times New Roman', Times, Arial, sans-serif; margin: 0; padding: 0; color: #000; font-size: 9.5pt; }
          .kop { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px double #000; padding-bottom: 8px; margin-bottom: 12px; }
          .kop img { height: 55px; width: auto; max-width: 80px; object-fit: contain; }
          .kop-text { text-align: center; flex: 1; padding: 0 10px; }
          .kop-text h2 { margin: 0; font-size: 13pt; text-transform: uppercase; font-weight: bold; }
          .kop-text h3 { margin: 2px 0 0; font-size: 10.5pt; font-weight: 600; }
          .info-box { margin-bottom: 12px; font-size: 9pt; }
          table.data { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
          table.data th, table.data td { border: 1px solid #000; padding: 4px 6px; }
          table.data th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
          .footer-sig { margin-top: 25px; float: right; width: 220px; text-align: center; font-size: 9.5pt; page-break-inside: avoid; }
          .sig-space { height: 50px; }
        </style>
      </head>
      <body>
        <div class="kop">
          <img src="${logoKiri}" alt="Logo Kiri" />
          <div class="kop-text">
            <h2>LEMBAR LAPORAN REKAP HASIL TES SISWA</h2>
            <h3>${headerMaster}</h3>
            <p style="margin: 2px 0 0; font-size: 8.5pt; font-style: italic;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          </div>
          <img src="${logoKanan}" alt="Logo Kanan" />
        </div>

        <div class="info-box">
          <table style="width: 100%; font-size: 9pt;">
            <tr>
              <td style="width: 15%;">Mata Pelajaran</td>
              <td style="width: 35%;">: <b>${filterSubject === 'all' ? 'Semua Mata Pelajaran' : filterSubject}</b></td>
              <td style="width: 15%;">Sekolah</td>
              <td style="width: 35%;">: <b>${filterSchool === 'all' ? 'Semua Sekolah' : filterSchool}</b></td>
            </tr>
            <tr>
              <td>Kecamatan</td>
              <td>: <b>${filterKecamatan === 'all' ? 'Semua Kecamatan' : filterKecamatan}</b></td>
              <td>Total Peserta</td>
              <td>: <b>${filteredData.length} Siswa</b> (Rata-rata: ${stats.avg})</td>
            </tr>
          </table>
        </div>

        <table class="data">
          <thead>
            <tr>
              <th style="width: 30px;">No</th>
              <th>Username</th>
              <th>Nama Siswa</th>
              <th>Sekolah</th>
              <th>Kecamatan</th>
              <th>Mapel</th>
              <th>Paket</th>
              <th>Sesi</th>
              <th style="width: 45px;">Benar</th>
              <th style="width: 45px;">Salah</th>
              <th style="width: 45px;">Kosong</th>
              <th style="width: 55px;">Nilai</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer-sig">
          <p>${filterKecamatan !== 'all' ? filterKecamatan : 'Kabupaten'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p>Proktor / Penanggung Jawab,</p>
          <div class="sig-space"></div>
          <p style="font-weight: bold; text-decoration: underline;">${currentUser.nama_lengkap || '....................................'}</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Print Single Student Answer Sheet (Lembar Hasil Tes Siswa)
  const handlePrintStudentSheet = (studentItem: StudentWorkItem) => {
    const evaluation = evaluateStudentWork(studentItem);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return showAlert('Pop-up terblokir. Harap izinkan pop-up browser.', { type: 'error' });
    }

    const logoKiri = configs.LOGO_KIRI_URL || 'https://image2url.com/r2/default/images/1769821786493-a2e4eb8b-c903-460d-b8d9-44f326ff71bb.png';
    const logoKanan = configs.LOGO_KANAN_URL || 'https://image2url.com/r2/default/images/1769821862384-d6ef24bf-e12c-4616-a255-7366afae4c30.png';
    const headerMaster = configs.PRINT_HEADER_MASTER || configs.HEADER_KARTU_PESERTA || 'TRY OUT TKA TAHUN 2026';

    const questionsHtml = evaluation.evaluatedQuestions.map((eq, idx) => {
      const q = eq.question;
      const isCorrect = eq.status === 'CORRECT';
      const isWrong = eq.status === 'WRONG';
      const isEmpty = eq.status === 'EMPTY';

      const statusBadge = isCorrect
        ? '<span style="background-color: #dcfce7; color: #15803d; border: 1px solid #86efac; font-weight: bold; padding: 2px 8px; border-radius: 4px; font-size: 8pt;">BENAR (+'+eq.userScore+' Poin)</span>'
        : isWrong
        ? '<span style="background-color: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-weight: bold; padding: 2px 8px; border-radius: 4px; font-size: 8pt;">SALAH (0 Poin)</span>'
        : '<span style="background-color: #fef9c3; color: #854d0e; border: 1px solid #fde047; font-weight: bold; padding: 2px 8px; border-radius: 4px; font-size: 8pt;">TIDAK DIJAWAB (0 Poin)</span>';

      // Parse Wacana if present
      let wacanaHtml = '';
      if (q.gambar && (q.gambar.includes('\n') || q.gambar.length > 200 || !q.gambar.startsWith('http'))) {
        const { title, paragraphs } = parseWacana(q.gambar);
        wacanaHtml = `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 8px; font-size: 9pt;">
            <div style="font-weight: bold; font-size: 7.5pt; color: #4338ca; text-transform: uppercase; margin-bottom: 4px;">Teks / Wacana Bacaan</div>
            ${title ? `<div style="text-align: center; font-weight: bold; font-size: 10.5pt; margin-bottom: 6px;">${title}</div>` : ''}
            <div style="text-align: justify; line-height: 1.4; color: #334155;">
              ${paragraphs.map(p => `<p style="margin: 3px 0; text-indent: 16px;">${p}</p>`).join('')}
            </div>
          </div>
        `;
      } else if (q.gambar && (q.gambar.startsWith('http') || q.gambar.startsWith('data:image'))) {
        wacanaHtml = `
          <div style="text-align: center; margin: 8px 0;">
            <img src="${q.gambar}" style="max-width: 100%; max-height: 220px; border: 1px solid #cbd5e1; border-radius: 4px;" alt="Media Soal" />
            ${q.keterangan_gambar ? `<div style="font-size: 8pt; color: #64748b; font-style: italic; margin-top: 2px;">${q.keterangan_gambar}</div>` : ''}
          </div>
        `;
      }

      // Options list
      const options = [
        { key: 'A', text: q.opsi_a },
        { key: 'B', text: q.opsi_b },
        { key: 'C', text: q.opsi_c },
        { key: 'D', text: q.opsi_d }
      ].filter(o => o.text && String(o.text).trim() !== '');

      let optionsHtml = '';
      if (q.tipe_soal === 'BS' && eq.bsDetails && eq.bsDetails.length > 0) {
        optionsHtml = `
          <div style="margin: 6px 0 8px 0; font-size: 8.5pt;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 4px;">
              <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                  <th style="padding: 4px 8px; text-align: left; font-size: 8pt; color: #475569;">PERNYATAAN</th>
                  <th style="padding: 4px 8px; text-align: center; width: 120px; font-size: 8pt; color: #475569;">PILIHAN SISWA</th>
                  <th style="padding: 4px 8px; text-align: center; width: 80px; font-size: 8pt; color: #475569;">KUNCI</th>
                </tr>
              </thead>
              <tbody>
                ${eq.bsDetails.map(d => `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 4px 8px; line-height: 1.35;"><b>${d.code}.</b> ${d.text}</td>
                    <td style="padding: 4px 8px; text-align: center; font-weight: bold; color: ${d.isCorrect ? '#166534' : d.userChoiceLabel !== '-' ? '#991b1b' : '#854d0e'};">
                      ${d.userChoiceLabel}
                    </td>
                    <td style="padding: 4px 8px; text-align: center; font-weight: bold; color: #15803d;">
                      ${d.correctChoice ? 'BENAR' : 'SALAH'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } else if (options.length > 0) {
        optionsHtml = `
          <div style="margin: 6px 0 8px 12px; font-size: 9pt; line-height: 1.35;">
            ${options.map(o => {
              const isUserPick = String(eq.userAnswer).trim().toUpperCase() === o.key;
              const isKunciPick = String(q.kunci_jawaban).trim().toUpperCase() === o.key;
              let optStyle = 'margin: 2px 0; padding: 2px 4px; border-radius: 4px;';
              let markBadge = '';

              if (isUserPick && isCorrect) {
                optStyle += ' background-color: #dcfce7; font-weight: bold; color: #166534;';
                markBadge = ' <span style="font-size: 7.5pt; color: #166534;">(Jawaban Siswa - BENAR)</span>';
              } else if (isUserPick && isWrong) {
                optStyle += ' background-color: #fee2e2; font-weight: bold; color: #991b1b;';
                markBadge = ' <span style="font-size: 7.5pt; color: #991b1b;">(Jawaban Siswa - SALAH)</span>';
              } else if (isKunciPick) {
                optStyle += ' background-color: #f0fdf4; border-left: 3px solid #22c55e; color: #15803d;';
                markBadge = ' <span style="font-size: 7.5pt; color: #15803d;">(Kunci Jawaban)</span>';
              }

              return `<div style="${optStyle}"><b>${o.key}.</b> ${o.text}${markBadge}</div>`;
            }).join('')}
          </div>
        `;
      }

      return `
        <div class="question-item" style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; background-color: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px;">
            <div>
              <span style="font-weight: bold; font-size: 10pt; color: #1e293b;">Soal No. ${idx + 1}</span>
              <span style="font-size: 8pt; color: #64748b; margin-left: 8px;">[Tipe: ${q.tipe_soal || 'PG'}]</span>
              <span style="font-size: 8pt; color: #64748b; margin-left: 6px;">(Bobot: ${q.bobot || 1} poin)</span>
            </div>
            <div>${statusBadge}</div>
          </div>

          ${wacanaHtml}

          <div style="font-size: 9.5pt; font-weight: 500; color: #0f172a; margin-bottom: 6px; line-height: 1.4;">
            ${q.text_soal}
          </div>

          ${optionsHtml}

          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 6px 10px; font-size: 8.5pt; margin-top: 6px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 25%; font-weight: bold; color: ${isCorrect ? '#166534' : isWrong ? '#991b1b' : '#854d0e'};">
                  Jawaban Siswa:
                </td>
                <td style="width: 75%; font-weight: 600; color: ${isCorrect ? '#166534' : isWrong ? '#991b1b' : '#854d0e'};">
                  ${eq.userAnswerText}
                </td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #1e293b;">Kunci Jawaban:</td>
                <td style="font-weight: 600; color: #166534;">
                  ${eq.correctAnswerText}
                </td>
              </tr>
            </table>
          </div>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Lembar Hasil Tes Siswa - ${studentItem.nama}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 10mm 12mm 10mm; }
          *, *::before, *::after { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Times New Roman', Times, Arial, sans-serif; margin: 0; padding: 0; color: #000; font-size: 9.5pt; line-height: 1.3; }
          .kop { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px double #000; padding-bottom: 8px; margin-bottom: 12px; }
          .kop img { height: 60px; width: auto; max-width: 80px; object-fit: contain; }
          .kop-text { text-align: center; flex: 1; padding: 0 10px; }
          .kop-text h2 { margin: 0; font-size: 13pt; text-transform: uppercase; font-weight: bold; }
          .kop-text h3 { margin: 2px 0 0; font-size: 11pt; font-weight: bold; color: #1e3a8a; }
          .kop-text p { margin: 2px 0 0; font-size: 8.5pt; }
          .student-info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9pt; }
          .student-info-table td { padding: 3px 4px; vertical-align: top; }
          .score-card { display: flex; border: 2px solid #0f172a; border-radius: 8px; background-color: #f8fafc; padding: 10px 14px; margin-bottom: 14px; align-items: center; justify-content: space-between; }
          .score-badge { text-align: center; border-right: 2px solid #cbd5e1; padding-right: 18px; margin-right: 14px; }
          .score-num { font-size: 24pt; font-weight: 900; color: #1e3a8a; line-height: 1; }
          .score-label { font-size: 8pt; font-weight: bold; text-transform: uppercase; margin-top: 2px; color: #475569; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex: 1; text-align: center; }
          .stat-cell { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 6px; }
          .stat-val { font-size: 11pt; font-weight: bold; }
          .stat-lbl { font-size: 7.5pt; color: #64748b; font-weight: 600; text-transform: uppercase; }
          .footer-signatures { margin-top: 20px; width: 100%; display: flex; justify-content: space-between; page-break-inside: avoid; break-inside: avoid; font-size: 9pt; }
          .sig-box { width: 220px; text-align: center; }
          .sig-line { height: 50px; }
          .no-break { page-break-inside: avoid; break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="kop">
          <img src="${logoKiri}" alt="Logo" />
          <div class="kop-text">
            <h2>LEMBAR HASIL TES SISWA</h2>
            <h3>UJIAN BERBASIS KOMPUTER (CBT)</h3>
            <p>${headerMaster}</p>
          </div>
          <img src="${logoKanan}" alt="Logo" />
        </div>

        <table class="student-info-table">
          <tr>
            <td style="width: 18%; font-weight: bold;">Nama Peserta</td>
            <td style="width: 2%;">:</td>
            <td style="width: 35%; font-weight: bold; font-size: 10pt; color: #0f172a;">${studentItem.nama}</td>
            <td style="width: 16%; font-weight: bold;">Mata Pelajaran</td>
            <td style="width: 2%;">:</td>
            <td style="width: 27%; font-weight: bold;">${studentItem.mapel}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Username / NISN</td>
            <td>:</td>
            <td style="font-family: monospace; font-weight: bold;">${studentItem.username}</td>
            <td style="font-weight: bold;">Paket / Sesi</td>
            <td>:</td>
            <td>${studentItem.id_paket} / Sesi ${studentItem.session}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Asal Sekolah</td>
            <td>:</td>
            <td>${studentItem.sekolah}</td>
            <td style="font-weight: bold;">Durasi Ujian</td>
            <td>:</td>
            <td>${studentItem.durasi} Menit</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Kecamatan</td>
            <td>:</td>
            <td colspan="4">${studentItem.kecamatan}</td>
          </tr>
        </table>

        <div class="score-card">
          <div class="score-badge">
            <div class="score-num">${studentItem.nilai}</div>
            <div class="score-label">Nilai Akhir</div>
          </div>
          <div class="stats-grid">
            <div class="stat-cell">
              <div class="stat-val" style="color: #0f172a;">${evaluation.summary.total}</div>
              <div class="stat-lbl">Total Soal</div>
            </div>
            <div class="stat-cell" style="border-color: #86efac; background-color: #f0fdf4;">
              <div class="stat-val" style="color: #16a34a;">${evaluation.summary.correct}</div>
              <div class="stat-lbl" style="color: #15803d;">Benar</div>
            </div>
            <div class="stat-cell" style="border-color: #fca5a5; background-color: #fef2f2;">
              <div class="stat-val" style="color: #dc2626;">${evaluation.summary.wrong}</div>
              <div class="stat-lbl" style="color: #b91c1c;">Salah</div>
            </div>
            <div class="stat-cell" style="border-color: #fde047; background-color: #fefce8;">
              <div class="stat-val" style="color: #ca8a04;">${evaluation.summary.empty}</div>
              <div class="stat-lbl" style="color: #854d0e;">Kosong</div>
            </div>
          </div>
        </div>

        <div style="font-weight: bold; font-size: 10pt; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px;">
          Rincian Hasil Pengerjaan & Jawaban Siswa
        </div>

        <div class="questions-container">
          ${questionsHtml}
        </div>

        <div class="footer-signatures">
          <div class="sig-box">
            <p>Mengetahui,</p>
            <p>Siswa Peserta Ujian</p>
            <div class="sig-line"></div>
            <p style="font-weight: bold; text-decoration: underline;">${studentItem.nama}</p>
          </div>
          <div class="sig-box">
            <p>${studentItem.kecamatan !== '-' ? studentItem.kecamatan : 'Tempat'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p>Proktor / Pengawas Ujian,</p>
            <div class="sig-line"></div>
            <p style="font-weight: bold; text-decoration: underline;">${currentUser.nama_lengkap || '....................................'}</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Evaluation for active selected student modal
  const activeStudentEvaluation = useMemo(() => {
    if (!selectedStudentWork) return null;
    return evaluateStudentWork(selectedStudentWork);
  }, [selectedStudentWork, evaluateStudentWork]);

  // Filtered evaluated questions inside modal
  const filteredModalQuestions = useMemo(() => {
    if (!activeStudentEvaluation) return [];
    if (filterDetailStatus === 'ALL') return activeStudentEvaluation.evaluatedQuestions;
    return activeStudentEvaluation.evaluatedQuestions.filter(eq => eq.status === filterDetailStatus);
  }, [activeStudentEvaluation, filterDetailStatus]);

  return (
    <div className="space-y-6 fade-in pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <FileCheck size={14} className="text-amber-300" />
            <span>Laporan & Evaluasi Siswa</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Hasil Tes Siswa
          </h1>
          <p className="text-indigo-100 text-sm md:text-base mt-1 max-w-2xl">
            Tinjau lembar jawaban, identitas, rincian jawaban siswa, serta cetak laporan lembar tes peserta ujian.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => loadData()}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/20 transition backdrop-blur-md disabled:opacity-50 active:scale-95"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Menyinkron...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-700/20 transition active:scale-95"
          >
            <FileSpreadsheet size={16} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrintSummary}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 text-sm font-bold rounded-xl shadow-lg shadow-black/10 transition active:scale-95"
          >
            <Printer size={16} />
            <span>Cetak Rekap Hasil</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Peserta Tes</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{stats.total} <span className="text-xs font-medium text-slate-400">Siswa</span></p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rata-rata Nilai</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{stats.avg}</p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nilai Tertinggi</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.max}</p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nilai Terendah</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{stats.min}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama siswa, username / NISN, atau sekolah..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Mapel */}
            <select
              value={filterSubject}
              onChange={(e) => {
                setFilterSubject(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Mapel</option>
              {uniqueSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>

            {/* Filter Paket */}
            <select
              value={filterPaket}
              onChange={(e) => {
                setFilterPaket(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Paket</option>
              {uniquePakets.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Filter Sekolah (Only for pusat) */}
            {currentUser.role === 'admin_pusat' && (
              <select
                value={filterSchool}
                onChange={(e) => {
                  setFilterSchool(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
              >
                <option value="all">Semua Sekolah</option>
                {uniqueSchools.map(sch => (
                  <option key={sch} value={sch}>{sch}</option>
                ))}
              </select>
            )}

            {/* Filter Kecamatan */}
            <select
              value={filterKecamatan}
              onChange={(e) => {
                setFilterKecamatan(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Kecamatan</option>
              {uniqueKecamatans.map(kec => (
                <option key={kec} value={kec}>{kec}</option>
              ))}
            </select>

            {/* Filter Sesi */}
            <select
              value={filterSession}
              onChange={(e) => {
                setFilterSession(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Sesi</option>
              {uniqueSessions.map(ses => (
                <option key={ses} value={ses}>Sesi {ses}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th className="py-3.5 px-4">Username / NISN</th>
                <th className="py-3.5 px-4">Nama Peserta</th>
                <th className="py-3.5 px-4">Sekolah</th>
                <th className="py-3.5 px-4">Mapel & Paket</th>
                <th className="py-3.5 px-4 text-center">Sesi</th>
                <th className="py-3.5 px-4 text-center">Durasi</th>
                <th className="py-3.5 px-4 text-center">Hasil (B/S/K)</th>
                <th className="py-3.5 px-4 text-center">Nilai Akhir</th>
                <th className="py-3.5 px-4 text-center w-40">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-indigo-500" />
                      <span>Memuat data hasil pekerjaan siswa...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={28} className="text-slate-300" />
                      <span className="font-semibold text-slate-500">Tidak ada hasil pekerjaan yang sesuai filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => {
                  const evaluation = evaluateStudentWork(item);

                  return (
                    <tr key={item.id} className="hover:bg-indigo-50/40 transition">
                      <td className="py-3 px-4 text-center font-medium text-slate-500">
                        {(currentPage - 1) * rowsPerPage + idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 text-xs">
                        {item.username}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.nama}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{item.sekolah}</div>
                        <div className="text-[11px] text-slate-400">{item.kecamatan}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-indigo-700">{item.mapel}</div>
                        <div className="text-[11px] text-slate-400">Paket: {item.id_paket}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
                          {item.session}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Clock size={12} className="text-slate-400" />
                          {item.durasi}m
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 text-xs font-bold font-mono">
                          <span className="text-emerald-600" title="Jawaban Benar">{evaluation.summary.correct}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-rose-600" title="Jawaban Salah">{evaluation.summary.wrong}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-amber-600" title="Tidak Dijawab">{evaluation.summary.empty}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg font-bold text-sm bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono">
                          {item.nilai}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedStudentWork(item);
                              setFilterDetailStatus('ALL');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition active:scale-95"
                            title="Buka Lembar Jawaban Siswa"
                          >
                            <Eye size={14} />
                            <span>Detail</span>
                          </button>

                          <button
                            onClick={() => handlePrintStudentSheet(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition active:scale-95"
                            title="Cetak Lembar Jawaban Siswa"
                          >
                            <Printer size={14} />
                            <span>Print</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100">
          <Pagination
            currentPage={currentPage}
            totalRows={filteredData.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        </div>
      </div>

      {/* POPUP MODAL: LEMBAR JAWABAN DETAIL SISWA */}
      {selectedStudentWork && activeStudentEvaluation && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-start justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl my-4 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header Bar */}
            <div className="p-5 md:px-7 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-200">
                  <FileCheck size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    Lembar Hasil Tes Siswa
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudentWork.nama} ({selectedStudentWork.username}) &bull; {selectedStudentWork.sekolah}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintStudentSheet(selectedStudentWork)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition active:scale-95"
                >
                  <Printer size={15} />
                  <span>Print Lembar</span>
                </button>
                <button
                  onClick={() => setSelectedStudentWork(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-5 md:p-7 overflow-y-auto custom-scrollbar space-y-6 flex-1">
              
              {/* Identitas Siswa & Ringkasan Nilai Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Info Identitas */}
                <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2 mb-2 flex items-center justify-between">
                    <span>Identitas Peserta Ujian</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      Sesi {selectedStudentWork.session} &bull; Paket {selectedStudentWork.id_paket}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Lengkap</span>
                      <span className="font-bold text-slate-800 text-sm">{selectedStudentWork.nama}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Username / NISN</span>
                      <span className="font-mono font-bold text-indigo-700">{selectedStudentWork.username}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Sekolah / Kecamatan</span>
                      <span className="font-medium text-slate-700">{selectedStudentWork.sekolah} - {selectedStudentWork.kecamatan}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Mata Pelajaran</span>
                      <span className="font-bold text-slate-800">{selectedStudentWork.mapel}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Durasi Pengerjaan</span>
                      <span className="font-medium text-slate-700">{selectedStudentWork.durasi} Menit</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Status Ujian</span>
                      <span className="font-bold text-emerald-600">Selesai (Submitted)</span>
                    </div>
                  </div>
                </div>

                {/* Nilai Akhir Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 flex flex-col justify-between items-center text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Nilai Akhir</span>
                  <div className="my-1">
                    <span className="text-4xl md:text-5xl font-black text-indigo-900 tracking-tight">
                      {selectedStudentWork.nilai}
                    </span>
                    <span className="text-xs text-indigo-400 font-bold block mt-0.5">/ 100</span>
                  </div>
                  <div className="w-full pt-2 border-t border-indigo-200/60 flex items-center justify-center gap-1.5 text-xs font-bold">
                    <span className="text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                      Skor Hasil Ujian
                    </span>
                  </div>
                </div>
              </div>

              {/* Rincian Statistik Butir Soal */}
              <div className="grid grid-cols-4 gap-2.5">
                <button
                  onClick={() => setFilterDetailStatus('ALL')}
                  className={`p-3 rounded-xl border text-center transition ${
                    filterDetailStatus === 'ALL'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-lg font-black">{activeStudentEvaluation.summary.total}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Semua Soal</div>
                </button>

                <button
                  onClick={() => setFilterDetailStatus('CORRECT')}
                  className={`p-3 rounded-xl border text-center transition ${
                    filterDetailStatus === 'CORRECT'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100/50'
                  }`}
                >
                  <div className="text-lg font-black">{activeStudentEvaluation.summary.correct}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">Benar</div>
                </button>

                <button
                  onClick={() => setFilterDetailStatus('WRONG')}
                  className={`p-3 rounded-xl border text-center transition ${
                    filterDetailStatus === 'WRONG'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100/50'
                  }`}
                >
                  <div className="text-lg font-black">{activeStudentEvaluation.summary.wrong}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">Salah</div>
                </button>

                <button
                  onClick={() => setFilterDetailStatus('EMPTY')}
                  className={`p-3 rounded-xl border text-center transition ${
                    filterDetailStatus === 'EMPTY'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-amber-50/70 border-amber-200 text-amber-800 hover:bg-amber-100/50'
                  }`}
                >
                  <div className="text-lg font-black">{activeStudentEvaluation.summary.empty}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">Kosong</div>
                </button>
              </div>

              {/* Header List Soal */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <span>Daftar Soal & Lembar Jawaban</span>
                  <span className="text-xs font-normal text-slate-400">
                    (Menampilkan {filteredModalQuestions.length} butir)
                  </span>
                </h4>
              </div>

              {/* List Soal-soal */}
              <div className="space-y-5">
                {filteredModalQuestions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Tidak ada butir soal pada kategori filter ini.
                  </div>
                ) : (
                  filteredModalQuestions.map((eq, qIndex) => {
                    const q = eq.question;
                    const isCorrect = eq.status === 'CORRECT';
                    const isWrong = eq.status === 'WRONG';
                    const isEmpty = eq.status === 'EMPTY';

                    // Parse wacana if any
                    let wacanaParsed = null;
                    if (q.gambar && (q.gambar.includes('\n') || q.gambar.length > 200 || !q.gambar.startsWith('http'))) {
                      wacanaParsed = parseWacana(q.gambar);
                    }

                    const options = [
                      { key: 'A', text: q.opsi_a },
                      { key: 'B', text: q.opsi_b },
                      { key: 'C', text: q.opsi_c },
                      { key: 'D', text: q.opsi_d }
                    ].filter(o => o.text && String(o.text).trim() !== '');

                    return (
                      <div
                        key={q.id || qIndex}
                        className={`p-5 rounded-2xl border transition ${
                          isCorrect
                            ? 'border-emerald-200 bg-emerald-50/15'
                            : isWrong
                            ? 'border-rose-200 bg-rose-50/15'
                            : 'border-amber-200 bg-amber-50/15'
                        }`}
                      >
                        {/* Question Card Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/80">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                              {qIndex + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-600">
                              Tipe: {q.tipe_soal || 'PG'}
                            </span>
                            <span className="text-xs text-slate-400">
                              &bull; Bobot: {q.bobot || 1} poin
                            </span>
                          </div>

                          <div>
                            {isCorrect && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                                <CheckCircle2 size={13} />
                                <span>BENAR (+{eq.userScore})</span>
                              </span>
                            )}
                            {isWrong && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-lg border border-rose-200">
                                <XCircle size={13} />
                                <span>SALAH (0)</span>
                              </span>
                            )}
                            {isEmpty && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
                                <MinusCircle size={13} />
                                <span>TIDAK DIJAWAB (0)</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Wacana Display */}
                        {wacanaParsed && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-xs text-slate-700">
                            <div className="font-bold text-[10px] uppercase text-indigo-700 tracking-wider flex items-center gap-1.5 mb-2">
                              <BookOpen size={13} />
                              <span>Teks / Wacana Bacaan</span>
                            </div>
                            {wacanaParsed.title && (
                              <h5 className="text-center font-bold text-slate-900 text-sm mb-3">
                                {wacanaParsed.title}
                              </h5>
                            )}
                            <div className="space-y-2 text-justify leading-relaxed">
                              {wacanaParsed.paragraphs.map((para, pIdx) => (
                                <p key={pIdx} className="indent-6">{para}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Image Display */}
                        {!wacanaParsed && q.gambar && (q.gambar.startsWith('http') || q.gambar.startsWith('data:image')) && (
                          <div className="my-3 text-center">
                            <img
                              src={q.gambar}
                              alt="Media Soal"
                              className="max-h-56 mx-auto rounded-lg border border-slate-200 shadow-sm"
                            />
                            {q.keterangan_gambar && (
                              <p className="text-xs text-slate-400 italic mt-1">{q.keterangan_gambar}</p>
                            )}
                          </div>
                        )}

                        {/* Question Text */}
                        <div className="text-sm font-semibold text-slate-900 mb-4 leading-relaxed">
                          {q.text_soal}
                        </div>

                        {/* Options List / Statements Table */}
                        {q.tipe_soal === 'BS' && eq.bsDetails && eq.bsDetails.length > 0 ? (
                          <div className="mb-4 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                            <div className="bg-slate-100 px-3.5 py-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                              <span>Daftar Pernyataan (Benar / Salah)</span>
                              <span className="text-[10px] text-slate-500 font-normal">Perbandingan Jawaban Siswa & Kunci</span>
                            </div>
                            <div className="divide-y divide-slate-200">
                              {eq.bsDetails.map((detail) => (
                                <div key={detail.code} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white hover:bg-slate-50">
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <span className="w-5 h-5 rounded-md bg-slate-800 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                                      {detail.code}
                                    </span>
                                    <span className="leading-relaxed text-slate-800 font-medium">{detail.text}</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 ${
                                      detail.isCorrect
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : detail.userChoiceLabel !== '-'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}>
                                      {detail.isCorrect ? <CheckCircle2 size={12} /> : detail.userChoiceLabel !== '-' ? <XCircle size={12} /> : <MinusCircle size={12} />}
                                      <span>Siswa: {detail.userChoiceLabel}</span>
                                    </span>
                                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Kunci: {detail.correctChoice ? 'BENAR' : 'SALAH'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : options.length > 0 ? (
                          <div className="space-y-2 mb-4">
                            {options.map((opt) => {
                              const isUserSelected = String(eq.userAnswer).trim().toUpperCase() === opt.key;
                              const isKunci = String(q.kunci_jawaban).trim().toUpperCase() === opt.key;

                              let optBorder = 'border-slate-200 bg-white text-slate-700';
                              if (isUserSelected && isCorrect) {
                                optBorder = 'border-emerald-300 bg-emerald-50/80 text-emerald-900 font-bold';
                              } else if (isUserSelected && isWrong) {
                                optBorder = 'border-rose-300 bg-rose-50/80 text-rose-900 font-bold';
                              } else if (isKunci) {
                                optBorder = 'border-emerald-400 bg-emerald-50/50 text-emerald-800 font-semibold';
                              }

                              return (
                                <div
                                  key={opt.key}
                                  className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${optBorder}`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                                      {opt.key}
                                    </span>
                                    <span className="leading-relaxed">{opt.text}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {isUserSelected && (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        isCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                                      }`}>
                                        Pilihan Siswa
                                      </span>
                                    )}
                                    {isKunci && !isUserSelected && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        Kunci Jawaban
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

                        {/* Comparison Box */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-slate-400 font-bold text-[10px] uppercase block">
                              Jawaban Siswa
                            </span>
                            <div className={`font-semibold flex items-center gap-1.5 ${
                              isCorrect ? 'text-emerald-700' : isWrong ? 'text-rose-700' : 'text-amber-700'
                            }`}>
                              {isCorrect ? <CheckCircle2 size={14} className="flex-shrink-0" /> : isWrong ? <XCircle size={14} className="flex-shrink-0" /> : <MinusCircle size={14} className="flex-shrink-0" />}
                              <span className="break-words">{eq.userAnswerText}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-slate-400 font-bold text-[10px] uppercase block">
                              Kunci Jawaban yang Benar
                            </span>
                            <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                              <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                              <span className="break-words">{eq.correctAnswerText}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 md:px-7 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Lembar Jawaban Resmi CBT System
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedStudentWork(null)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Tutup
                </button>
                <button
                  onClick={() => handlePrintStudentSheet(selectedStudentWork)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow active:scale-95 flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  <span>Print Lembar</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default HasilPekerjaanTab;
