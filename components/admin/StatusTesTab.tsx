
import React, { useState, useMemo } from 'react';
import { Monitor, Search, PlayCircle, Key, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';
import { useAlert } from '../../context/AlertContext';

const StatusTesTab = ({ currentUser, students, refreshData }: { currentUser: User, students: any[], refreshData: () => void }) => {
    const { showAlert } = useAlert();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [resetting, setResetting] = useState<string | null>(null);
    const uniqueSchools = useMemo<string[]>(() => {
        let relevantStudents = students;
        if (currentUser.role === 'proktor' && currentUser.id_sekolah) {
            relevantStudents = students.filter(s => s.id_sekolah === currentUser.id_sekolah);
        } else if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            relevantStudents = students.filter(s => s.id_kecamatan === currentUser.id_kecamatan);
        }
        const schools = new Set(relevantStudents.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [students, currentUser]);
    const uniqueKecamatans = useMemo(() => {
        let relevantStudents = students;
        if (currentUser.role === 'proktor' && currentUser.id_sekolah) {
            relevantStudents = students.filter(s => s.id_sekolah === currentUser.id_sekolah);
        } else if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            relevantStudents = students.filter(s => s.id_kecamatan === currentUser.id_kecamatan);
        }
        const kecs = new Set(relevantStudents.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students, currentUser]);
    
    const filtered = useMemo(() => {
        let filteredStudents = students.filter(s => s.role === 'siswa'); // Always filter for siswa role

        // Apply role-based filtering first
        if (currentUser.role === 'proktor' && currentUser.id_sekolah) {
            filteredStudents = filteredStudents.filter(s => s.id_sekolah === currentUser.id_sekolah);
        } else if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            filteredStudents = filteredStudents.filter(s => s.id_kecamatan === currentUser.id_kecamatan);
        } else if (currentUser.role === 'admin_sekolah') {
            const mySchoolName = (currentUser.kelas_id || '').toLowerCase();
            filteredStudents = filteredStudents.filter(s => (s.school || '').toLowerCase() === mySchoolName);
        }

        // Apply search term
        filteredStudents = filteredStudents.filter(s => 
            s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.username.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Apply dropdown filters for admin_pusat (or if no specific role filter applied)
        if (currentUser.role === 'admin_pusat' || (!currentUser.id_sekolah && !currentUser.id_kecamatan)) {
            if (filterSchool !== 'all') {
                filteredStudents = filteredStudents.filter(s => s.school === filterSchool);
            }
            if (filterKecamatan !== 'all') {
                filteredStudents = filteredStudents.filter(s => (s.kecamatan || '').toLowerCase() === filterKecamatan.toLowerCase());
            }
        }

        return filteredStudents;
    }, [students, searchTerm, currentUser, filterSchool, filterKecamatan]);
    
    const handleReset = async (username: string) => { 
        const confirmed = await showAlert(`Reset login untuk ${username}? Siswa akan logout otomatis dan status menjadi OFFLINE.`, { type: 'confirm' });
        if(!confirmed) return; 
        setResetting(username); 
        try { 
            await api.resetLogin(username); 
            // Add a small delay to ensure Google Sheet has committed the change before we read it back
            await new Promise(r => setTimeout(r, 1500));
            refreshData(); 
            await showAlert(`Login ${username} berhasil di-reset. Status akan berubah menjadi Offline.`, { type: 'success' }); 
        } catch(e) { 
            console.error(e); 
            await showAlert("Gagal reset login. Coba lagi.", { type: 'error' }); 
        } finally { 
            setResetting(null); 
        } 
    }
    
    const renderStatusBadge = (status: string) => { switch (status) { case 'WORKING': return <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><PlayCircle size={12}/> Mengerjakan</span>; case 'LOGGED_IN': return <span className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Key size={12}/> Login</span>; case 'FINISHED': return <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle2 size={12}/> Selesai</span>; case 'OFFLINE': default: return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><span className="opacity-50">⚠️</span> Offline</span>; } };
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden fade-in">
             <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><Monitor size={20}/> Status Peserta</h3>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    {currentUser.role === 'admin_pusat' && (
                        <>
                        <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}><option value="all">Semua Kecamatan</option>{uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}</select>
                        <select 
                            className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white" 
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
                            <option value="all">Semua Sekolah</option>{uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        </>
                    )}
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Cari Peserta..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100 w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                </div>
             </div>
             <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs"><tr><th className="p-4">Nama Peserta</th><th className="p-4">Username</th><th className="p-4">Sekolah</th><th className="p-4">Kecamatan</th><th className="p-4">Status</th><th className="p-4">Ujian Aktif</th><th className="p-4 text-center">Aksi</th></tr></thead><tbody className="divide-y divide-slate-50">{filtered.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">Tidak ada data.</td></tr> : filtered.map((s, i) => (<tr key={i} className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-700">{s.fullname}</td><td className="p-4 font-mono text-slate-500">{s.username}</td><td className="p-4 text-slate-600">{s.school}</td><td className="p-4 text-slate-600">{s.kecamatan || '-'}</td><td className="p-4">{renderStatusBadge(s.status)}</td><td className="p-4 text-slate-600">{s.active_exam || '-'}</td><td className="p-4 text-center"><button onClick={() => handleReset(s.username)} disabled={!!resetting} className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-100 transition border border-amber-100 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed">{resetting === s.username ? <><Loader2 size={12} className="animate-spin"/> Processing...</> : "Reset Login"}</button></td></tr>))}</tbody></table></div>
        </div>
    )
};

export default StatusTesTab;
