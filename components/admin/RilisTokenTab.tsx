
import React, { useState, useEffect } from 'react';
import { Key, RefreshCw, Save, X, Edit, Clock, CheckCircle2, Layers, Loader2, Copy, Settings, Zap, ClipboardList } from 'lucide-react';
import { api } from '../../services/api';
import { User, SchoolSchedule } from '../../types';
import { useAlert } from '../../context/AlertContext';

const RilisTokenTab = ({ currentUser, token, duration, maxQuestions, surveyDuration, refreshData, isRefreshing, configs, activeSessions, schedules }: { currentUser: User, token: string, duration: number, maxQuestions: number, surveyDuration: number, refreshData: () => void, isRefreshing: boolean, configs: Record<string, string>, activeSessions: string[], schedules: SchoolSchedule[] }) => {
    const { showAlert } = useAlert();
    const [isSaving, setIsSaving] = useState(false);
    
    // States for Token editing
    const [tokenInput, setTokenInput] = useState(token);
    const [isEditingToken, setIsEditingToken] = useState(false);

    const isAdminPusat = currentUser.role === 'admin_pusat';

    // Token is shown if:
    // 1. User is Admin Pusat
    // 2. OR if user is Admin Sekolah/Proktor AND their school's show_token is true
    const showToken = isAdminPusat || (() => {
        if (!schedules || schedules.length === 0) return activeSessions.length > 0;
        
        const mySchoolName = (currentUser.kelas_id || '').trim().toLowerCase();
        const mySchedule = schedules.find(s => (s.school || '').trim().toLowerCase() === mySchoolName);
        
        if (mySchedule) {
            return mySchedule.show_token === true;
        }
        
        return activeSessions.length > 0;
    })();

    useEffect(() => { setTokenInput(token); }, [token]);

    const handleUpdateToken = async () => {
        setIsSaving(true);
        try { 
            await api.saveToken(tokenInput); 
            setIsEditingToken(false); 
            refreshData(); 
            await showAlert("Token berhasil disimpan.", { type: 'success' }); 
        } catch (e) { 
            await showAlert("Gagal menyimpan token.", { type: 'error' }); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const generateToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setTokenInput(result);
    };

    return (
        <div className="max-w-5xl mx-auto p-2 md:p-6 space-y-8 fade-in pb-20">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Manajemen Token</h2>
                    <p className="text-slate-500 text-sm">Kelola akses masuk ujian dan konfigurasi sistem.</p>
                </div>
                <button onClick={refreshData} disabled={isRefreshing} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm w-fit">
                    <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                    {isRefreshing ? "Menyinkronkan..." : "Refresh Data"}
                </button>
            </div>

            {/* Main Token Card - Modern Gradient */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-2xl shadow-indigo-200 text-white p-8 md:p-12 text-center group transition-all">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-white blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                    <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-purple-400 blur-3xl"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 mb-6 shadow-sm">
                        <Key size={14} className="text-indigo-100" />
                        <span className="text-xs font-bold text-indigo-50 tracking-wider uppercase">Token Sesi Aktif</span>
                    </div>

                    {isEditingToken ? (
                        <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20 animate-in zoom-in duration-200 shadow-xl max-w-md w-full">
                            <div className="flex flex-col gap-4 items-center">
                                <input 
                                    type="text" 
                                    className="bg-black/20 border-2 border-white/30 text-white text-5xl font-mono font-bold text-center rounded-xl px-4 py-4 w-full outline-none focus:border-white focus:bg-black/30 transition-all uppercase tracking-[0.2em] placeholder-white/20 shadow-inner"
                                    value={tokenInput}
                                    onChange={e => setTokenInput(e.target.value.toUpperCase())}
                                    maxLength={6}
                                    autoFocus
                                />
                                <div className="flex gap-3 w-full">
                                    <button onClick={generateToken} className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 font-bold text-sm" title="Acak Token"><RefreshCw size={18}/> Acak</button>
                                    <button onClick={handleUpdateToken} disabled={isSaving} className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2 font-bold text-sm"><Save size={18}/> Simpan Token</button>
                                    <button onClick={() => {setIsEditingToken(false); setTokenInput(token);}} className="py-3 px-4 bg-white/20 hover:bg-white/30 text-white rounded-xl transition active:scale-95"><X size={20}/></button>
                                </div>
                            </div>
                            <p className="text-indigo-200 text-xs mt-4 font-medium opacity-80">Masukkan maksimal 6 karakter (A-Z, 0-9)</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-8">
                            {showToken ? (
                                <div className="relative group cursor-pointer" onClick={async () => { navigator.clipboard.writeText(token); await showAlert("Token disalin ke clipboard!", { type: 'success' }); }}>
                                    <h1 className="text-6xl md:text-8xl font-black tracking-[0.25em] font-mono drop-shadow-lg select-all transition-all group-hover:scale-105 group-hover:text-indigo-50">
                                        {token}
                                    </h1>
                                    <div className="absolute -right-10 md:-right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-white/70 bg-black/20 p-2 rounded-full">
                                        <Copy size={24} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4 py-6">
                                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                                        <Clock size={40} className="text-indigo-100 animate-pulse" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-white">Token Tersembunyi</h3>
                                        <p className="text-indigo-100 text-sm opacity-80 max-w-xs">Token hanya akan muncul saat jadwal sesi ujian berlangsung.</p>
                                    </div>
                                </div>
                            )}
                            
                            {isAdminPusat && (
                                <button onClick={() => setIsEditingToken(true)} className="flex items-center gap-2 bg-white text-indigo-700 px-8 py-3 rounded-full font-bold text-sm shadow-xl hover:bg-indigo-50 hover:scale-105 transition transform active:scale-95">
                                    <Edit size={16} /> Ubah Token
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Configuration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Status Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-emerald-200 transition-colors h-40">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={64} className="text-emerald-500" />
                    </div>
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                        <CheckCircle2 size={20} />
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Status Sistem</h3>
                    <p className="text-lg font-extrabold text-emerald-600">Online & Aktif</p>
                </div>

                {/* Exam Duration Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-blue-200 transition-colors h-40">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={64} className="text-blue-500" />
                    </div>
                    
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                        <Clock size={20} />
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Durasi Ujian</h3>
                    
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-extrabold text-slate-800">{duration} <span className="text-sm font-semibold text-slate-400">Menit</span></p>
                    </div>
                </div>

                {/* Question Count Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-purple-200 transition-colors h-40">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Layers size={64} className="text-purple-500" />
                    </div>
                    <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                        <Settings size={20} />
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Limit Soal</h3>
                    <p className="text-2xl font-extrabold text-slate-800">{maxQuestions === 0 ? 'Semua' : maxQuestions} <span className="text-sm font-semibold text-slate-400">Butir</span></p>
                </div>

                {/* Survey Duration Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-amber-200 transition-colors h-40">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ClipboardList size={64} className="text-amber-500" />
                    </div>
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                        <ClipboardList size={20} />
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Durasi Survey</h3>
                    <p className="text-2xl font-extrabold text-slate-800">{surveyDuration} <span className="text-sm font-semibold text-slate-400">Menit</span></p>
                </div>
            </div>
        </div>
    )
}

export default RilisTokenTab;
