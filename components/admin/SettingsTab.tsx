
import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Save, Loader2, ShieldCheck, Database, Clock, Layers, Globe, ClipboardList, Monitor } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';
import { useAlert } from '../../context/AlertContext';
import AdminManagement from './AdminManagement';

const SettingsTab = ({ currentUser, onDataChange, configs, mode = 'all' }: { currentUser: User, onDataChange: () => void, configs: Record<string, string>, mode?: 'all' | 'config' | 'dev' | 'session' | 'admin' }) => {
    const { showAlert } = useAlert();
    const [isInitializing, setIsInitializing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Config states (These were moved from RilisTokenTab)
    const [maxQuestions, setMaxQuestions] = useState<number>(Number(configs.MAX_QUESTIONS) || 0);
    const [surveyDuration, setSurveyDuration] = useState<number>(Number(configs.SURVEY_DURATION) || 30);
    const [examDuration, setExamDuration] = useState<number>(Number(configs.DURATION) || 60);
    const [showSurvey, setShowSurvey] = useState<boolean>(configs.SHOW_SURVEY === 'TRUE');
    const [autoActivation, setAutoActivation] = useState<boolean>(configs.AUTO_SESSION_ACTIVATION === 'TRUE');
    const [allowProctorSessionEdit, setAllowProctorSessionEdit] = useState<boolean>(configs.ALLOW_PROCTOR_SESSION_EDIT === 'TRUE');
    const [showRekapToProctor, setShowRekapToProctor] = useState<boolean>(configs.SHOW_REKAP_TO_PROCTOR === 'TRUE');
    const [devShow, setDevShow] = useState<boolean>(configs.DEV_SHOW !== 'FALSE');
    const [devName, setDevName] = useState<string>(configs.DEV_NAME || '');
    const [devPhoto, setDevPhoto] = useState<string>(configs.DEV_PHOTO_URL || '');
    const [devQuote, setDevQuote] = useState<string>(configs.DEV_QUOTE || '');
    
    // Header Print States
    const [headerKartu, setHeaderKartu] = useState<string>(configs.HEADER_KARTU_PESERTA || 'TRY OUT TKA TAHUN 2026');
    const [headerRekap, setHeaderRekap] = useState<string>(configs.HEADER_REKAP_NILAI || 'TRY OUT TKA TAHUN 2026');
    const [headerPeringkat, setHeaderPeringkat] = useState<string>(configs.HEADER_PERINGKAT || 'TRY OUT TKA TAHUN 2026');
    const [footerText, setFooterText] = useState<string>(configs.FOOTER_TEXT || '@2026 | Dev. MeyGa Team TKA CBT System');
    const [loginCardImage, setLoginCardImage] = useState<string>(configs.LOGIN_CARD_IMAGE || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
    const [bgSystemCheck, setBgSystemCheck] = useState<string>(configs.BG_SYSTEM_CHECK || 'https://image2url.com/r2/default/images/1769879601173-bc7ec22d-7bb8-4ed8-91d7-b6407193627b.jpg');
    const [bgLogin, setBgLogin] = useState<string>(configs.BG_LOGIN || 'https://image2url.com/r2/default/images/1769880312544-946f6b70-4512-4c82-bb6a-cc432cd620fe.jpg');

    const [sessionTimes, setSessionTimes] = useState<Record<string, { active: boolean, start: string, end: string }>>(() => {
        const sessions: Record<string, { active: boolean, start: string, end: string }> = {};
        for (let i = 1; i <= 4; i++) {
            const status = configs[`SESSION_${i}_STATUS`] || 'OFF';
            sessions[i.toString()] = {
                active: status === 'ON' || status === 'AKTIF' || status === 'ACTIVE' || status === 'TRUE' || status === '1',
                start: configs[`SESSION_${i}_START`] || '07:30',
                end: configs[`SESSION_${i}_END`] || '10:30'
            };
        }
        return sessions;
    });
    
    const [ssSoalId, setSsSoalId] = useState(configs.SS_SOAL_ID || '');
    const [ssHasilId, setSsHasilId] = useState(configs.SS_HASIL_ID || '');
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [serverTime, setServerTime] = useState('');

    const isAdminPusat = currentUser.role === 'admin_pusat';

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setServerTime(now.toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Jakarta' 
            }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (configs && Object.keys(configs).length > 0 && !isSaving) {
            setMaxQuestions(Number(configs.MAX_QUESTIONS) || 0);
            setSurveyDuration(Number(configs.SURVEY_DURATION) || 30);
            setExamDuration(Number(configs.DURATION) || 60);
            setShowSurvey(configs.SHOW_SURVEY === 'TRUE');
            setAutoActivation(configs.AUTO_SESSION_ACTIVATION === 'TRUE');
            setAllowProctorSessionEdit(configs.ALLOW_PROCTOR_SESSION_EDIT === 'TRUE');
            setShowRekapToProctor(configs.SHOW_REKAP_TO_PROCTOR === 'TRUE');
            setDevShow(configs.DEV_SHOW !== 'FALSE');
            setDevName(configs.DEV_NAME || '');
            setDevPhoto(configs.DEV_PHOTO_URL || '');
            setDevQuote(configs.DEV_QUOTE || '');
            setHeaderKartu(configs.HEADER_KARTU_PESERTA || 'TRY OUT TKA TAHUN 2026');
            setHeaderRekap(configs.HEADER_REKAP_NILAI || 'TRY OUT TKA TAHUN 2026');
            setHeaderPeringkat(configs.HEADER_PERINGKAT || 'TRY OUT TKA TAHUN 2026');
            setFooterText(configs.FOOTER_TEXT || '@2026 | Dev. MeyGa Team TKA CBT System');
            setLoginCardImage(configs.LOGIN_CARD_IMAGE || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
            setBgSystemCheck(configs.BG_SYSTEM_CHECK || 'https://image2url.com/r2/default/images/1769879601173-bc7ec22d-7bb8-4ed8-91d7-b6407193627b.jpg');
            setBgLogin(configs.BG_LOGIN || 'https://image2url.com/r2/default/images/1769880312544-946f6b70-4512-4c82-bb6a-cc432cd620fe.jpg');
            setSsSoalId(configs.SS_SOAL_ID || '');
            setSsHasilId(configs.SS_HASIL_ID || '');
            
            const sessions: Record<string, { active: boolean, start: string, end: string }> = {};
            for (let i = 1; i <= 4; i++) {
                const status = configs[`SESSION_${i}_STATUS`] || 'OFF';
                sessions[i.toString()] = {
                    active: status === 'ON' || status === 'AKTIF' || status === 'ACTIVE' || status === 'TRUE' || status === '1',
                    start: configs[`SESSION_${i}_START`] || '07:30',
                    end: configs[`SESSION_${i}_END`] || '10:30'
                };
            }
            setSessionTimes(sessions);
        }
    }, [configs, isSaving]);

    // Auto-activation logic moved to AdminDashboard.tsx to ensure it runs regardless of active tab.
    // This component now only displays the status.

    // Fetch current config on mount if configs prop is empty
    useEffect(() => {
        const fetchConfig = async () => {
            if (configs && Object.keys(configs).length > 0) return;
            
            setLoadingConfig(true);
            try {
                const allConfigs = await api.getAllConfig();
                if (allConfigs && Object.keys(allConfigs).length > 0) {
                    // ... (other configs) ...
                    
                    const sessions: Record<string, { active: boolean, start: string, end: string }> = {};
                    for (let i = 1; i <= 4; i++) {
                        const status = allConfigs[`SESSION_${i}_STATUS`] || 'OFF';
                        sessions[i.toString()] = {
                            active: status === 'ON' || status === 'AKTIF' || status === 'ACTIVE' || status === 'TRUE' || status === '1',
                            start: allConfigs[`SESSION_${i}_START`] || '07:30',
                            end: allConfigs[`SESSION_${i}_END`] || '10:30'
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
            const { active, start, end } = sessionTimes[sessionNum];
            const normalizedStart = to24h(start);
            const normalizedEnd = to24h(end);
            
            const statusValue = active ? 'ON' : 'OFF';
            await api.saveConfig(`SESSION_${sessionNum}_STATUS`, statusValue);
            await api.saveConfig(`SESI_${sessionNum}_STATUS`, statusValue);
            await api.saveConfig(`SESSION_${sessionNum}_START`, normalizedStart);
            await api.saveConfig(`SESSION_${sessionNum}_END`, normalizedEnd);
            await showAlert(`Pengaturan Sesi ${sessionNum} berhasil disimpan.`, { type: 'success' });
            onDataChange();
        } catch (e: any) {
            console.error(e);
            await showAlert("Gagal menyimpan pengaturan sesi.", { type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const to24h = (timeStr: string): string => {
        if (!timeStr) return "";
        timeStr = timeStr.trim().toUpperCase();
        const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
        if (match12) {
            let h = parseInt(match12[1]);
            const m = match12[2];
            const ampm = match12[3];
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return `${h.toString().padStart(2, '0')}:${m}`;
        }
        const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        if (match24) {
            const h = parseInt(match24[1]);
            const m = match24[2];
            return `${h.toString().padStart(2, '0')}:${m}`;
        }
        return timeStr;
    };

    const handleSaveAllSessions = async () => {
        setIsSaving(true);
        try {
            for (let i = 1; i <= 4; i++) {
                const sessionNum = i.toString();
                const { active, start, end } = sessionTimes[sessionNum];
                const normalizedStart = to24h(start);
                const normalizedEnd = to24h(end);
                
                const statusValue = active ? 'ON' : 'OFF';
                await api.saveConfig(`SESSION_${sessionNum}_STATUS`, statusValue);
                await api.saveConfig(`SESI_${sessionNum}_STATUS`, statusValue);
                await api.saveConfig(`SESSION_${sessionNum}_START`, normalizedStart);
                await api.saveConfig(`SESSION_${sessionNum}_END`, normalizedEnd);
            }
            await showAlert("Semua pengaturan sesi berhasil disimpan.", { type: 'success' });
            onDataChange();
        } catch (e: any) {
            console.error(e);
            await showAlert("Gagal menyimpan semua pengaturan sesi.", { type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* General Settings Section */}
            {(mode === 'all' || mode === 'config') && (
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
            )}

            {/* Header Print Settings Section */}
            {(mode === 'all' || mode === 'config') && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <ClipboardList size={18} className="text-indigo-600" />
                        <h3 className="font-bold text-slate-700">Judul Header Cetak</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Header Kartu Peserta */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Header Kartu Peserta</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    value={headerKartu}
                                    onChange={(e) => setHeaderKartu(e.target.value)}
                                    placeholder="Contoh: TRY OUT TKA TAHUN 2026"
                                />
                                <button 
                                    onClick={() => handleSaveConfig('HEADER_KARTU_PESERTA', headerKartu)}
                                    disabled={isSaving}
                                    className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                                >
                                    <Save size={18}/>
                                </button>
                            </div>
                        </div>

                        {/* Header Rekap Nilai */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Header Rekap Nilai</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    value={headerRekap}
                                    onChange={(e) => setHeaderRekap(e.target.value)}
                                    placeholder="Contoh: TRY OUT TKA TAHUN 2026"
                                />
                                <button 
                                    onClick={() => handleSaveConfig('HEADER_REKAP_NILAI', headerRekap)}
                                    disabled={isSaving}
                                    className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                                >
                                    <Save size={18}/>
                                </button>
                            </div>
                        </div>

                        {/* Header Peringkat */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Header Peringkat/Predikat</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    value={headerPeringkat}
                                    onChange={(e) => setHeaderPeringkat(e.target.value)}
                                    placeholder="Contoh: TRY OUT TKA TAHUN 2026"
                                />
                                <button 
                                    onClick={() => handleSaveConfig('HEADER_PERINGKAT', headerPeringkat)}
                                    disabled={isSaving}
                                    className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                                >
                                    <Save size={18}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* UI & Footer Settings Section */}
            {(mode === 'all' || mode === 'config') && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <Monitor size={18} className="text-indigo-600" />
                        <h3 className="font-bold text-slate-700">Tampilan & Footer</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Footer Text */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Teks Footer Login</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    value={footerText}
                                    onChange={(e) => setFooterText(e.target.value)}
                                    placeholder="Contoh: @2026 | Dev. Team"
                                />
                                <button 
                                    onClick={() => handleSaveConfig('FOOTER_TEXT', footerText)}
                                    disabled={isSaving}
                                    className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                                >
                                    <Save size={18}/>
                                </button>
                            </div>
                        </div>

                        {/* Login Card Image */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Gambar Card Login (URL)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    value={loginCardImage}
                                    onChange={(e) => setLoginCardImage(e.target.value)}
                                    placeholder="https://..."
                                />
                                <button 
                                    onClick={() => handleSaveConfig('LOGIN_CARD_IMAGE', loginCardImage)}
                                    disabled={isSaving}
                                    className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                                >
                                    <Save size={18}/>
                                </button>
                            </div>
                        </div>

                        {/* BG System Check */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Background System Check (URL)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    value={bgSystemCheck}
                                    onChange={(e) => setBgSystemCheck(e.target.value)}
                                    placeholder="https://..."
                                />
                                <button 
                                    onClick={() => handleSaveConfig('BG_SYSTEM_CHECK', bgSystemCheck)}
                                    disabled={isSaving}
                                    className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                                >
                                    <Save size={18}/>
                                </button>
                            </div>
                        </div>

                        {/* BG Login */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Background Login (URL)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    value={bgLogin}
                                    onChange={(e) => setBgLogin(e.target.value)}
                                    placeholder="https://..."
                                />
                                <button 
                                    onClick={() => handleSaveConfig('BG_LOGIN', bgLogin)}
                                    disabled={isSaving}
                                    className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                                >
                                    <Save size={18}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Developer Popup Settings Section */}
            {(mode === 'all' || mode === 'dev') && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Globe size={18} className="text-indigo-600" />
                            <h3 className="font-bold text-slate-700">Pengembang Aplikasi</h3>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Show Developer Popup Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 md:col-span-2">
                            <div>
                                <h4 className="font-bold text-slate-700 text-sm">Tampilkan Pop-up Pengembang</h4>
                                <p className="text-xs text-slate-500 mt-1">Tampilkan tombol pop-up pengembang di halaman System Check dan Login.</p>
                            </div>
                            <button 
                                onClick={() => {
                                    const newValue = !devShow;
                                    setDevShow(newValue);
                                    handleSaveConfig('DEV_SHOW', newValue ? 'TRUE' : 'FALSE');
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${devShow ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${devShow ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* Developer Name */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Nama Pengembang</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    value={devName}
                                    onChange={(e) => setDevName(e.target.value)}
                                    placeholder="Contoh: MeyGa Team"
                                />
                                <button 
                                    onClick={() => handleSaveConfig('DEV_NAME', devName)}
                                    disabled={isSaving}
                                    className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                                >
                                    <Save size={18}/>
                                </button>
                            </div>
                        </div>

                        {/* Developer Photo URL */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">URL Foto Pengembang</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    value={devPhoto}
                                    onChange={(e) => setDevPhoto(e.target.value)}
                                    placeholder="https://..."
                                />
                                <button 
                                    onClick={() => handleSaveConfig('DEV_PHOTO_URL', devPhoto)}
                                    disabled={isSaving}
                                    className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                                >
                                    <Save size={18}/>
                                </button>
                            </div>
                        </div>

                        {/* Developer Quote */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Quote Pengembang</label>
                            <div className="flex gap-2">
                                <textarea 
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none min-h-[80px]"
                                    value={devQuote}
                                    onChange={(e) => setDevQuote(e.target.value)}
                                    placeholder="Tuliskan quote atau pesan..."
                                />
                                <button 
                                    onClick={() => handleSaveConfig('DEV_QUOTE', devQuote)}
                                    disabled={isSaving}
                                    className="px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                                >
                                    <Save size={18}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Management Section */}
            {(mode === 'all' || mode === 'session') && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Clock size={18} className="text-indigo-600" />
                            <div>
                                <h3 className="font-bold text-slate-700">Manajemen Sesi</h3>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                    <Clock size={10} />
                                    Server Time: {serverTime} WIB
                                    {autoActivation && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded border border-amber-200 animate-pulse">
                                            AUTO ACTIVE
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleSaveAllSessions}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
                            >
                                <Save size={14} />
                                Simpan Semua Sesi
                            </button>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Mode Otomatis</span>
                                <button 
                                    onClick={async () => {
                                        const newValue = !autoActivation;
                                        setAutoActivation(newValue);
                                        
                                        // Save the toggle state
                                        await api.saveConfig('AUTO_SESSION_ACTIVATION', newValue ? 'TRUE' : 'FALSE');
                                        
                                        // Also save all current session times to ensure they are persisted and normalized
                                        for (let i = 1; i <= 4; i++) {
                                            const sessionNum = i.toString();
                                            const { start, end } = sessionTimes[sessionNum];
                                            await api.saveConfig(`SESSION_${sessionNum}_START`, to24h(start));
                                            await api.saveConfig(`SESSION_${sessionNum}_END`, to24h(end));
                                        }
                                        
                                        await showAlert(`Mode Otomatis ${newValue ? 'Aktif' : 'Non-Aktif'}. Semua jadwal sesi telah diperbarui.`, { type: 'success' });
                                        onDataChange();
                                    }}
                                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${autoActivation ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${autoActivation ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
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
                                                disabled={autoActivation}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${session.active ? 'bg-emerald-500' : 'bg-slate-300'} ${autoActivation ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                title={autoActivation ? "Matikan Mode Otomatis untuk mengubah manual" : (session.active ? "Non-aktifkan Sesi" : "Aktifkan Sesi")}
                                            >
                                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${session.active ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                            <button 
                                                onClick={() => handleSaveSessionStatus(sessionNum)}
                                                disabled={isSaving || autoActivation}
                                                className={`p-2 rounded-xl transition disabled:opacity-50 border shadow-sm ${session.active ? 'bg-white text-indigo-600 hover:bg-indigo-50 border-indigo-100' : 'bg-white text-slate-400 hover:bg-slate-50 border-slate-200'} ${autoActivation ? 'cursor-not-allowed' : ''}`}
                                                title={autoActivation ? "Status dikontrol otomatis oleh sistem" : "Simpan Pengaturan Sesi"}
                                            >
                                                <Save size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase">Mulai</label>
                                            <input 
                                                type="time" 
                                                className={`p-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 font-bold ${autoActivation ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-white text-slate-700'}`}
                                                value={session.start}
                                                onChange={(e) => setSessionTimes({
                                                    ...sessionTimes,
                                                    [sessionNum]: { ...session, start: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase">Selesai</label>
                                            <input 
                                                type="time" 
                                                className={`p-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 font-bold ${autoActivation ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-white text-slate-700'}`}
                                                value={session.end}
                                                onChange={(e) => setSessionTimes({
                                                    ...sessionTimes,
                                                    [sessionNum]: { ...session, end: e.target.value }
                                                })}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 leading-relaxed">
                                        {autoActivation 
                                            ? `Sesi ini akan aktif otomatis antara pukul ${session.start} s/d ${session.end}.`
                                            : (session.active 
                                                ? "Siswa pada sesi ini diizinkan untuk login dan mengerjakan ujian." 
                                                : "Siswa pada sesi ini dilarang login. Muncul peringatan saat mencoba masuk.")}
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                </div>
            )}

            {/* Database Setup Section */}
            {(mode === 'all' || mode === 'config') && (
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
            )}

            {/* Admin Management Section */}
            {(mode === 'all' || mode === 'admin') && (
                <AdminManagement currentUser={currentUser} onDataChange={onDataChange} />
            )}
        </div>
    );
};

export default SettingsTab;
