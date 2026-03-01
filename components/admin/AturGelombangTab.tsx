import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Save, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { SchoolSchedule } from '../../types';
import { useAlert } from '../../context/AlertContext';

import { User } from '../../types';

const AturGelombangTab = ({ students, currentUser, refreshData }: { students: any[], currentUser: User, refreshData?: () => void }) => {
    const { showAlert } = useAlert();
    const [schedules, setSchedules] = useState<Record<string, { gelombang: string, tanggal: string, tanggal_selesai?: string, show_token?: boolean }>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [togglingToken, setTogglingToken] = useState<string | null>(null);
    
    // Bulk State
    const [bulkGelombang, setBulkGelombang] = useState('Gelombang 1');
    const [bulkDateStart, setBulkDateStart] = useState('');
    const [bulkDateEnd, setBulkDateEnd] = useState('');
    const [bulkShowToken, setBulkShowToken] = useState(false);
    const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set());

    const uniqueSchools = useMemo<string[]>(() => {
        let filteredStudents = students;

        if (currentUser.role === 'proktor' && currentUser.id_sekolah) {
            filteredStudents = students.filter(s => s.id_sekolah === currentUser.id_sekolah);
        } else if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            filteredStudents = students.filter(s => s.id_kecamatan === currentUser.id_kecamatan);
        } else if (currentUser.role === 'admin_pusat') {
            // For admin_pusat, filter out schools with a dash '-' as their name
            filteredStudents = students.filter(s => s.school !== '-');
        }

        const schools = new Set(filteredStudents.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [students, currentUser]);

    useEffect(() => {
        if (uniqueSchools.length > 0) {
            loadSchedules();
        }
    }, [uniqueSchools]);

    const loadSchedules = async () => {
        setLoading(true);
        try {
            const data = await api.getSchoolSchedules();
            const map: Record<string, { gelombang: string, tanggal: string, tanggal_selesai?: string, show_token?: boolean }> = {};
            
            // 1. Load existing data from backend
            data.forEach(d => {
                map[d.school] = { 
                    gelombang: d.gelombang, 
                    tanggal: d.tanggal, 
                    tanggal_selesai: d.tanggal_selesai || d.tanggal,
                    show_token: d.show_token || false
                };
            });

            // 2. Initialize missing schools with defaults
            uniqueSchools.forEach(school => {
                if (!map[school]) {
                    map[school] = {
                        gelombang: 'Gelombang 1',
                        tanggal: '',
                        tanggal_selesai: '',
                        show_token: false
                    };
                }
            });

            setSchedules(map);
        } catch(e) { console.error("Error loading schedules", e); }
        finally { setLoading(false); }
    };

    const handleChange = (school: string, field: 'gelombang' | 'tanggal' | 'tanggal_selesai' | 'show_token', value: any) => {
        setSchedules(prev => {
            const current = prev[school] || { gelombang: 'Gelombang 1', tanggal: '', tanggal_selesai: '', show_token: false };
            const newState = { ...current, [field]: value };

            // Logic Auto-fill: Jika tanggal mulai diubah, dan tanggal selesai kosong atau lebih kecil, sesuaikan
            if (field === 'tanggal') {
                if (!newState.tanggal_selesai || newState.tanggal_selesai < value) {
                    newState.tanggal_selesai = value;
                }
            }

            return {
                ...prev,
                [school]: newState
            };
        });
    };

    const handleSave = async (customSchedules?: Record<string, any>) => {
        const targetSchedules = customSchedules || schedules;
        
        // Validasi
        for (const school of Object.keys(targetSchedules)) {
            const s = targetSchedules[school];
            if (s && s.tanggal && s.tanggal_selesai && s.tanggal_selesai < s.tanggal) {
                await showAlert(`Error pada sekolah ${school}: Tanggal Selesai tidak boleh mendahului Tanggal Mulai.`, { type: 'error' });
                return;
            }
        }

        setSaving(true);
        try {
            const payload: SchoolSchedule[] = Object.keys(targetSchedules)
                .map(school => {
                    const s = targetSchedules[school];
                    if (!s) return null;
                    return {
                        school,
                        gelombang: s.gelombang,
                        tanggal: s.tanggal,
                        // Jika tanggal selesai kosong, gunakan tanggal mulai
                        tanggal_selesai: s.tanggal_selesai || s.tanggal,
                        show_token: s.show_token || false
                    } as SchoolSchedule;
                })
                .filter((item): item is SchoolSchedule => item !== null);
            
            await api.saveSchoolSchedules(payload);
            // Add a small delay to ensure Google Sheet has committed the change before we read it back
            await new Promise(r => setTimeout(r, 1500));
            await loadSchedules(); // Reload data dari server untuk konfirmasi
            if (refreshData) refreshData(); // Sync with parent dashboard
            if (!customSchedules) await showAlert("Jadwal Gelombang berhasil disimpan", { type: 'success' });
        } catch(e) { 
            console.error(e);
            if (!customSchedules) await showAlert("Gagal menyimpan jadwal.", { type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleToken = async (school: string, currentValue: boolean) => {
        setTogglingToken(school);
        const nextValue = !currentValue;
        
        // Update local state first
        const updatedSchedules = {
            ...schedules,
            [school]: {
                ...(schedules[school] || { gelombang: 'Gelombang 1', tanggal: '', tanggal_selesai: '' }),
                show_token: nextValue
            }
        };
        setSchedules(updatedSchedules);

        try {
            // Immediate save for the toggle
            const payload: SchoolSchedule[] = Object.keys(updatedSchedules)
                .map(s => {
                    const sched = updatedSchedules[s];
                    if (!sched) return null;
                    return {
                        school: s,
                        gelombang: sched.gelombang,
                        tanggal: sched.tanggal,
                        tanggal_selesai: sched.tanggal_selesai || sched.tanggal,
                        show_token: sched.show_token || false
                    } as SchoolSchedule;
                })
                .filter((item): item is SchoolSchedule => item !== null);
            
            await api.saveSchoolSchedules(payload);
            // Add a small delay to ensure Google Sheet has committed the change before we read it back
            await new Promise(r => setTimeout(r, 1500));
            if (refreshData) refreshData();
        } catch (e) {
            console.error("Failed to toggle token", e);
            // Rollback on error
            setSchedules(schedules);
            await showAlert("Gagal mengubah status token.", { type: 'error' });
        } finally {
            setTogglingToken(null);
        }
    };

    const handleBulkApply = async () => {
        if (selectedSchools.size === 0) return showAlert("Pilih minimal satu sekolah.", { type: 'warning' });
        
        if (bulkDateStart && bulkDateEnd && bulkDateEnd < bulkDateStart) {
            return showAlert("Tanggal Selesai tidak boleh kurang dari Tanggal Mulai.", { type: 'error' });
        }

        setSchedules(prev => {
            const next = { ...prev };
            selectedSchools.forEach(school => {
                next[school] = { 
                    gelombang: bulkGelombang, 
                    tanggal: bulkDateStart,
                    tanggal_selesai: bulkDateEnd || bulkDateStart,
                    show_token: bulkShowToken
                };
            });
            return next;
        });
        await showAlert(`Berhasil menerapkan ke ${selectedSchools.size} sekolah.`, { type: 'success' });
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) setSelectedSchools(new Set(uniqueSchools));
        else setSelectedSchools(new Set());
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Calendar size={20}/> Atur Gelombang & Tanggal</h3>
                    <p className="text-xs text-slate-400"><b>Jadwal Ujian</b>. Mengatur sesi tanggal pelaksanaan per sekolah.</p>
                </div>
                <button onClick={() => handleSave()} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition flex items-center gap-2">
                    {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan Gelombang
                </button>
             </div>
             
             {/* BULK TOOLS */}
             <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Set All</label>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm bg-white min-w-[150px] outline-none focus:ring-2 focus:ring-indigo-100" value={bulkGelombang} onChange={e => setBulkGelombang(e.target.value)}>
                        <option>Gelombang 1</option>
                        <option>Gelombang 2</option>
                        <option>Gelombang 3</option>
                        <option>Gelombang 4</option>
                        <option>Susulan</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mulai</label>
                        <input type="date" className="p-1 border-b border-slate-200 text-sm bg-transparent outline-none focus:border-indigo-500 font-medium text-slate-700" value={bulkDateStart} onChange={e => setBulkDateStart(e.target.value)} />
                    </div>
                    <span className="text-slate-400 mt-4"><ArrowRight size={14}/></span>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Selesai</label>
                        <input type="date" className="p-1 border-b border-slate-200 text-sm bg-transparent outline-none focus:border-indigo-500 font-medium text-slate-700" value={bulkDateEnd} onChange={e => setBulkDateEnd(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tampilkan Token</label>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 h-[38px]">
                         <button 
                            onClick={() => setBulkShowToken(!bulkShowToken)}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${bulkShowToken ? 'bg-indigo-600' : 'bg-slate-300'}`}
                         >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${bulkShowToken ? 'translate-x-6' : 'translate-x-1'}`} />
                         </button>
                         <span className="text-xs font-bold text-slate-600">{bulkShowToken ? 'ON' : 'OFF'}</span>
                    </div>
                </div>
                <button onClick={handleBulkApply} className="bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-900 transition mb-[1px] shadow-sm">
                    Terapkan
                </button>
             </div>

             <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-4 w-10"><input type="checkbox" onChange={e => toggleSelectAll(e.target.checked)} checked={uniqueSchools.length > 0 && selectedSchools.size === uniqueSchools.length} /></th>
                            <th className="p-4">Nama Sekolah</th>
                            <th className="p-4">Gelombang</th>
                            <th className="p-4 text-center">Rentang Tanggal Pelaksanaan</th>
                            <th className="p-4 text-center">Tampilkan Token</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                             <tr><td colSpan={5} className="p-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Sinkronisasi data jadwal...</td></tr>
                        ) : uniqueSchools.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Belum ada data sekolah (User).</td></tr>
                        ) : uniqueSchools.map(school => (
                            <tr key={school} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <input type="checkbox" checked={selectedSchools.has(school)} onChange={() => {
                                        const newSet = new Set(selectedSchools);
                                        if (newSet.has(school)) newSet.delete(school);
                                        else newSet.add(school);
                                        setSelectedSchools(newSet);
                                    }} />
                                </td>
                                <td className="p-4 font-bold text-slate-700">{school}</td>
                                <td className="p-4">
                                    <select className="p-2 border border-slate-200 rounded bg-white w-full max-w-[200px] text-sm focus:border-indigo-500 outline-none transition-colors" value={schedules[school]?.gelombang || 'Gelombang 1'} onChange={(e) => handleChange(school, 'gelombang', e.target.value)}>
                                        <option>Gelombang 1</option>
                                        <option>Gelombang 2</option>
                                        <option>Gelombang 3</option>
                                        <option>Gelombang 4</option>
                                        <option>Susulan</option>
                                    </select>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 justify-center bg-white border border-slate-200 rounded-lg p-1.5 w-fit mx-auto shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-slate-400 font-bold uppercase ml-1">Mulai</span>
                                            <input type="date" className="p-1 text-sm bg-transparent outline-none font-medium text-indigo-700" value={schedules[school]?.tanggal || ''} onChange={(e) => handleChange(school, 'tanggal', e.target.value)}/>
                                        </div>
                                        <span className="text-slate-300 font-light text-2xl px-1">/</span>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-slate-400 font-bold uppercase ml-1">Selesai</span>
                                            <input type="date" className="p-1 text-sm bg-transparent outline-none font-medium text-indigo-700" value={schedules[school]?.tanggal_selesai || ''} onChange={(e) => handleChange(school, 'tanggal_selesai', e.target.value)}/>
                                        </div>
                                    </div>
                                    {(schedules[school]?.tanggal && schedules[school]?.tanggal_selesai && schedules[school]?.tanggal_selesai < schedules[school]?.tanggal) && (
                                        <p className="text-[10px] text-red-500 text-center mt-1 flex items-center justify-center gap-1"><AlertCircle size={10}/> Tanggal tidak valid</p>
                                    )}
                                </td>
                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => handleToggleToken(school, schedules[school]?.show_token || false)}
                                            disabled={togglingToken === school}
                                            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none ${schedules[school]?.show_token ? 'bg-indigo-600' : 'bg-slate-300'} ${togglingToken === school ? 'opacity-50 cursor-wait' : ''}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${schedules[school]?.show_token ? 'translate-x-7' : 'translate-x-1'}`} />
                                        </button>
                                        <span className={`text-xs font-bold ${schedules[school]?.show_token ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {togglingToken === school ? <Loader2 size={12} className="animate-spin"/> : (schedules[school]?.show_token ? 'ON' : 'OFF')}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
    );
};

export default AturGelombangTab;