
import React, { useState, useMemo, useEffect } from 'react';
import { Group, Search, Save, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { User, Exam } from '../../types';
import { useAlert } from '../../context/AlertContext';

const KelompokTesTab = ({ currentUser, students, refreshData }: { currentUser: User, students: any[], refreshData: () => void }) => {
    const { showAlert } = useAlert();
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedPaket, setSelectedPaket] = useState('');
    const [availablePakets, setAvailablePakets] = useState<string[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [loadingPakets, setLoadingPakets] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');

    const isReadOnly = currentUser.role === 'proktor' || currentUser.role === 'admin_sekolah';

    useEffect(() => {
        api.getExams().then(setExams);
    }, []);

    useEffect(() => {
        if (!selectedExam) {
            setAvailablePakets([]);
            setSelectedPaket('');
            return;
        }

        const fetchPakets = async () => {
            setLoadingPakets(true);
            try {
                const questions = await api.getRawQuestions(selectedExam);
                const pakets = Array.from(new Set(questions.map(q => q.id_paket).filter(Boolean))) as string[];
                setAvailablePakets(pakets.sort());
                if (pakets.length > 0) setSelectedPaket(pakets[0]);
                else setSelectedPaket('');
            } catch (e) {
                console.error("Failed to fetch pakets", e);
            } finally {
                setLoadingPakets(false);
            }
        };
        fetchPakets();
    }, [selectedExam]);

    const studentList = useMemo(() => students.filter(s => s.role === 'siswa'), [students]);

    const uniqueSchools = useMemo(() => {
        const schools = new Set(studentList.map(s => s.kelas_id || s.school).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [studentList]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(studentList.map(s => s.kecamatan || s.id_kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [studentList]);

    const filteredStudents = useMemo(() => {
        return studentList.filter(s => {
            const name = String(s.nama_lengkap || s.fullname || '');
            const username = String(s.username || '');
            const matchName = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              username.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (currentUser.role === 'admin_sekolah' || currentUser.role === 'proktor') {
                const mySchool = (currentUser.kelas_id || '').toLowerCase();
                const studentSchool = (s.kelas_id || s.school || '').toLowerCase();
                return matchName && studentSchool === mySchool;
            }
            
            let matchFilter = true;
            if (filterSchool !== 'all') matchFilter = matchFilter && (s.kelas_id === filterSchool || s.school === filterSchool);
            if (filterKecamatan !== 'all') matchFilter = matchFilter && (String(s.kecamatan || '').toLowerCase() === filterKecamatan.toLowerCase() || String(s.id_kecamatan || '').toLowerCase() === filterKecamatan.toLowerCase());

            return matchName && matchFilter;
        });
    }, [studentList, searchTerm, currentUser, filterSchool, filterKecamatan]);

    const handleSave = async () => {
        if (!selectedExam) return showAlert("Pilih ujian terlebih dahulu", { type: 'warning' });
        if (selectedUsers.size === 0) return showAlert("Pilih siswa", { type: 'warning' });
        setLoading(true);
        try {
            await api.assignTestGroup(Array.from(selectedUsers).map(String), selectedExam, '', selectedPaket);
            await showAlert("Berhasil set ujian aktif.", { type: 'success' });
            // Add a small delay to ensure Google Sheet has committed the change before we read it back
            await new Promise(r => setTimeout(r, 1500));
            refreshData();
            setSelectedUsers(new Set());
        } catch(e) { 
            console.error(e); 
            await showAlert("Gagal.", { type: 'error' }); 
        }
        setLoading(false);
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) setSelectedUsers(new Set(filteredStudents.map(s => s.username)));
        else setSelectedUsers(new Set());
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-700"><Group size={20}/> Kelompok Tes (Set Ujian Aktif)</h3>
            
            <div className="flex flex-col gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pilih Ujian</label>
                         <select 
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed" 
                            value={selectedExam} 
                            onChange={e => setSelectedExam(e.target.value)}
                            disabled={isReadOnly}
                         >
                            <option value="">-- Pilih Ujian --</option>
                            {exams.map(e => <option key={e.id} value={e.id}>{e.nama_ujian}</option>)}
                        </select>
                    </div>

                    <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pilih Paket Soal</label>
                         <div className="relative">
                            <select 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed" 
                                value={selectedPaket} 
                                onChange={e => setSelectedPaket(e.target.value)}
                                disabled={isReadOnly || loadingPakets || availablePakets.length === 0}
                            >
                                {availablePakets.length === 0 ? (
                                    <option value="">{loadingPakets ? 'Memuat...' : '-- Tanpa Paket --'}</option>
                                ) : (
                                    <>
                                        <option value="">-- Semua Paket --</option>
                                        {availablePakets.map(p => <option key={p} value={p}>{p}</option>)}
                                    </>
                                )}
                            </select>
                            {loadingPakets && <Loader2 size={14} className="absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                         </div>
                    </div>
                    
                    {currentUser.role === 'admin_pusat' && (
                        <>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filter Kecamatan</label>
                            <select 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100"
                                value={filterKecamatan}
                                onChange={e => setFilterKecamatan(e.target.value)}
                            >
                                <option value="all">Semua Kecamatan</option>
                                {uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filter Sekolah</label>
                            <select 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100"
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
                    
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cari Peserta</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Nama / Username..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-indigo-100" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-200 pt-4 mt-2">
                     <div className="text-xs text-slate-500 font-bold">
                        Terpilih: {selectedUsers.size} Siswa
                     </div>
                     {!isReadOnly && (
                        <button onClick={handleSave} disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan Kelompok
                        </button>
                     )}
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4 w-10">
                                {!isReadOnly && (
                                    <input type="checkbox" onChange={e => toggleSelectAll(e.target.checked)} checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedUsers.has(s.username))}/>
                                )}
                            </th>
                            <th className="p-4">Nama Peserta</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Kecamatan</th>
                            <th className="p-4">Ujian Aktif</th>
                            <th className="p-4">ID Paket Aktif</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Tidak ada peserta yang cocok.</td></tr>
                        ) : filteredStudents.map(s => (
                             <tr key={s.username} className="hover:bg-slate-50 transition">
                                <td className="p-4">
                                    {!isReadOnly && (
                                        <input type="checkbox" checked={selectedUsers.has(s.username)} onChange={() => {
                                            const newSet = new Set(selectedUsers);
                                            if (newSet.has(s.username)) newSet.delete(s.username);
                                            else newSet.add(s.username);
                                            setSelectedUsers(newSet);
                                        }}/>
                                    )}
                                </td>
                                <td className="p-4 font-bold text-slate-700">{s.nama_lengkap || s.fullname}</td>
                                <td className="p-4 text-slate-600">{s.kelas_id || s.school}</td>
                                <td className="p-4 text-slate-600">{s.kecamatan || s.id_kecamatan || '-'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${s.active_exam ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                                        {exams.find(e => e.id === s.active_exam)?.nama_ujian || s.active_exam || 'Belum Ada'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${s.id_paket && s.id_paket !== '-' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                                        {s.id_paket && s.id_paket !== '-' ? s.id_paket : 'Belum Ada'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <div className="mt-4 text-xs text-slate-400">
                Total Peserta Tampil: {filteredStudents.length}
            </div>
        </div>
    );
};

export default KelompokTesTab;
