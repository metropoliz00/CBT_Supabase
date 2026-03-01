
import React, { useState, useMemo, useEffect } from 'react';
import { ClipboardList, FileText, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel } from '../../utils/adminHelpers';
import { User } from '../../types';

const RekapSurveyTab = ({ students, currentUser }: { students: any[], currentUser: User }) => {
    const [selectedSurvey, setSelectedSurvey] = useState('Survey_Karakter');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.getSurveyRecap(selectedSurvey);
            setData(res);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        loadData();
    }, [selectedSurvey]);

    // Unique values for dropdowns
    const uniqueSchools = useMemo(() => {
        let source = students.length > 0 ? students : data;
        if (currentUser.role === 'proktor' && currentUser.id_sekolah) {
            source = source.filter((s: any) => s.id_sekolah === currentUser.id_sekolah);
        } else if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            source = source.filter((s: any) => s.id_kecamatan === currentUser.id_kecamatan);
        } else if (currentUser.role === 'admin_sekolah') {
            const mySchoolName = (currentUser.kelas_id || '').toLowerCase();
            source = source.filter((s: any) => (s.school || s.sekolah || '').toLowerCase() === mySchoolName);
        }
        const schools = new Set(source.map((s: any) => s.school || s.sekolah).filter(Boolean));
        return Array.from(schools).sort();
    }, [students, data, currentUser]);

    const uniqueKecamatans = useMemo(() => {
        let source = students.length > 0 ? students : data;
        if (currentUser.role === 'proktor' && currentUser.id_sekolah) {
            source = source.filter((s: any) => s.id_sekolah === currentUser.id_sekolah);
        } else if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            source = source.filter((s: any) => s.id_kecamatan === currentUser.id_kecamatan);
        } else if (currentUser.role === 'admin_sekolah') {
            const mySchoolName = (currentUser.kelas_id || '').toLowerCase();
            source = source.filter((s: any) => (s.school || s.sekolah || '').toLowerCase() === mySchoolName);
        }
        const kecs = new Set(source.map((s: any) => s.kecamatan).filter(Boolean).filter((k: any) => k !== '-'));
        return Array.from(kecs).sort();
    }, [students, data, currentUser]);

    // FIX: Case-insensitive and trimmed filtering
    const filteredData = useMemo(() => {
        let filtered = data;

        // Apply role-based filtering first
        if (currentUser.role === 'proktor' && currentUser.id_sekolah) {
            filtered = filtered.filter((d: any) => d.id_sekolah === currentUser.id_sekolah);
        } else if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            filtered = filtered.filter((d: any) => d.id_kecamatan === currentUser.id_kecamatan);
        } else if (currentUser.role === 'admin_sekolah') {
            const mySchoolName = (currentUser.kelas_id || '').toLowerCase();
            filtered = filtered.filter((d: any) => (d.sekolah || '').toLowerCase() === mySchoolName);
        }

        // Apply dropdown filters for admin_pusat (or if no specific role filter applied)
        if (currentUser.role === 'admin_pusat' || (!currentUser.id_sekolah && !currentUser.id_kecamatan && !currentUser.kelas_id)) {
            filtered = filtered.filter((d: any) => {
                const schoolName = (d.sekolah || '').toLowerCase().trim();
                const filterSchoolName = filterSchool.toLowerCase().trim();
                
                const kecName = (d.kecamatan || '').toLowerCase().trim();
                const filterKecName = filterKecamatan.toLowerCase().trim();

                const schoolMatch = filterSchool === 'all' || schoolName === filterSchoolName;
                const kecMatch = filterKecamatan === 'all' || kecName === filterKecName;
                
                return schoolMatch && kecMatch;
            });
        }

        return filtered;
    }, [data, filterSchool, filterKecamatan, currentUser]);

    const getSurveyPredicate = (avgVal: any) => {
        const val = parseFloat(avgVal);
        if (isNaN(val)) return "-";
        if (val > 3.25) return "Sangat Baik";
        if (val > 2.5) return "Baik";
        if (val > 1.75) return "Cukup";
        return "Kurang";
    };

    const getPredicateColor = (pred: string) => {
        switch(pred) {
            case "Sangat Baik": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "Baik": return "bg-blue-100 text-blue-700 border-blue-200";
            case "Cukup": return "bg-orange-100 text-orange-700 border-orange-200";
            default: return "bg-red-100 text-red-700 border-red-200";
        }
    };

    const handleExport = () => {
        const exportData = filteredData.map((d, i) => {
            const row: any = {
                No: i + 1,
                Timestamp: d.timestamp,
                Username: d.username,
                Nama: d.nama,
                Sekolah: d.sekolah,
                Kecamatan: d.kecamatan, 
                "Total Skor": d.total,
                "Rata-rata": d.rata,
                "Predikat": getSurveyPredicate(d.rata),
                Durasi: d.durasi
            };
            if(d.items) {
                Object.keys(d.items).forEach(k => {
                    row[k] = d.items[k];
                });
            }
            return row;
        });
        exportToExcel(exportData, `Rekap_${selectedSurvey}`, "Data");
    };

    const questionKeys = useMemo(() => {
        const keys = new Set<string>();
        data.forEach(d => {
            if (d.items) {
                Object.keys(d.items).forEach(k => keys.add(k));
            }
        });
        return Array.from(keys).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
    }, [data]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden fade-in">
             <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-slate-800 flex items-left gap-2"><ClipboardList size={20}/> Rekap & Analisis Survey</h3>
                        <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 4: Sangat Sesuai</span>
                            <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 3: Sesuai</span>
                            <span className="flex items-center gap-1 text-orange-600"><span className="w-2 h-2 rounded-full bg-orange-500"></span> 2: Kurang</span>
                            <span className="flex items-center gap-1 text-red-600"><span className="w-2 h-2 rounded-full bg-red-500"></span> 1: Sangat Kurang</span>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full lg:w-auto">
                        <button onClick={loadData} disabled={loading} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg font-bold hover:bg-slate-200 transition">
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""}/>
                        </button>
                        <select className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-sm w-full lg:w-auto outline-none focus:ring-2 focus:ring-indigo-100" value={selectedSurvey} onChange={e => setSelectedSurvey(e.target.value)}>
                            <option value="Survey_Karakter">Survey Karakter</option>
                            <option value="Survey_Lingkungan">Survey Lingkungan Belajar</option>
                        </select>
                        <button onClick={handleExport} disabled={filteredData.length === 0} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 border border-emerald-100 transition shadow-sm disabled:opacity-50">
                            <FileText size={14}/> Export
                        </button>
                    </div>
                </div>
                
                {/* Filters */}
                {currentUser.role === 'admin_pusat' && (
                    <div className="flex flex-col md:flex-row gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}>
                            <option value="all">Semua Kecamatan</option>
                            {uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select 
                            className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-100 flex-1" 
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
                            {uniqueSchools.map((s:any) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}
             </div>

             <div className="overflow-x-auto max-h-[600px]">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs sticky top-0 z-20 shadow-sm">
                         <tr>
                             <th className="p-4 w-12 text-center border-r border-slate-200 bg-slate-50">No</th>
                             <th className="p-4 border-r border-slate-200 bg-slate-50">Username</th>
                             <th className="p-4 sticky left-0 bg-slate-50 border-r border-slate-200 z-30 min-w-[150px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama</th>
                             <th className="p-4 min-w-[120px] bg-slate-50">Sekolah</th>
                             <th className="p-4 min-w-[120px] bg-slate-50">Kecamatan</th>
                             <th className="p-4 text-center bg-slate-50">Total</th>
                             <th className="p-4 text-center border-r border-slate-200 bg-slate-50">Rata-rata</th>
                             <th className="p-4 text-center border-r border-slate-200 bg-slate-50">Predikat</th>
                             {questionKeys.map(k => (
                                 <th key={k} className="p-4 text-center min-w-[40px] border-l border-slate-100 bg-slate-50">{k}</th>
                             ))}
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                         {loading ? (
                             <tr><td colSpan={8 + questionKeys.length} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data survey...</td></tr>
                         ) : filteredData.length === 0 ? (
                             <tr><td colSpan={8 + questionKeys.length} className="p-8 text-center text-slate-400">
                                 Tidak ada data untuk filter ini.<br/>
                                 <span className="text-xs">Pastikan siswa sudah mengerjakan survey dan filter sekolah sesuai.</span>
                             </td></tr>
                         ) : filteredData.map((d, i) => {
                             const pred = getSurveyPredicate(d.rata);
                             return (
                             <tr key={i} className="hover:bg-slate-50 transition">
                                 <td className="p-4 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
                                 <td className="p-4 font-mono text-slate-600 border-r border-slate-100">{d.username}</td>
                                 <td className="p-4 font-bold text-slate-700 sticky left-0 bg-white border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{d.nama}</td>
                                 <td className="p-4 text-slate-600 text-xs">{d.sekolah}</td>
                                 <td className="p-4 text-slate-600 text-xs">{d.kecamatan}</td>
                                 <td className="p-4 text-center font-bold text-indigo-600">{d.total}</td>
                                 <td className="p-4 text-center font-bold bg-indigo-50 text-indigo-700 border-r border-slate-100">{d.rata}</td>
                                 <td className="p-4 text-center border-r border-slate-100">
                                     <span className={`px-2 py-1 rounded text-xs font-bold border ${getPredicateColor(pred)}`}>
                                         {pred}
                                     </span>
                                 </td>
                                 {questionKeys.map(k => {
                                     const valStr = d.items?.[k];
                                     const val = parseInt(valStr);
                                     let bgClass = "text-slate-300";
                                     if (val === 4) bgClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                                     else if (val === 3) bgClass = "bg-blue-50 text-blue-700 border-blue-100";
                                     else if (val === 2) bgClass = "bg-orange-50 text-orange-700 border-orange-100";
                                     else if (val === 1) bgClass = "bg-red-50 text-red-700 border-red-100";
                                     
                                     return (
                                         <td key={k} className={`p-2 text-center text-xs font-bold border-l border-b border-slate-50 ${bgClass}`}>
                                             {valStr || '-'}
                                         </td>
                                     );
                                 })}
                             </tr>
                             );
                         })}
                     </tbody>
                 </table>
             </div>
        </div>
    );
};

export default RekapSurveyTab;
