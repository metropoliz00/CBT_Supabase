import React, { useState, useEffect } from 'react';
import { User, Exam, QuestionWithOptions } from './types';
import { Key, User as UserIcon, Monitor, AlertCircle, School, LogOut, Check, Eye, EyeOff, Smartphone, Cpu, Wifi, ArrowRight, Loader2, WifiOff, X, Maximize, Activity, Clock, ClipboardList, LogIn, RefreshCw } from 'lucide-react';
import StudentExam from './components/StudentExam';
import StudentSurvey from './components/StudentSurvey';
import AdminDashboard from './components/AdminDashboard';
import { api } from './services/api';
import { useAlert } from './context/AlertContext';

type ViewState = 'system_check' | 'login' | 'confirm' | 'exam' | 'survey_confirm' | 'survey' | 'result' | 'admin';

// Reusable Loading Overlay Component
const LoadingOverlay = ({ message }: { message: string }) => (
  <div className="fixed inset-0 z-[60] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center fade-in">
    <div className="relative mb-4">
      <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
      <div className="w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute inset-0"></div>
      <div className="w-10 h-10 border-4 border-indigo-300 rounded-full border-b-transparent animate-spin-reverse absolute top-3 left-3"></div>
    </div>
    <p className="text-indigo-900 font-bold text-lg animate-pulse">{message}</p>
  </div>
);

function App() {
  const [view, setView] = useState<ViewState>('system_check');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [examList, setExamList] = useState<Exam[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [inputToken, setInputToken] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Memuat...');
  const [errorMsg, setErrorMsg] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [showPassword, setShowPassword] = useState(false);
  
  // Survey State
  const [activeSurveyType, setActiveSurveyType] = useState<'Survey_Karakter' | 'Survey_Lingkungan' | null>(null);
  
  // System Check State
  const [sysInfo, setSysInfo] = useState({ os: 'Unknown', device: 'Unknown', ram: 'Unknown', status: 'Checking...' });

  const { showAlert } = useAlert();

  // Update document title based on view
  useEffect(() => {
    if (view === 'admin') return; // AdminDashboard handles its own title
    
    const viewTitles: Record<ViewState, string> = {
      system_check: 'System Check',
      login: 'Login Peserta',
      confirm: 'Konfirmasi Data',
      exam: 'Ujian Berlangsung',
      survey_confirm: 'Konfirmasi Survey',
      survey: 'Survey Berlangsung',
      result: 'Ujian Selesai',
      admin: 'Admin Dashboard'
    };
    
    document.title = `${viewTitles[view] || 'CBT'} | CBT System`;
  }, [view]);

  // 0. Fetch Global Config on Mount
  useEffect(() => {
    const fetchGlobalConfig = async () => {
        try {
            const lastFetch = localStorage.getItem('cbt_config_time');
            const cachedConfig = localStorage.getItem('cbt_config_data');
            const now = new Date().getTime();
            
            // Use cache if less than 1 hour old
            if (lastFetch && cachedConfig && now - parseInt(lastFetch) < 3600000) {
                try {
                    const allConfigs = JSON.parse(cachedConfig);
                    if (allConfigs && typeof allConfigs === 'object') {
                        setConfigs(allConfigs);
                        return;
                    }
                } catch (e) {
                    console.warn("Failed to parse cached config", e);
                }
            }
            
            const allConfigs = await api.getAllConfig();
            setConfigs(allConfigs);
            localStorage.setItem('cbt_config_time', now.toString());
            localStorage.setItem('cbt_config_data', JSON.stringify(allConfigs));
        } catch (e) {
            console.warn("Failed to fetch global config on mount", e);
        }
    };
    fetchGlobalConfig();
  }, []);

  // 1. Restore Session on Mount
  useEffect(() => {
    const savedUser = localStorage.getItem('cbt_user');
    if (savedUser) {
        try {
            const parsedUser = JSON.parse(savedUser);
            setCurrentUser(parsedUser);
            
            // Determine View based on Role
            if (parsedUser.role === 'admin_pusat' || parsedUser.role === 'admin_sekolah') {
                setView('admin');
            } else {
                // Check if session is still valid (time-wise)
                api.checkSession(parsedUser.username).then(res => {
                    if (!res.success) {
                        showAlert(res.message, { type: 'error', title: 'Sesi Berakhir' });
                        handleLogout();
                        return;
                    }
                    
                    // Restore logic for student (fetch exams)
                    setView('confirm');
                    // We need to fetch exams silently to populate the list
                    api.getExams().then(allExamsData => {
                        setAllExams(allExamsData);
                        let filteredExams = allExamsData.filter(e => !e.id.startsWith('Survey_'));
                        // Filter by active_exam
                        const activeExam = parsedUser.active_exam;
                        if (activeExam && activeExam !== '-' && activeExam !== '') {
                            filteredExams = filteredExams.filter(e => e.nama_ujian.trim().toLowerCase() === activeExam.trim().toLowerCase());
                        } else {
                            filteredExams = [];
                        }
                        
                        setExamList(filteredExams);
                        if (filteredExams.length > 0) setSelectedExamId(filteredExams[0].id);
                    }).catch(console.error);
                }).catch(e => {
                    console.error("Session check failed", e);
                    setView('confirm'); // Fallback to confirm if check fails
                });
            }
        } catch (e) {
            console.error("Failed to restore session", e);
            localStorage.removeItem('cbt_user');
        }
    }
  }, []);

  // 2. Real-time Status Heartbeat (Check if session is still active or user reset)
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'siswa') return;
    if (view !== 'confirm' && view !== 'survey' && view !== 'survey_confirm') return;

    const checkStatus = async () => {
        try {
            const res = await api.checkStatus(currentUser.username);
            if (res.status === 'RESET') {
                await showAlert("Akun anda telah di-reset oleh Admin. Silakan login kembali.", { type: 'warning', title: 'Akun Reset' });
                handleLogout();
            } else if (res.status === 'SESSION_INACTIVE') {
                await showAlert(res.message || "Sesi ujian anda saat ini sedang NON-AKTIF. Anda akan dikeluarkan dari sistem.", { type: 'error', title: 'Sesi Non-Aktif' });
                handleLogout();
            } else if (res.status === 'FINISHED') {
                await showAlert("Anda telah menyelesaikan ujian ini.", { type: 'info' });
                handleLogout();
            }
        } catch (e) {
            console.warn("Heartbeat check failed", e);
        }
    };

    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [currentUser, view]);

  const enterFullscreen = async () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
          try {
              if (el.requestFullscreen) await el.requestFullscreen();
              // @ts-ignore
              else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
              // @ts-ignore
              else if (el.msRequestFullscreen) await el.msRequestFullscreen();
          } catch (e) {
              console.warn("Auto-fullscreen blocked by browser (requires user interaction).");
          }
      }
  };

  useEffect(() => { enterFullscreen(); }, []);

  useEffect(() => {
      const handleGlobalKeyDown = async (e: KeyboardEvent) => {
          if (e.ctrlKey && (e.key === 'x' || e.key === 'X')) {
              e.preventDefault();
              if (document.fullscreenElement) try { await document.exitFullscreen(); } catch (err) {}
          }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (view === 'system_check') {
        const userAgent = navigator.userAgent;
        let os = "Unknown OS";
        if (userAgent.indexOf("Win") !== -1) os = "Windows";
        if (userAgent.indexOf("Mac") !== -1) os = "MacOS";
        if (userAgent.indexOf("X11") !== -1) os = "UNIX";
        if (userAgent.indexOf("Linux") !== -1) os = "Linux";
        if (userAgent.indexOf("Android") !== -1) os = "Android";
        if (userAgent.indexOf("like Mac") !== -1) os = "iOS";
        const ram = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "N/A";
        const updateOnlineStatus = () => { setSysInfo(prev => ({ ...prev, status: navigator.onLine ? "Online" : "Offline" })); };
        setSysInfo({ os: os, device: /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent) ? "Mobile" : "Desktop", ram: ram, status: navigator.onLine ? "Online" : "Offline" });
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        return () => { window.removeEventListener('online', updateOnlineStatus); window.removeEventListener('offline', updateOnlineStatus); };
    }
  }, [view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    enterFullscreen();
    setLoading(true);
    setLoadingMessage('Memverifikasi Identitas Pengguna...');
    setErrorMsg('');
    try {
        const user = await api.login(loginForm.username.trim(), loginForm.password.trim());
        setCurrentUser(user);
        
        // Refresh configs on login to ensure session status is up to date
        const allConfigs = await api.getAllConfig();
        setConfigs(allConfigs);
        localStorage.setItem('cbt_config_data', JSON.stringify(allConfigs));
        localStorage.setItem('cbt_config_time', new Date().getTime().toString());

        // SAVE SESSION
        localStorage.setItem('cbt_user', JSON.stringify(user));

        if (user.role === 'admin_pusat' || user.role === 'admin_sekolah') {
            setView('admin');
        } else {
            setLoadingMessage('Memeriksa Data Ujian...');
            const allExamsData = await api.getExams();
            setAllExams(allExamsData);
            let filteredExams = allExamsData.filter(e => !e.id.startsWith('Survey_')); // Filter out survey types from Exam list
            
            const activeExam = user.active_exam;
            if (activeExam && activeExam !== '-' && activeExam !== '') {
                filteredExams = filteredExams.filter(e => e.nama_ujian.trim().toLowerCase() === activeExam.trim().toLowerCase());
            } else {
                filteredExams = [];
            }

            // Removed strict school/kecamatan filtering as getExams returns global subjects
            // and assignment is handled via active_exam property on user.
            
            setExamList(filteredExams);
            if (filteredExams.length > 0) setSelectedExamId(filteredExams[0].id); else setSelectedExamId('');
            setView('confirm');
        }
    } catch (err: any) {
        if (err.message && (err.message.includes('Sesi ujian anda') || err.message.includes('belum dimulai'))) {
             await showAlert(err.message, { type: 'error', title: 'Sesi Belum Aktif' });
        } else if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('Script Error'))) {
             setErrorMsg('Gagal terhubung ke server. Pastikan Deploy Google Script sudah diperbarui (New Version).');
        } else {
             setErrorMsg('Terjadi kesalahan koneksi. ' + (err.message || ''));
        }
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyToken = async () => {
      enterFullscreen();
      if (!inputToken) { setErrorMsg('Harap isi token ujian.'); return; }
      setLoading(true);
      setLoadingMessage('Memvalidasi Token & Menyiapkan Soal...');
      setErrorMsg('');
      try {
          // 1. Verify Token
          const serverToken = await api.getServerToken();
          if (inputToken.toUpperCase() !== serverToken.toUpperCase()) { 
              setErrorMsg('Token ujian tidak valid!'); 
              setLoading(false); 
              return; 
          }

          // 2. Load Questions
          const qData = await api.getQuestions(selectedExamId);
          if (qData.length === 0) { 
              setErrorMsg('Soal tidak ditemukan untuk mapel ini.'); 
              setLoading(false); 
              return; 
          }
          
          // 3. Start Exam on Server
          if (!currentUser) return;
          const res = await api.startExam(currentUser.username, currentUser.nama_lengkap, selectedExamId);
          
          if (res && res.success === false) {
               await showAlert(res.message || "Gagal memulai ujian.", { type: 'error', title: 'Akses Ditolak' });
               setLoading(false);
               return;
          }

          // 4. Transition to Exam View
          const activeStartTime = res.startTime || Date.now();
          setQuestions(qData);
          setStartTime(activeStartTime);
          setErrorMsg('');
          setView('exam');
      } catch (e) { 
          console.error(e); 
          setErrorMsg('Gagal memproses permintaan. Periksa koneksi.'); 
      } finally { 
          setLoading(false); 
      }
  };

  const handleStartSurvey = () => {
    enterFullscreen();
    setView('survey');
  };

  const handleLogout = () => {
    // CLEAR SESSION
    localStorage.removeItem('cbt_user');
    localStorage.removeItem('cbt_admin_tab'); // Clear admin tab preference

    setCurrentUser(null);
    setLoginForm({ username: '', password: '' });
    setInputToken('');
    setErrorMsg('');
    setQuestions([]);
    setShowPassword(false);
    setView('login');
  };

  const handleFinishExam = async (answers: any, displayedQuestionCount: number, questionIds: string[], isTimeout: boolean = false) => {
    if (!currentUser || !selectedExamId) return;
    setLoading(true);
    setLoadingMessage(isTimeout ? 'Waktu Habis! Menyimpan Jawaban...' : 'Menyimpan Jawaban ke Database...');
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) { console.warn("Exit fullscreen failed", e); }
    try {
        await api.submitExam({
            user: currentUser,
            subject: selectedExamId,
            answers,
            startTime,
            displayedQuestionCount,
            questionIds
        });
        
        // Only clear local storage after successful submission
        const lsKey = `cbt_answers_${currentUser.username}_${selectedExamId}`;
        localStorage.removeItem(lsKey);
        
        if (isTimeout) {
            await showAlert("Waktu Ujian Telah Habis. Jawaban anda telah tersimpan secara otomatis. Sistem akan logout.", { type: 'warning', title: 'Waktu Habis' });
            handleLogout();
        } else {
            // Check for Survey Logic
            const examName = selectedExamId.toLowerCase();
            const showSurvey = configs['SHOW_SURVEY'] === 'TRUE';
            
            // Check if survey is actually enabled in allExams AND enabled in config
            const surveyKarakterEnabled = showSurvey && allExams.some(e => e.id === 'Survey_Karakter');
            const surveyLingkunganEnabled = showSurvey && allExams.some(e => e.id === 'Survey_Lingkungan');

            if (surveyKarakterEnabled && (examName.includes('bahasa') || examName.includes('indo'))) {
                setActiveSurveyType('Survey_Karakter');
                setView('survey_confirm'); // Go to confirmation first
            } else if (surveyLingkunganEnabled && (examName.includes('matematika') || examName.includes('mtk'))) {
                setActiveSurveyType('Survey_Lingkungan');
                setView('survey_confirm'); // Go to confirmation first
            } else {
                // Survey OFF or Not Applicable -> Direct Logout as requested
                await showAlert("Ujian Selesai! Jawaban berhasil disimpan.", { type: 'success', title: 'Sukses' });
                handleLogout();
            }
        }
    } catch (err) { await showAlert("Gagal menyimpan jawaban. Coba lagi.", { type: 'error' }); console.error(err); } finally { setLoading(false); }
  };

  const handleFinishSurvey = async () => {
      await showAlert("Survey Selesai! Terima kasih.", { type: 'success' });
      handleLogout();
      setActiveSurveyType(null);
  };

  const selectedExam = examList.find(e => e.id === selectedExamId);
  const hasSession = currentUser?.session && currentUser.session !== '-' && currentUser.session.trim() !== '' && currentUser.session !== 'undefined';
  
  const isSessionActive = (() => {
    if (!currentUser || currentUser.role !== 'siswa') return true;
    if (!hasSession) return false;
    
    // If configs are not yet loaded, assume it's loading and don't block yet
    if (!configs || Object.keys(configs).length === 0) return true;
    
    const sessionNumRaw = currentUser.session?.replace(/[^0-9]/g, "");
    if (!sessionNumRaw) return false;
    
    const sessionNum = parseInt(sessionNumRaw, 10);
    const n = sessionNum.toString();
    const nPadded = sessionNum < 10 ? `0${sessionNum}` : `${sessionNum}`;
    
    // Standardized check: SESI_X_STATUS primary
    const possibleKeys = [
        `SESI_${n}_STATUS`, `SESI_${nPadded}_STATUS`,
        `SESSION_${n}_STATUS`, `SESSION_${nPadded}_STATUS`,
        `STATUS_SESI_${n}`, `STATUS_SESI_${nPadded}`
    ];
    
    let status = '';
    for (const key of possibleKeys) {
        if (configs[key]) {
            status = String(configs[key]).toUpperCase().trim();
            break;
        }
    }
    
    return status === 'ON' || status === 'AKTIF' || status === 'ACTIVE' || status === 'TRUE' || status === '1';
  })();

  if (view === 'system_check') {
      const isOffline = sysInfo.status === 'Offline';
      return (
        <div className="min-h-screen relative flex items-center justify-center p-4 font-sans fade-in overflow-hidden" onClick={enterFullscreen}>
            {/* Background Image Layer with 60% Opacity */}
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{ 
                    backgroundImage: 'url("https://image2url.com/r2/default/images/1769879601173-bc7ec22d-7bb8-4ed8-91d7-b6407193627b.jpg")',
                    opacity: 0.6
                }}
            />            
            {/* Content Container */}
            <div className="bg-white/95 backdrop-blur-sm max-w-md w-full rounded-2xl p-8 shadow-2xl border border-white/20 relative z-10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Monitor size={32} />
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-800">System Check</h2>
                    <p className="text-slate-500 text-sm mt-1">Memeriksa kompatibilitas perangkat...</p>
                </div>
                <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                            <Smartphone className="text-slate-400" size={20} />
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Device / OS</p>
                                <p className="font-bold text-slate-700">{sysInfo.device} / {sysInfo.os}</p>
                            </div>
                        </div>
                        <Check size={20} className="text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                            <Cpu className="text-slate-400" size={20} />
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">RAM</p>
                                <p className="font-bold text-slate-700">{sysInfo.ram}</p>
                            </div>
                        </div>
                        <Check size={20} className="text-green-500" />
                    </div>
                    <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isOffline ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                            {isOffline ? <WifiOff className="text-red-400" size={20} /> : <Wifi className="text-slate-400" size={20} />}
                            <div>
                                <p className={`text-xs font-bold uppercase ${isOffline ? 'text-red-400' : 'text-slate-400'}`}>Status Device</p>
                                <p className={`font-bold ${isOffline ? 'text-red-600' : 'text-emerald-600'}`}>{sysInfo.status}</p>
                            </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></div>
                    </div>
                </div>
                <button onClick={() => { enterFullscreen(); setView('login'); }} disabled={isOffline} className={`w-full font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 group ${isOffline ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/30'}`}>
                    {isOffline ? "KONEKSI TERPUTUS" : (<>LANJUTKAN <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>)}
                </button>
                <p className="text-center text-[10px] text-slate-400 mt-6">Klik "LANJUTKAN" untuk masuk ke halaman Login.</p>
            </div>
        </div>
      );
  }

  if (view === 'login') {
    return (
        <>
            {loading && <LoadingOverlay message={loadingMessage} />}
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans overflow-hidden relative" onClick={enterFullscreen}>
                {/* Background Image Layer with 20% Opacity */}
                <div 
                    className="absolute inset-0 z-0 bg-cover bg-center"
                    style={{ 
                        backgroundImage: 'url("https://image2url.com/r2/default/images/1769880312544-946f6b70-4512-4c82-bb6a-cc432cd620fe.jpg")',
                        opacity: 0.2
                    }}
                />
                
                <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 fade-in border border-white/50">
                    <div className="md:w-1/2 relative bg-slate-900 flex flex-col justify-center items-center text-white p-12 overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/50 to-indigo-900/60 z-10"></div>
                        <div className="absolute inset-0 z-0"><img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000" alt="bg"/></div>
                        <div className="relative z-20 text-center"><div className="bg-white/20 backdrop-blur-md p-5 rounded-2xl inline-block mb-6 shadow-lg border border-white/20 animate-bounce"><Monitor size={56} className="text-blue-300"/></div><h1 className="text-5xl font-extrabold mb-2 tracking-tight">CBT</h1><h2 className="text-lg font-medium text-blue-200 uppercase tracking-widest mb-6">Computer Based Test</h2><div className="w-16 h-1 bg-blue-500 mx-auto mb-6 rounded-full"></div><p className="text-slate-300 font-light max-w-xs mx-auto leading-relaxed">Sistem Assesment Digital yang terintegrasi</p></div>
                    </div>
                    <div className="md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white/80 backdrop-blur">
                        <div className="mb-10"><h3 className="text-3xl font-bold text-slate-800">Login Peserta</h3><p className="text-slate-500 mt-2">Masukan identitas pengguna untuk memulai sesi.</p></div>
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div><label className="block text-slate-700 text-xs font-bold mb-2 uppercase tracking-wide">Username</label><div className="relative group"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors"><UserIcon size={20}/></div><input type="text" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition font-medium text-slate-700 placeholder-transparent" value={loginForm.username} onChange={e=>setLoginForm({...loginForm, username:e.target.value})} placeholder="Username" required /></div></div>
                            <div><label className="block text-slate-700 text-xs font-bold mb-2 uppercase tracking-wide">Password</label><div className="relative group"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors"><Key size={20}/></div><input type={showPassword ? "text" : "password"} className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition font-medium text-slate-700 placeholder-transparent" value={loginForm.password} onChange={e=>setLoginForm({...loginForm, password:e.target.value})} placeholder="Password" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors cursor-pointer">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div></div>
                            {errorMsg && (<div className="flex items-start gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100 animate-pulse whitespace-pre-wrap"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {errorMsg}</div>)}
                            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200 flex justify-center items-center mt-4 gap-2">{loading ? (<><Loader2 size={24} className="animate-spin" /><span>MEMUAT...</span></>) : (<><span>LOGIN</span><LogIn size={20} className="opacity-80" /></>)}</button>
                        </form>
                    </div>
                </div>
                <footer className="absolute bottom-4 text-slate-400 text-xs font-bold tracking-wide z-10">@2026 | Dev. MeyGa Team TKA CBT System</footer>
            </div>
        </>
    );
  }

  if (view === 'admin' && currentUser) { return <AdminDashboard user={currentUser} onLogout={handleLogout} />; }

  if (view === 'confirm') {
    return (
        <>
            {loading && <LoadingOverlay message={loadingMessage} />}
            <div className="min-h-screen bg-slate-50 font-sans flex flex-col fade-in" onClick={enterFullscreen}>
                <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 md:px-10 justify-between sticky top-0 z-30"><div className="flex items-center gap-2 text-blue-700 font-bold text-lg"><School size={24}/> <span>Konfirmasi Data</span></div><div className="flex items-center gap-4"><div className="text-slate-500 text-sm font-mono bg-slate-100 px-3 py-1 rounded">Update version</div><button onClick={handleLogout} className="text-red-500 hover:text-red-700 flex items-center gap-1 font-bold text-sm bg-red-50 px-3 py-1 rounded transition hover:bg-red-100"><LogOut size={16}/> Logout</button></div></header>
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                            <div className="bg-blue-50 p-6 border-b border-blue-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {currentUser?.photo_url ? (
                                        <img src={currentUser.photo_url} className="w-16 h-16 rounded-xl object-cover shadow-md border-2 border-white bg-white" alt="Profile" />
                                    ) : (
                                        <div className="bg-blue-600 text-white p-3 rounded-xl shadow-md"><UserIcon size={32}/></div>
                                    )}
                                    <div><h2 className="text-xl font-bold text-slate-800">Profil Peserta</h2><p className="text-slate-500 text-sm">Pastikan data user di bawah ini benar.</p></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={async () => {
                                            setLoading(true);
                                            setLoadingMessage('Sinkronisasi Menyeluruh...');
                                            try {
                                                const res = await api.clearAllCache();
                                                if (res.success) {
                                                    const allConfigs = await api.getAllConfig();
                                                    setConfigs(allConfigs);
                                                    localStorage.setItem('cbt_config_data', JSON.stringify(allConfigs));
                                                    localStorage.setItem('cbt_config_time', new Date().getTime().toString());
                                                    await showAlert("Sinkronisasi Berhasil! Status sesi telah diperbarui.", { type: 'success' });
                                                } else {
                                                    throw new Error(res.message);
                                                }
                                            } catch (e: any) {
                                                console.error(e);
                                                await showAlert("Gagal sinkronisasi: " + e.message, { type: 'error' });
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                                        title="Sinkronkan Semua Data"
                                    >
                                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                        Sinkronkan Sesi
                                    </button>
                                </div>
                            </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Username</label><div className="font-mono text-lg font-bold text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">{currentUser?.username}</div></div><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Mata Ujian</label>{examList.length > 0 ? (<select className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-blue-700 font-bold outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500" value={selectedExamId} onChange={e=>setSelectedExamId(e.target.value)} disabled={examList.length === 1}>{examList.map(s=><option key={s.id} value={s.id}>{s.nama_ujian}</option>)}</select>) : (<div className="p-2.5 bg-red-50 border border-red-200 text-red-500 rounded-lg text-sm font-bold flex items-center gap-2"><AlertCircle size={16}/>{currentUser?.active_exam && currentUser.active_exam !== '-' ? `Ujian "${currentUser.active_exam}" belum aktif/tersedia.` : "Belum ada ujian yang diaktifkan untuk User ini."}</div>)}</div></div>
                            <div className="h-px bg-slate-100"></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Nama Lengkap</label><div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700">{currentUser?.nama_lengkap}</div></div><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Asal Sekolah / Kelas</label><div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700">{currentUser?.kelas_id}</div></div></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Jenis Kelamin</label><div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">{currentUser?.jenis_kelamin || '-'}</div></div><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Sesi Ujian</label><div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">{currentUser?.session || '-'}</div></div></div>
                            
                            <div className="space-y-1">
                                 <label className="text-xs font-bold text-slate-400 uppercase">Token Ujian</label>
                                {hasSession ? (
                                    isSessionActive ? (
                                        <>
                                            <input type="text" className={`w-full p-4 border-2 border-dashed rounded-xl focus:border-blue-500 outline-none text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase placeholder-blue-100 transition-colors ${errorMsg.toLowerCase().includes('token') ? 'border-red-400 bg-red-50 text-red-700 placeholder-red-200' : 'border-blue-300 bg-white text-blue-700'}`} placeholder="TOKEN" value={inputToken} onChange={e=> { setInputToken(e.target.value.toUpperCase()); setErrorMsg(''); }} />
                                            {errorMsg && <p className="text-center text-red-500 mt-2 font-medium">{errorMsg}</p>}
                                            <button onClick={handleVerifyToken} disabled={loading || examList.length === 0} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 mt-4 flex justify-center items-center ${examList.length === 0 ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30'}`}>SUBMIT</button>
                                        </>
                                    ) : (
                                        <div className="p-5 bg-amber-50 border border-amber-100 rounded-xl text-center text-amber-600">
                                            <Clock size={32} className="mx-auto mb-2 opacity-50"/>
                                            <p className="font-bold">Sesi Anda (Sesi {currentUser?.session?.replace(/[^0-9]/g, "")}) Sedang NON-AKTIF.</p>
                                            <p className="text-xs mt-1 text-amber-500 mb-4">Silakan hubungi Proktor untuk mengaktifkan sesi ini di menu 'Atur Sesi'.</p>
                                            <button 
                                                onClick={async () => {
                                                    setLoading(true);
                                                    setLoadingMessage('Menyegarkan Status Sesi...');
                                                    try {
                                                        const res = await api.clearAllCache();
                                                        if (res.success) {
                                                            const allConfigs = await api.getAllConfig();
                                                            setConfigs(allConfigs);
                                                            localStorage.setItem('cbt_config_data', JSON.stringify(allConfigs));
                                                            localStorage.setItem('cbt_config_time', new Date().getTime().toString());
                                                            await showAlert("Status sesi berhasil diperbarui.", { type: 'success' });
                                                        } else {
                                                            throw new Error(res.message);
                                                        }
                                                    } catch (e: any) {
                                                        await showAlert("Gagal memperbarui status: " + e.message, { type: 'error' });
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition flex items-center gap-2 mx-auto"
                                            >
                                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                                Refresh Status Sesi
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    <div className="p-5 bg-red-50 border border-red-100 rounded-xl text-center text-red-600">
                                        <Clock size={32} className="mx-auto mb-2 opacity-50"/>
                                        <p className="font-bold">Anda belum memiliki jadwal/sesi ujian.</p>
                                        <p className="text-xs mt-1 text-red-500">Silakan hubungi Proktor atau Admin Sekolah anda.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <footer className="bg-slate-50 border-t p-3 text-center text-xs text-gray-500">@2026 | Dev. MeyGa Team TKA CBT System</footer>
            </div>
        </>
    );
  }

  if (view === 'exam' && selectedExam && currentUser) {
    return (
      <StudentExam 
        exam={selectedExam}
        questions={questions}
        userFullName={currentUser.nama_lengkap}
        username={currentUser.username}
        userPhoto={currentUser.photo_url}
        startTime={startTime}
        onFinish={handleFinishExam}
        onExit={handleLogout}
      />
    );
  }

  if (view === 'survey_confirm' && currentUser && activeSurveyType) {
    const surveyConfig = allExams.find(e => e.id === activeSurveyType);
    const surveyName = surveyConfig ? surveyConfig.nama_ujian : 'Survey';
    const duration = surveyConfig ? surveyConfig.durasi : 30;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 fade-in font-sans" onClick={enterFullscreen}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-100">
                <div className="p-8 pt-10 relative">
                    <div className="absolute top-0 right-0 opacity-5 pointer-events-none"><svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 0C44.7715 0 0 44.7715 0 100C0 155.228 44.7715 200 100 200C155.228 200 200 155.228 200 100C200 44.7715 155.228 0 100 0Z" fill="currentColor"/></svg></div>
                    <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6 mx-auto shadow-sm">
                        <ClipboardList size={32} />
                    </div>
                    <h3 className="text-2xl font-normal text-slate-700 mb-8 text-center">Konfirmasi Survey</h3>
                    <div className="space-y-5">
                        <div className="border-b border-slate-100 pb-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Peserta</p><p className="text-base font-bold text-slate-800">{currentUser.nama_lengkap}</p></div>
                        <div className="border-b border-slate-100 pb-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Survey</p><p className="text-base font-bold text-slate-800">{surveyName}</p></div>
                        <div className="border-b border-slate-100 pb-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Survey</p><p className="text-base font-bold text-slate-800">Wajib Dikerjakan</p></div>
                        <div className="border-b border-slate-100 pb-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Waktu Mulai</p><p className="text-base font-bold text-slate-800">{new Date().toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')} WIB</p></div>
                        <div className="border-b border-slate-100 pb-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alokasi Waktu</p><p className="text-base font-bold text-slate-800">{duration} Menit</p></div>
                    </div>
                    <button onClick={handleStartSurvey} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-full shadow-lg shadow-purple-200 transition-all mt-8 flex justify-center items-center">Mulai Survey</button>
                </div>
            </div>
        </div>
    );
  }

  if (view === 'survey' && currentUser && activeSurveyType) {
      return (
          <StudentSurvey 
              user={currentUser} 
              surveyType={activeSurveyType} 
              onFinish={handleFinishSurvey} 
          />
      );
  }

  if (view === 'result') {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 fade-in font-sans">
            <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md w-full border border-slate-100">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Check size={48} strokeWidth={3} /></div>
                <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Ujian Selesai!</h2>
                <p className="text-slate-500 mb-8 leading-relaxed">Terima kasih, <b>{currentUser?.nama_lengkap}</b>. Jawaban anda telah berhasil disimpan ke dalam sistem database.</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Mata Ujian</p><p className="font-bold text-indigo-700">{selectedExam?.nama_ujian}</p></div>
                <button onClick={handleLogout} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition shadow-xl transform hover:-translate-y-1">KEMBALI KE HALAMAN LOGIN</button>
            </div>
        </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 font-sans">
        <div className="relative"><div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div><div className="w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute inset-0"></div></div>
        <p className="text-slate-400 font-medium animate-pulse text-sm tracking-wider">MEMUAT SISTEM...</p>
    </div>
  );
}

export default App;