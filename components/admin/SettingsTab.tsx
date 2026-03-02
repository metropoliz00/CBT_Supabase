
import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Save, Loader2, ShieldCheck, Database, Clock, Layers, Globe, ClipboardList } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';
import { useAlert } from '../../context/AlertContext';
import AdminManagement from './AdminManagement';

const SettingsTab = ({ currentUser, onDataChange, configs }: { currentUser: User, onDataChange: () => void, configs: Record<string, string> }) => {
    const { showAlert } = useAlert();
    const [isInitializing, setIsInitializing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Config states (These were moved from RilisTokenTab)
    const [maxQuestions, setMaxQuestions] = useState<number>(Number(configs.MAX_QUESTIONS) || 0);
    const [surveyDuration, setSurveyDuration] = useState<number>(Number(configs.SURVEY_DURATION) || 30);
    const [examDuration, setExamDuration] = useState<number>(Number(configs.DURATION) || 60);
    const [showSurvey, setShowSurvey] = useState<boolean>(configs.SHOW_SURVEY === 'TRUE');
    const [allowProctorSessionEdit, setAllowProctorSessionEdit] = useState<boolean>(configs.ALLOW_PROCTOR_SESSION_EDIT === 'TRUE');
    const [showRekapToProctor, setShowRekapToProctor] = useState<boolean>(configs.SHOW_REKAP_TO_PROCTOR === 'TRUE');
    const [sessionTimes, setSessionTimes] = useState<Record<string, { active: boolean }>>(() => {
        const sessions: Record<string, { active: boolean }> = {};
        for (let i = 1; i <= 4; i++) {
            const status = configs[`SESSION_${i}_STATUS`] || 'OFF';
            sessions[i.toString()] = {
                active: status === 'ON' || status === 'AKTIF' || status === 'ACTIVE' || status === 'TRUE' || status === '1'
            };
        }
        return sessions;
    });
    
    const [ssSoalId, setSsSoalId] = useState(configs.SS_SOAL_ID || '');
    const [ssHasilId, setSsHasilId] = useState(configs.SS_HASIL_ID || '');
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [serverTime, setServerTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setServerTime(now.toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                timeZone: 'Asia/Jakarta' 
            }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Sync with props if they change
    useEffect(() => {
        if (configs && Object.keys(configs).length > 0) {
            setMaxQuestions(Number(configs.MAX_QUESTIONS) || 0);
            setSurveyDuration(Number(configs.SURVEY_DURATION) || 30);
            setExamDuration(Number(configs.DURATION) || 60);
            setShowSurvey(configs.SHOW_SURVEY === 'TRUE');
            setAllowProctorSessionEdit(configs.ALLOW_PROCTOR_SESSION_EDIT === 'TRUE');
            setShowRekapToProctor(configs.SHOW_REKAP_TO_PROCTOR === 'TRUE');
            setSsSoalId(configs.SS_SOAL_ID || '');
            setSsHasilId(configs.SS_HASIL_ID || '');
            
            const sessions: Record<string, { active: boolean }> = {};
            for (let i = 1; i <= 4; i++) {
                const status = configs[`SESSION_${i}_STATUS`] || 'OFF';
                sessions[i.toString()] = {
                    active: status === 'ON' || status === 'AKTIF' || status === 'ACTIVE' || status === 'TRUE' || status === '1'
                };
            }
            setSessionTimes(sessions);
        }
    }, [configs]);

    // Fetch current config on mount if configs prop is empty
    useEffect(() => {
        const fetchConfig = async () => {
            if (configs && Object.keys(configs).length > 0) return;
            
            setLoadingConfig(true);
            try {
                const allConfigs = await api.getAllConfig();
                if (allConfigs && Object.keys(allConfigs).length > 0) {
                    // ... (other configs) ...
                    
                    const sessions: Record<string, { active: boolean }> = {};
                    for (let i = 1; i <= 4; i++) {
                        const status = allConfigs[`SESSION_${i}_STATUS`] || 'OFF';
                        sessions[i.toString()] = {
                            active: status === 'ON' || status === 'AKTIF' || status === 'ACTIVE' || status === 'TRUE' || status === '1'
                        };
                    }
                    setSessionTimes(sessions);
                }
            } catch (e: any) {
                console.error("Failed to fetch config", e);
            } finally {
                setLoadingConfig(false);
            }
        };
        fetchConfig();
    }, []);

    const handleSaveConfig = async (key: string, value: string) => {
        setIsSaving(true);
        try {
            await api.saveConfig(key, value);
            await showAlert(`Konfigurasi ${key} berhasil disimpan.`, { type: 'success' });
            onDataChange();
        } catch (e: any) {
            console.error(e);
            await showAlert(`Gagal menyimpan konfigurasi ${key}.`, { type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSessionStatus = async (sessionNum: string) => {
        setIsSaving(true);
        try {
            const { active } = sessionTimes[sessionNum];
            await api.saveConfig(`SESSION_${sessionNum}_STATUS`, active ? 'ON' : 'OFF');
            await showAlert(`Status Sesi ${sessionNum} berhasil disimpan (${active ? 'AKTIF' : 'NON-AKTIF'}).`, { type: 'success' });
            onDataChange();
        } catch (e: any) {
            console.error(e);
            await showAlert("Gagal menyimpan status sesi.", { type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* General Settings Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Settings size={18} className="text-indigo-600" />
                        <h3 className="font-bold text-slate-700">Pengaturan Umum</h3>
                    </div>
                    <button 
                        onClick={async () => {
                            setIsSaving(true);
                            try {
                                const res = await api.syncExamsDuration();
                                if (res.success) {
                                    await showAlert("Semua durasi ujian telah disinkronkan dengan konfigurasi.", { type: 'success' });
                                } else {
                                    throw new Error(res.message);
                                }
                            } catch (e: any) {
                                await showAlert("Gagal sinkronisasi durasi: " + e.message, { type: 'error' });
                            } finally {
                                setIsSaving(false);
                            }
                        }}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition"
                    >
                        <RefreshCw size={14} className={isSaving ? 'animate-spin' : ''} />
                        Sinkronkan Durasi
                    </button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Show Survey Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                            <h4 className="font-bold text-slate-700 text-sm">Tampilkan Survey</h4>
                            <p className="text-xs text-slate-500 mt-1">Aktifkan survey karakter & lingkungan belajar setelah ujian.</p>
                        </div>
                        <button 
                            onClick={() => {
                                const newValue = !showSurvey;
                                setShowSurvey(newValue);
                                handleSaveConfig('SHOW_SURVEY', newValue ? 'TRUE' : 'FALSE');
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showSurvey ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showSurvey ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Allow Proctor Session Edit Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                            <h4 className="font-bold text-slate-700 text-sm">Akses Atur Sesi (Proktor)</h4>
                            <p className="text-xs text-slate-500 mt-1">Izinkan Admin Sekolah/Proktor untuk mengatur sesi siswa.</p>
                        </div>
                        <button 
                            onClick={() => {
                                const newValue = !allowProctorSessionEdit;
                                setAllowProctorSessionEdit(newValue);
                                handleSaveConfig('ALLOW_PROCTOR_SESSION_EDIT', newValue ? 'TRUE' : 'FALSE');
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${allowProctorSessionEdit ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allowProctorSessionEdit ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Show Rekap to Proctor Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                            <h4 className="font-bold text-slate-700 text-sm">Tampilkan Rekap & Peringkat (Proktor)</h4>
                            <p className="text-xs text-slate-500 mt-1">Izinkan Admin Sekolah/Proktor untuk melihat Rekap Nilai dan Peringkat.</p>
                        </div>
                        <button 
                            onClick={() => {
                                const newValue = !showRekapToProctor;
                                setShowRekapToProctor(newValue);
                                handleSaveConfig('SHOW_REKAP_TO_PROCTOR', newValue ? 'TRUE' : 'FALSE');
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showRekapToProctor ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showRekapToProctor ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Exam Duration */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Durasi Ujian (Menit)</label>
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                                value={examDuration}
                                onChange={(e) => setExamDuration(Number(e.target.value))}
                            />
                            <button 
                                onClick={() => handleSaveConfig('DURATION', String(examDuration))}
                                disabled={isSaving}
                                className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                            >
                                <Save size={18}/>
                            </button>
                        </div>
                    </div>

                    {/* Survey Duration */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Durasi Survey (Menit)</label>
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                                value={surveyDuration}
                                onChange={(e) => setSurveyDuration(Number(e.target.value))}
                            />
                            <button 
                                onClick={() => handleSaveConfig('SURVEY_DURATION', String(surveyDuration))}
                                disabled={isSaving}
                                className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                            >
                                <Save size={18}/>
                            </button>
                        </div>
                    </div>

                    {/* Max Questions */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Max Soal (0 = Semua)</label>
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                                value={maxQuestions}
                                onChange={(e) => setMaxQuestions(Number(e.target.value))}
                            />
                            <button 
                                onClick={() => handleSaveConfig('MAX_QUESTIONS', String(maxQuestions))}
                                disabled={isSaving}
                                className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                            >
                                <Save size={18}/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Session Management Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Clock size={18} className="text-indigo-600" />
                        <div>
                            <h3 className="font-bold text-slate-700">Manajemen Sesi</h3>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                <Clock size={10} />
                                Server Time: {serverTime} WIB
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.keys(sessionTimes).sort().map((sessionNum) => {
                            const session = sessionTimes[sessionNum];
                            return (
                            <div key={sessionNum} className={`p-5 border rounded-2xl space-y-4 transition-all group ${session.active ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-80 hover:opacity-100'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors ${session.active ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-500'}`}>
                                            {sessionNum}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold ${session.active ? 'text-indigo-900' : 'text-slate-500'}`}>Sesi {sessionNum}</h4>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${session.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                                {session.active ? 'Aktif' : 'Non-Aktif'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => setSessionTimes({
                                                ...sessionTimes,
                                                [sessionNum]: { ...session, active: !session.active }
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${session.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                            title={session.active ? "Non-aktifkan Sesi" : "Aktifkan Sesi"}
                                        >
                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${session.active ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                        <button 
                                            onClick={() => handleSaveSessionStatus(sessionNum)}
                                            disabled={isSaving}
                                            className={`p-2 rounded-xl transition disabled:opacity-50 border shadow-sm ${session.active ? 'bg-white text-indigo-600 hover:bg-indigo-50 border-indigo-100' : 'bg-white text-slate-400 hover:bg-slate-50 border-slate-200'}`}
                                            title="Simpan Status Sesi"
                                        >
                                            <Save size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 leading-relaxed">
                                    {session.active 
                                        ? "Siswa pada sesi ini diizinkan untuk login dan mengerjakan ujian." 
                                        : "Siswa pada sesi ini dilarang login. Muncul peringatan saat mencoba masuk."}
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
            </div>

            {/* Database Setup Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Database size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-slate-700">Setup Database</h3>
                </div>
                <div className="p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="mb-4 md:mb-0">
                            <h4 className="font-bold text-slate-700 text-sm">Generate Soal Survey Default</h4>
                            <p className="text-xs text-slate-500 mt-1">Buat soal default untuk survey jika belum ada di database.</p>
                        </div>
                        <button 
                            onClick={async () => {
                                const confirmed = await showAlert('Apakah Anda yakin ingin men-generate soal survey default? Ini akan menambahkan soal ke database.', { type: 'confirm' });
                                if (confirmed) {
                                    setIsSaving(true);
                                    try {
                                        const res = await api.seedSurveys();
                                        if (res.success) {
                                            await showAlert(res.message, { type: 'success' });
                                        } else {
                                            await showAlert("Gagal: " + res.message, { type: 'error' });
                                        }
                                    } catch (e: any) {
                                        await showAlert("Terjadi kesalahan sistem.", { type: 'error' });
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }
                            }}
                            disabled={isSaving}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 flex items-center gap-2 text-sm whitespace-nowrap"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                            Generate Soal Survey
                        </button>
                    </div>
                </div>
            </div>

            {/* Admin Management Section */}
            <AdminManagement currentUser={currentUser} onDataChange={onDataChange} />
        </div>
    );
};

export default SettingsTab;
