
import React, { useState, useMemo } from 'react';
import { Clock, Search, Save, Loader2, ShieldAlert, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';
import { useAlert } from '../../context/AlertContext';

const AturSesiTab = ({ 
    currentUser, 
    students, 
    refreshData, 
    isLoading, 
    readOnly,
    configs = {},
    activeSessions = []
}: { 
    currentUser: User, 
    students: any[], 
    refreshData: () => void, 
    isLoading: boolean, 
    readOnly?: boolean,
    configs?: Record<string, any>,
    activeSessions?: string[]
}) => {
    const { showAlert } = useAlert();
    const [sessionInput, setSessionInput] = useState('Sesi 1');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');

    const isSessionOn = (num: number | string) => {
        const n = String(num).replace(/[^0-9]/g, "");
        if (!n) return false;
        
        // Standardized check: SESI_X_STATUS primary
        const possibleKeys = [
            `SESI_${n}_STATUS`,
            `SESSION_${n}_STATUS`,
            `STATUS_SESI_${n}`
        ];
        
        let status = '';
        for (const key of possibleKeys) {
            if (configs[key]) {
                status = String(configs[key]).toUpperCase().trim();
                break;
            }
        }
        
        return status === 'ON' || status === 'AKTIF' || status === 'ACTIVE' || status === 'TRUE' || status === '1';
    };

    const uniqueSchools = useMemo(() => {
        const schools = new Set(students.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [students]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            if (s.role !== 'siswa') return false;
            const matchName = s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              s.username.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (currentUser.role === 'admin_sekolah') {
                return matchName && (s.school || '').toLowerCase() === (currentUser.kelas_id || '').toLowerCase();
            }
            
            let matchFilter = true;
            if (filterSchool !== 'all') matchFilter = matchFilter && s.school === filterSchool;
            if (filterKecamatan !== 'all') matchFilter = matchFilter && (s.kecamatan || '').toLowerCase() === filterKecamatan.toLowerCase();

            return matchName && matchFilter;
        });
    }, [students, searchTerm, currentUser, filterSchool, filterKecamatan]);

    const handleSave = async () => {
        if (!sessionInput) return showAlert("Pilih sesi", { type: 'warning' });
        if (selectedUsers.size === 0) return showAlert("Pilih siswa", { type: 'warning' });
        const updates = Array.from(selectedUsers).map(u => ({ username: String(u), session: sessionInput }));
        await api.updateUserSessions(updates);
        await showAlert("Sesi berhasil diupdate", { type: 'success' });
        // Add a small delay to ensure Google Sheet has committed the change before we read it back
        await new Promise(r => setTimeout(r, 1500));
        refreshData();
        setSelectedUsers(new Set());
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) setSelectedUsers(new Set(filteredStudents.map(s => s.username)));
        else setSelectedUsers(new Set());
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2 text-slate-700"><Clock size={20}/> Atur Sesi Ujian</h3>
                    <p className="text-xs text-slate-500">Tentukan sesi pengerjaan untuk setiap peserta.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={async () => {
                            try {
                                const res = await api.clearAllCache();
                                if (res.success) {
                                    await showAlert(res.message, { type: 'success' });
                                    refreshData();
                                } else {
                                    throw new Error(res.message);
                                }
                            } catch (e: any) {
                                await showAlert("Gagal sinkronisasi: " + e.message, { type: 'error' });
                            }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition text-xs font-bold border border-indigo-100"
                    >
                        <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                        Sinkronkan Semua Cache
                    </button>
                    <button 
                        onClick={() => refreshData()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition text-xs font-bold"
                    >
                        <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                        Refresh Data
                    </button>
                    {readOnly && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 text-[10px] font-bold animate-pulse">
                            <ShieldAlert size={14} />
                            MODE LIHAT SAJA
                        </div>
                    )}
                </div>
            </div>

            {/* Session Status Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                {(() => {
                    // Find all unique session numbers in configs
                    const sessionNums = new Set<number>();
                    Object.keys(configs).forEach(key => {
                        if (key.includes('SESSION_') || key.includes('SESI_')) {
                            const num = parseInt(key.replace(/[^0-9]/g, ""), 10);
                            if (!isNaN(num)) sessionNums.add(num);
                        }
                    });
                    
                    // Default to at least 1-4
                    [1, 2, 3, 4].forEach(n => sessionNums.add(n));
                    
                    return Array.from(sessionNums).sort((a, b) => a - b).map(num => {
                        const active = isSessionOn(num);
                        return (
                            <div key={num} className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${active ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sesi {num}</span>
                                    {active ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertCircle size={14} className="text-slate-300" />}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-sm font-extrabold ${active ? 'text-emerald-700' : 'text-slate-500'}`}>
                                        {active ? 'AKTIF' : 'NON-AKTIF'}
                                    </span>
                                </div>
                            </div>
                        );
                    });
                })()}
            </div>

            <div className="flex flex-col xl:flex-row gap-4 mb-6">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                     <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Set Sesi</label>
                        <select 
                            disabled={readOnly}
                            className={`p-2 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100 ${readOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 text-slate-700'}`} 
                            value={sessionInput} 
                            onChange={e => setSessionInput(e.target.value)}
                        >
                            <option value="">-- Pilih Sesi --</option>
                            {(() => {
                                const sessionNums = new Set<number>();
                                Object.keys(configs).forEach(key => {
                                    if (key.includes('SESSION_') || key.includes('SESI_')) {
                                        const num = parseInt(key.replace(/[^0-9]/g, ""), 10);
                                        if (!isNaN(num)) sessionNums.add(num);
                                    }
                                });
                                [1, 2, 3, 4].forEach(n => sessionNums.add(n));
                                return Array.from(sessionNums).sort((a, b) => a - b).map(n => (
                                    <option key={n} value={`Sesi ${n}`}>Sesi {n} {isSessionOn(n) ? '(AKTIF)' : '(OFF)'}</option>
                                ));
                            })()}
                        </select>
                    </div>
                    {currentUser.role === 'admin_pusat' && (
                        <>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Filter Kecamatan</label>
                            <select 
                                className="p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100"
                                value={filterKecamatan}
                                onChange={e => setFilterKecamatan(e.target.value)}
                            >
                                <option value="all">Semua Kecamatan</option>
                                {uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Filter Sekolah</label>
                            <select 
                                className="p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100"
                                value={filterSchool}
                                onChange={e => {
                                    const val = e.target.value;
                                    setFilterSchool(val);
                                    if (val !== 'all') {
                                        const found = students.find(s => s.school === val);
                                        if (found && found.kecamatan) setFilterKecamatan(found.kecamatan);
                                    } else {
                                        setFilterKecamatan('all');
                                    }
                                }}
                            >
                                <option value="all">Semua Sekolah</option>
                                {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        </>
                    )}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Cari Peserta</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Nama / Username..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-indigo-100" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="flex items-end gap-2">
                    <button 
                        onClick={handleSave} 
                        disabled={isLoading || readOnly} 
                        className={`h-[38px] px-6 rounded-lg font-bold text-sm transition shadow-lg flex items-center gap-2 whitespace-nowrap ${readOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Atur Sesi
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4 w-10">
                                <input 
                                    type="checkbox" 
                                    disabled={readOnly}
                                    onChange={e => toggleSelectAll(e.target.checked)} 
                                    checked={filteredStudents.length > 0 && selectedUsers.size === filteredStudents.length} 
                                />
                            </th>
                            <th className="p-4">Nama Peserta</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Kecamatan</th>
                            <th className="p-4">Sesi & Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Tidak ada peserta yang cocok dengan filter.</td></tr>
                        ) : filteredStudents.map(s => {
                            const sessionActive = s.session && s.session !== '-' ? isSessionOn(s.session) : false;
                            return (
                                <tr key={s.username} className="hover:bg-slate-50 transition">
                                    <td className="p-4">
                                        <input 
                                            type="checkbox" 
                                            disabled={readOnly}
                                            checked={selectedUsers.has(s.username)} 
                                            onChange={() => {
                                                if (readOnly) return;
                                                const newSet = new Set(selectedUsers);
                                                if (newSet.has(s.username)) newSet.delete(s.username);
                                                else newSet.add(s.username);
                                                setSelectedUsers(newSet);
                                            }}
                                        />
                                    </td>
                                    <td className="p-4 font-bold text-slate-700">{s.fullname}</td>
                                    <td className="p-4 text-slate-600">{s.school}</td>
                                    <td className="p-4 text-slate-600">{s.kecamatan || '-'}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${s.session && s.session !== '-' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                {s.session && s.session !== '-' ? s.session : 'Belum Diatur'}
                                            </span>
                                            {s.session && s.session !== '-' && (
                                                <span className={`flex items-center gap-1 text-[9px] font-bold ${sessionActive ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {sessionActive ? <CheckCircle2 size={10}/> : <AlertCircle size={10}/>}
                                                    {sessionActive ? 'SIAP' : 'OFF'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 text-xs text-slate-400 flex justify-between">
                <span>Total Peserta: {filteredStudents.length}</span>
                <span>Terpilih: {selectedUsers.size}</span>
            </div>
        </div>
    );
};

export default AturSesiTab;
