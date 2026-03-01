import React, { useMemo } from 'react';
import { School, Users, PlayCircle, CheckCircle2, AlertCircle, Key, ClipboardList, Activity, Calendar, MapPin, Clock, ArrowRight } from 'lucide-react';
import { User } from '../../types';
import { SimpleDonutChart } from '../../utils/adminHelpers';

interface OverviewTabProps {
    dashboardData: any;
    currentUserState: User;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ dashboardData, currentUserState }) => {
    const stats = useMemo(() => {
        let counts = dashboardData.statusCounts || { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 };
        let total = dashboardData.totalUsers || 0;

        let filteredUsers = dashboardData.allUsers || [];

        if (currentUserState.role === 'proktor' && currentUserState.id_sekolah) {
            filteredUsers = filteredUsers.filter((u: any) => u.id_sekolah === currentUserState.id_sekolah);
        } else if (currentUserState.role === 'admin_kecamatan' && currentUserState.id_kecamatan) {
            filteredUsers = filteredUsers.filter((u: any) => u.id_kecamatan === currentUserState.id_kecamatan);
        } else if (currentUserState.role === 'admin_sekolah') {
            // admin_sekolah uses kelas_id which maps to school name
            const mySchoolName = (currentUserState.kelas_id || '').toLowerCase();
            filteredUsers = filteredUsers.filter((u: any) => (u.school || '').toLowerCase() === mySchoolName);
        }

        // Only count 'siswa' for these stats
        const relevantUsers = filteredUsers.filter((u: any) => u.role === 'siswa');

        const localCounts = { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 };
        relevantUsers.forEach((u: any) => {
            const status = u.status as keyof typeof localCounts;
            if (localCounts[status] !== undefined) {
                localCounts[status]++;
            }
        });

        counts = localCounts;
        total = relevantUsers.length;

        return { counts, total };
    }, [dashboardData, currentUserState]);

    const { OFFLINE, LOGGED_IN, WORKING, FINISHED } = stats.counts;
    // Calculate Not Yet Exam (Offline + Logged In but not started)
    const BELUM_UJIAN = OFFLINE + LOGGED_IN;

    const displayTotalUsers = stats.total;
    const totalStatus = OFFLINE + LOGGED_IN + WORKING + FINISHED;
    
    // Duration Calculation
    const examDuration = Number(dashboardData.duration) || 0;
    const surveyDuration = Number(dashboardData.surveyDuration) || 0;
    const totalDuration = examDuration + surveyDuration;
    
    const statusData = [
        { value: OFFLINE, color: '#e2e8f0', label: 'Belum Login' },
        { value: LOGGED_IN, color: '#facc15', label: 'Sudah Login' },
        { value: WORKING, color: '#3b82f6', label: 'Mengerjakan' },
        { value: FINISHED, color: '#10b981', label: 'Selesai' },
    ];
    
    const filteredFeed = useMemo(() => {
        const feed = dashboardData.activityFeed || [];
        let filteredActivity = feed;

        if (currentUserState.role === 'proktor' && currentUserState.id_sekolah) {
            filteredActivity = filteredActivity.filter((log: any) => log.id_sekolah === currentUserState.id_sekolah);
        } else if (currentUserState.role === 'admin_kecamatan' && currentUserState.id_kecamatan) {
            filteredActivity = filteredActivity.filter((log: any) => log.id_kecamatan === currentUserState.id_kecamatan);
        } else if (currentUserState.role === 'admin_sekolah') {
            const mySchoolName = (currentUserState.kelas_id || '').trim().toLowerCase();
            filteredActivity = filteredActivity.filter((log: any) => (log.school || '').trim().toLowerCase() === mySchoolName);
        }
        return filteredActivity;
    }, [dashboardData.activityFeed, currentUserState]);

    const mySchedule = useMemo(() => {
        if (!dashboardData.schedules) return null;

        let filteredSchedules = dashboardData.schedules;

        if (currentUserState.role === 'proktor' && currentUserState.id_sekolah) {
            filteredSchedules = filteredSchedules.filter((s: any) => s.id_sekolah === currentUserState.id_sekolah);
        } else if (currentUserState.role === 'admin_kecamatan' && currentUserState.id_kecamatan) {
            filteredSchedules = filteredSchedules.filter((s: any) => s.id_kecamatan === currentUserState.id_kecamatan);
        } else if (currentUserState.role === 'admin_sekolah') {
            const mySchoolName = (currentUserState.kelas_id || '').trim().toLowerCase();
            filteredSchedules = filteredSchedules.filter((s: any) => (s.school || '').trim().toLowerCase() === mySchoolName);
        }

        // After filtering, if there's a schedule, return the first one (or the most relevant if logic allows)
        return filteredSchedules.length > 0 ? filteredSchedules[0] : null;
    }, [currentUserState, dashboardData.schedules]);

    const uniqueSchoolsCount = useMemo(() => {
        if (!dashboardData.allUsers) return 0;

        let filteredUsers = dashboardData.allUsers;

        if (currentUserState.role === 'proktor' && currentUserState.id_sekolah) {
            filteredUsers = filteredUsers.filter((u: any) => u.id_sekolah === currentUserState.id_sekolah);
        } else if (currentUserState.role === 'admin_kecamatan' && currentUserState.id_kecamatan) {
            filteredUsers = filteredUsers.filter((u: any) => u.id_kecamatan === currentUserState.id_kecamatan);
        }

        const schools = new Set(
            filteredUsers
                .filter((u: any) => u.role === 'admin_sekolah' || u.role === 'siswa')
                .map((u: any) => u.school)
                .filter((s: any) => s && s !== '-' && s.trim() !== '')
        );
        return schools.size;
    }, [dashboardData.allUsers, currentUserState]);

    // Helper to format full date: Hari, Tanggal Bulan Tahun
    const formatDateFull = (dateStr: string) => {
        if (!dateStr) return '';
        // Check for invalid/epoch date strings from Google Sheets (e.g. Sat Dec 30 1899...)
        if (dateStr.includes('1899') || dateStr.includes('Sat Dec 30')) {
            return '-';
        }

        // FIX: Manual parsing to prevent UTC timezone shift
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return date.toLocaleDateString('id-ID', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            });
        }
        return dateStr;
    };

    return (
    <div className="space-y-6 fade-in max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-4">
            <p className="text-base text-slate-500 font-medium mb-0.5">
                Selamat Datang, <span className="font-bold text-indigo-600">{currentUserState.nama_lengkap || currentUserState.username}</span>
            </p>
            <p className="text-slate-400 text-sm mt-1">
                {currentUserState.role === 'admin_pusat' 
                    ? 'Panel Admin Pusat: Pantau dan kelola seluruh aktivitas sistem CBT.' 
                    : 'Panel Proktor Sekolah: Pantau status peserta dan sesi ujian sekolah.'}
            </p>
        </div>

        {currentUserState.role === 'admin_sekolah' && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-xl flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-200 p-2 rounded-lg"><School size={20}/></div>
                    <div>
                        <h3 className="font-bold text-sm uppercase tracking-wide">Mode Proktor</h3>
                        <p className="text-sm">Menampilkan data untuk: <b>{currentUserState.kelas_id}</b></p>
                    </div>
                </div>
            </div>
        )}

        {currentUserState.role === 'admin_sekolah' && mySchedule && (
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 rounded-2xl shadow-lg flex flex-col lg:flex-row justify-between items-center gap-6">
                 <div className="flex items-center gap-4 border-b lg:border-b-0 border-indigo-500/30 pb-4 lg:pb-0 w-full lg:w-auto">
                    <div className="bg-white/20 p-3 rounded-full"><Calendar size={32}/></div>
                    <div>
                         <h2 className="text-xl font-bold">Jadwal Ujian Aktif</h2>
                         <p className="opacity-90 text-sm">Anda telah dijadwalkan oleh admin pusat.</p>
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-4 text-center justify-center w-full lg:w-auto">
                    <div className="bg-white/10 px-6 py-3 rounded-xl border border-white/20 min-w-[300px] flex flex-col justify-center">
                        <p className="text-[10px] uppercase font-bold text-indigo-200 mb-2">Tanggal Pelaksanaan</p>
                        <div className="w-full bg-black/20 rounded-xl px-4 py-3 border border-white/10 text-center backdrop-blur-sm">
                            {mySchedule.tanggal_selesai && mySchedule.tanggal_selesai !== mySchedule.tanggal ? (
                                <div className="text-sm font-bold text-white leading-tight flex flex-col gap-1.5">
                                    <span>{formatDateFull(mySchedule.tanggal)}</span>
                                    <span className="text-indigo-300 text-xs font-bold">s/d</span>
                                    <span>{formatDateFull(mySchedule.tanggal_selesai)}</span>
                                </div>
                            ) : (
                                <div className="text-lg font-bold text-white">
                                    {formatDateFull(mySchedule.tanggal)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-white text-indigo-900 px-6 py-3 rounded-xl shadow-md min-w-[140px] flex flex-col justify-center">
                        <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Sesi Gelombang</p>
                        <p className="text-xl font-extrabold">{mySchedule.gelombang}</p>
                    </div>
                    {/* Total Duration Display */}
                    <div className="bg-emerald-500/20 px-6 py-3 rounded-xl border border-emerald-400/30 backdrop-blur-sm min-w-[140px] flex flex-col justify-center">
                        <p className="text-[10px] uppercase font-bold text-emerald-100 flex items-center justify-center gap-1 mb-1"><Clock size={10}/> Total Durasi</p>
                        <p className="text-xl font-extrabold text-white leading-none">{totalDuration} <span className="text-xs font-normal opacity-80">Menit</span></p>
                        <p className="text-[9px] text-emerald-100 mt-1 bg-black/20 px-2 py-0.5 rounded-full inline-block">Ujian {examDuration} + Survey {surveyDuration}</p>
                    </div>
                 </div>
            </div>
        )}

        <div className={`grid grid-cols-1 md:grid-cols-2 ${currentUserState.role === 'admin_pusat' ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-6`}>
            {currentUserState.role === 'admin_pusat' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Sekolah</p>
                        <h3 className="text-3xl font-extrabold text-slate-700 mt-1">{uniqueSchoolsCount}</h3>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl text-orange-500"><School size={24}/></div>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Terdaftar</p><h3 className="text-3xl font-extrabold text-slate-700 mt-1">{displayTotalUsers}</h3></div>
                <div className="bg-indigo-50 p-3 rounded-xl text-indigo-500"><Users size={24}/></div>
            </div>
            
            {/* NEW: Belum Ujian Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Belum Ujian</p><h3 className="text-3xl font-extrabold text-amber-500 mt-1">{BELUM_UJIAN}</h3></div>
                <div className="bg-amber-50 p-3 rounded-xl text-amber-500"><Clock size={24}/></div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Sedang Ujian</p><h3 className="text-3xl font-extrabold text-blue-600 mt-1">{WORKING}</h3></div>
                <div className="bg-blue-50 p-3 rounded-xl text-blue-500"><PlayCircle size={24}/></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ujian Selesai</p><h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{FINISHED}</h3></div>
                <div className="bg-emerald-50 p-3 rounded-xl text-emerald-500"><CheckCircle2 size={24}/></div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                <h3 className="text-slate-700 font-bold mb-6 text-sm uppercase tracking-wide w-full border-b pb-2">Status Peserta (%)</h3>
                <SimpleDonutChart data={statusData} />
                <div className="grid grid-cols-2 gap-4 mt-6 w-full text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-200 rounded"></div> Belum Login ({totalStatus > 0 ? Math.round((OFFLINE/totalStatus)*100) : 0}%)</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 rounded"></div> Login ({totalStatus > 0 ? Math.round((LOGGED_IN/totalStatus)*100) : 0}%)</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded"></div> Mengerjakan ({totalStatus > 0 ? Math.round((WORKING/totalStatus)*100) : 0}%)</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded"></div> Selesai ({totalStatus > 0 ? Math.round((FINISHED/totalStatus)*100) : 0}%)</div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 col-span-2">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Activity size={18} className="text-indigo-500"/> Aktivitas Terbaru</h3>
                <div className="space-y-0 h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {filteredFeed && filteredFeed.length > 0 ? (
                        filteredFeed.map((log: any, i: number) => {
                            let icon = <AlertCircle size={20}/>;
                            let colorClass = "bg-slate-100 text-slate-500";
                            let statusText = "Unknown";
                            
                            if (log.action === 'LOGIN') {
                                icon = <Key size={20}/>;
                                colorClass = "bg-yellow-100 text-yellow-600";
                                statusText = "Login";
                            } else if (log.action === 'START') {
                                icon = <PlayCircle size={20}/>;
                                colorClass = "bg-blue-100 text-blue-600";
                                statusText = "Mengerjakan";
                            } else if (log.action === 'FINISH') {
                                icon = <CheckCircle2 size={20}/>;
                                colorClass = "bg-emerald-100 text-emerald-600";
                                statusText = "Selesai";
                            } else if (log.action === 'SURVEY') {
                                icon = <ClipboardList size={20}/>;
                                colorClass = "bg-purple-100 text-purple-600";
                                statusText = "Survey";
                            }

                            const hasSubject = log.subject && log.subject !== '-' && log.subject !== 'Success';
                            
                            // CLEANUP SCORE DISPLAY FOR SURVEYS
                            let displaySubject = log.subject;
                            if (log.action === 'SURVEY' && displaySubject) {
                                // Removes "(Score: 80)" from "Survey: Survey_Karakter (Score: 80)"
                                displaySubject = displaySubject.replace(/\s*\(Score:.*?\)/i, '');
                            }

                            return (
                                <div key={i} className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-lg transition border-b border-slate-50 last:border-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                                        {icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="text-sm font-bold text-slate-700 truncate">{log.fullname}</p>
                                        </div>
                                        
                                        {/* Sekolah & Kecamatan Display */}
                                        <div className="text-xs text-slate-500 mb-2 flex flex-col gap-1 mt-1">
                                            <div className="flex items-center gap-2" title="Sekolah">
                                                <School size={13} className="text-indigo-400 shrink-0"/>
                                                <span className="truncate font-semibold text-slate-600">{log.school || '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-2" title="Kecamatan">
                                                <MapPin size={13} className="text-emerald-500 shrink-0"/>
                                                <span className="truncate text-slate-500">{log.kecamatan || '-'}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-20 ')}`}>
                                                {statusText}
                                            </span>
                                            {hasSubject && (
                                                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                                    {displaySubject}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 italic">
                            <Activity size={32} className="mb-2 opacity-20"/>
                            Belum ada aktivitas tercatat untuk sekolah ini.
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
    );
};

export default OverviewTab;