
import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, FileText, Loader2, Printer, Search, Edit, Trash2, X, Save } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel, formatDurationToText } from '../../utils/adminHelpers';
import { User } from '../../types';
import { useAlert } from '../../context/AlertContext';
import Pagination from './Pagination';

const RekapTab = ({ students, currentUser, configs }: { students: any[], currentUser: User, configs: Record<string, string> }) => {
    const { showAlert } = useAlert();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [filterPaket, setFilterPaket] = useState('all');
    const [filterSubject, setFilterSubject] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Edit State
    const [editingStudent, setEditingStudent] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const userMap = useMemo(() => {
        const map: Record<string, any> = {};
        students.forEach(s => map[s.username] = s);
        return map;
    }, [students]);

    const loadData = () => {
        setLoading(true);
        api.getRecap().then(setData).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const uniqueSubjects = useMemo(() => {
        const subjects = new Set<string>();
        data.forEach(d => {
            if (filterPaket !== 'all' && d.id_paket !== filterPaket) return;
            const subject = d.mapel || d.subject || d.exam_id;
            if (subject) subjects.add(subject);
        });
        return Array.from(subjects).sort();
    }, [data, filterPaket]);

    const displayedSubjects = useMemo(() => {
        if (filterSubject === 'all') return uniqueSubjects;
        return uniqueSubjects.filter(s => s === filterSubject);
    }, [uniqueSubjects, filterSubject]);

    const pivotedData = useMemo(() => {
        const map = new Map();
        data.forEach(d => {
            if (filterPaket !== 'all' && d.id_paket !== filterPaket) return;

            const key = `${d.username}_${d.id_paket || 'none'}`;
            if (!map.has(key)) {
                const baseEntry: any = {
                    username: d.username,
                    nama: d.fullname || d.nama || '-',
                    sekolah: d.school || d.sekolah || '-',
                    kecamatan: d.kecamatan || userMap[d.username]?.kecamatan || '-',
                    id_sekolah: d.id_sekolah || userMap[d.username]?.id_sekolah || '',
                    id_kecamatan: d.id_kecamatan || userMap[d.username]?.id_kecamatan || '',
                    id_paket: d.id_paket || '-'
                };
                uniqueSubjects.forEach(sub => {
                    baseEntry[`nilai_${sub}`] = '-';
                    baseEntry[`durasi_${sub}`] = '-';
                    baseEntry[`id_${sub}`] = '';
                });
                map.set(key, baseEntry);
            }
            const entry = map.get(key);
            const subject = d.mapel || d.subject || d.exam_id || '';
            const val = d.score ?? d.nilai;
            const displayVal = (val !== undefined && val !== null && val !== '') ? val : '-';
            const durationVal = d.duration || d.durasi || '-';
            const idVal = d.id;

            if (subject) {
                entry[`nilai_${subject}`] = displayVal;
                entry[`durasi_${subject}`] = durationVal;
                entry[`id_${subject}`] = idVal;
            }
        });
        return Array.from(map.values());
    }, [data, userMap, filterPaket, uniqueSubjects]);

    const filteredData = useMemo(() => {
        let filtered = pivotedData;

        // Apply role-based filtering first
        if (currentUser.role === 'proktor' && currentUser.id_sekolah) {
            filtered = filtered.filter(d => d.id_sekolah === currentUser.id_sekolah);
        } else if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            filtered = filtered.filter(d => d.id_kecamatan === currentUser.id_kecamatan);
        } else if (currentUser.role === 'admin_sekolah') {
            const mySchoolName = (currentUser.kelas_id || '').toLowerCase();
            filtered = filtered.filter(d => (d.sekolah || '').toLowerCase() === mySchoolName);
        }

        // Apply dropdown filters for admin_pusat (or if no specific role filter applied)
        if (currentUser.role === 'admin_pusat' || (!currentUser.id_sekolah && !currentUser.id_kecamatan && !currentUser.kelas_id)) {
            const matchSchool = filterSchool === 'all' || (filtered.some(d => d.sekolah && d.sekolah.toLowerCase() === filterSchool.toLowerCase()) ? (d: any) => d.sekolah && d.sekolah.toLowerCase() === filterSchool.toLowerCase() : true);
            const matchKecamatan = filterKecamatan === 'all' || (filtered.some(d => d.kecamatan && d.kecamatan.toLowerCase() === filterKecamatan.toLowerCase()) ? (d: any) => d.kecamatan && d.kecamatan.toLowerCase() === filterKecamatan.toLowerCase() : true);
            
            filtered = filtered.filter(d => {
                const schoolFilter = filterSchool === 'all' || (d.sekolah && d.sekolah.toLowerCase() === filterSchool.toLowerCase());
                const kecamatanFilter = filterKecamatan === 'all' || (d.kecamatan && d.kecamatan.toLowerCase() === filterKecamatan.toLowerCase());
                return schoolFilter && kecamatanFilter;
            });
        }

        // Apply Search
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(d => 
                d.username.toLowerCase().includes(lowerSearch) ||
                d.nama.toLowerCase().includes(lowerSearch) ||
                d.sekolah.toLowerCase().includes(lowerSearch)
            );
        }

        return filtered;
    }, [pivotedData, filterSchool, filterKecamatan, currentUser, searchTerm]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredData.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredData, currentPage, rowsPerPage]);

    const uniqueSchools = useMemo(() => {
        let relevantPivotedData = pivotedData;
        if (currentUser.role === 'proktor' && currentUser.id_sekolah) {
            relevantPivotedData = pivotedData.filter(d => d.id_sekolah === currentUser.id_sekolah);
        } else if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            relevantPivotedData = pivotedData.filter(d => d.id_kecamatan === currentUser.id_kecamatan);
        } else if (currentUser.role === 'admin_sekolah') {
            const mySchoolName = (currentUser.kelas_id || '').toLowerCase();
            relevantPivotedData = pivotedData.filter(d => (d.sekolah || '').toLowerCase() === mySchoolName);
        }

        // Filter by kecamatan if selected
        if (filterKecamatan !== 'all') {
            relevantPivotedData = relevantPivotedData.filter(d => d.kecamatan && d.kecamatan.toLowerCase() === filterKecamatan.toLowerCase());
        }

        const schools = new Set(relevantPivotedData.map(d => d.sekolah).filter(Boolean));
        return Array.from(schools).sort();
    }, [pivotedData, currentUser, filterKecamatan]);
    const uniqueKecamatans = useMemo(() => {
        let relevantStudents = students;
        if (currentUser.role === 'proktor' && currentUser.id_sekolah) {
            relevantStudents = students.filter(s => s.id_sekolah === currentUser.id_sekolah);
        } else if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            relevantStudents = students.filter(s => s.id_kecamatan === currentUser.id_kecamatan);
        } else if (currentUser.role === 'admin_sekolah') {
            const mySchoolName = (currentUser.kelas_id || '').toLowerCase();
            relevantStudents = students.filter(s => (s.school || '').toLowerCase() === mySchoolName);
        }
        const kecs = new Set(relevantStudents.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students, currentUser]);

    const uniquePakets = useMemo(() => {
        const pakets = new Set(data.map(d => d.id_paket).filter(Boolean));
        return Array.from(pakets).sort();
    }, [data]);

    // CRUD Handlers
    const handleEdit = (student: any) => {
        setEditingStudent(student);
        const newEditForm: Record<string, string> = {};
        uniqueSubjects.forEach(subject => {
            newEditForm[`id_${subject}`] = student[`id_${subject}`] || '';
            newEditForm[`nilai_${subject}`] = student[`nilai_${subject}`] === '-' ? '' : student[`nilai_${subject}`];
        });
        setEditForm(newEditForm);
    };

    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            const promises: Promise<any>[] = [];
            
            uniqueSubjects.forEach(subject => {
                const id = editForm[`id_${subject}`];
                const nilai = editForm[`nilai_${subject}`];
                
                if (id) {
                    promises.push(api.updateExamResult(id, { score: Number(nilai) }));
                } else if (nilai !== '') {
                    promises.push(api.createExamResult({
                        username: editingStudent.username,
                        exam_id: subject,
                        paket_id: editingStudent.id_paket || null,
                        score: Number(nilai),
                        start_time: new Date().getTime(),
                        end_time: new Date().getTime() + (120 * 60000), // Dummy duration 120 mins
                        answers: {}
                    }));
                }
            });

            await Promise.all(promises);
            await showAlert("Nilai berhasil disimpan", { type: 'success' });
            setEditingStudent(null);
            loadData();
        } catch (e) {
            console.error(e);
            await showAlert("Gagal menyimpan nilai", { type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteResult = async (id: string, subject: string) => {
        if (!confirm(`Yakin ingin menghapus nilai ${subject} ini?`)) return;
        
        setSaving(true);
        try {
            await api.deleteExamResult(id);
            await showAlert("Nilai berhasil dihapus", { type: 'success' });
            
            setEditForm(prev => ({ ...prev, [`id_${subject}`]: '', [`nilai_${subject}`]: '' }));
            
            loadData();
        } catch (e) {
            console.error(e);
            await showAlert("Gagal menghapus nilai", { type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = async () => {
        if (filteredData.length === 0) return showAlert("Tidak ada data untuk dicetak.", { type: 'warning' });

        const printWindow = window.open('', '_blank');
        if (!printWindow) return showAlert("Pop-up blocked. Please allow pop-ups.", { type: 'error' });

        const schoolName = filterSchool !== 'all' ? filterSchool : 'Semua Sekolah';
        const kecamatanName = filterKecamatan !== 'all' ? filterKecamatan : 'Semua Kecamatan';
        const dateNow = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const dateOnly = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const signatureDate = `Tuban, ${dateOnly}`;
        const adminName = currentUser.nama_lengkap || "Administrator";
        
        // Generate Rows
        const rowsHtml = filteredData.map((d, i) => `
            <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${d.username}</td>
                <td>${d.nama}</td>
                <td>${d.sekolah}</td>
                <td>${d.kecamatan}</td>
                <td style="text-align: center;">${d.id_paket}</td>
                ${displayedSubjects.map(sub => `<td style="text-align: center;">${d[`nilai_${sub}`]}</td>`).join('')}
            </tr>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Rekap Nilai TKA 2026</title>
                <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000000'%3E%3Cpath d='M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zM8 5h8v3H8V5zm8 12v2H8v-2h8zm2-2v-2H6v2H4v-4c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v4h-2z'/%3E%3Ccircle cx='18' cy='11.5' r='1'/%3E%3C/svg%3E" />
                <style>
                    body { font-family: 'Times New Roman', serif; padding: 20px; color: #000; }
                    .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double black; padding-bottom: 10px; margin-bottom: 20px; }
                    .logo { height: 80px; width: auto; object-fit: contain; }
                    .header-text { text-align: center; flex-grow: 1; padding: 0 10px; }
                    .header-text h2 { margin: 0; font-size: 18px; text-transform: uppercase; line-height: 1.2; }
                    .header-text h3 { margin: 5px 0 0; font-size: 16px; font-weight: normal; }
                    .info-table { margin-bottom: 20px; font-size: 14px; width: 100%; }
                    .info-table td { padding: 2px; vertical-align: top; }
                    .main-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    .main-table th, .main-table td { border: 1px solid black; padding: 6px; }
                    .main-table th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
                    .signature-section { margin-top: 50px; float: right; width: 250px; text-align: center; font-size: 14px; }
                    @media print {
                        @page { size: A4 landscape; margin: 1cm; }
                        button { display: none; }
                        body { padding: 0; }
                        .header-container { -webkit-print-color-adjust: exact; }
                        .main-table th { -webkit-print-color-adjust: exact; background-color: #f0f0f0 !important; }
                    }
                </style>
            </head>
            <body>
                <div class="header-container">
                    <img src="${configs.LOGO_KIRI_URL || 'https://image2url.com/r2/default/images/1769821786493-a2e4eb8b-c903-460d-b8d9-44f326ff71bb.png'}" class="logo" alt="Logo Kiri" />
                    <div class="header-text">
                        <h2>REKAPITULASI NILAI</h2>
                        <h2>${configs.HEADER_REKAP_NILAI || 'TRY OUT TKA TAHUN 2026'}</h2>
                    </div>
                    <img src="${configs.LOGO_KANAN_URL || 'https://image2url.com/r2/default/images/1769821862384-d6ef24bf-e12c-4616-a255-7366afae4c30.png'}" class="logo" alt="Logo Kanan" />
                </div>

                <table class="info-table">
                    <tr><td width="150">Kecamatan</td><td>: ${kecamatanName}</td></tr>
                    <tr><td width="150">Sekolah</td><td>: ${schoolName}</td></tr>
                    <tr><td>Tanggal Cetak</td><td>: ${dateNow}</td></tr>
                </table>

                <table class="main-table">
                    <thead>
                        <tr>
                            <th width="40">No</th>
                            <th>Username</th>
                            <th>Nama Peserta</th>
                            <th>Sekolah</th>
                            <th>Kecamatan</th>
                            <th width="80">ID Paket</th>
                            ${displayedSubjects.map(sub => `<th width="80">${sub}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="signature-section">
                    <p>${signatureDate}</p>
                    <p>Koordinator</p>
                    <br/><br/><br/>
                    <p style="text-decoration; font-weight: bold;">${adminName}</p>
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2"><LayoutDashboard size={20}/> Rekapitulasi Nilai</h3>
                    <p className="text-xs text-slate-400">Hasil ujian.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-wrap items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Cari Peserta..." 
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100 w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterPaket} onChange={e => setFilterPaket(e.target.value)}>
                        <option value="all">Semua Paket</option>
                        {uniquePakets.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                        <option value="all">Semua Mapel</option>
                        {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {currentUser.role === 'admin_pusat' && (
                        <>
                            <select 
                                className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" 
                                value={filterKecamatan} 
                                onChange={e => {
                                    setFilterKecamatan(e.target.value);
                                    setFilterSchool('all');
                                }}
                            >
                                <option value="all">Semua Kecamatan</option>
                                {uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select 
                                className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" 
                                value={filterSchool} 
                                onChange={e => {
                                    const val = e.target.value;
                                    setFilterSchool(val);
                                    if (val !== 'all') {
                                        const found = students.find(s => (s.school || s.kelas_id) === val);
                                        if (found && found.kecamatan) setFilterKecamatan(found.kecamatan);
                                    }
                                }}
                            >
                                <option value="all">Semua Sekolah</option>
                                {uniqueSchools.map((s:any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </>
                    )}
                     <button onClick={handlePrint} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition shadow-lg shadow-rose-200">
                        <Printer size={16}/> Cetak PDF
                     </button>
                     <button onClick={() => exportToExcel(filteredData, "Rekap_Nilai_TKA")} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">
                        <FileText size={16}/> Excel
                     </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-xs">
                        <tr>
                            <th className="p-4 w-12 text-center">No</th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Nama Peserta</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Kecamatan</th>
                            <th className="p-4 text-center">ID Paket</th>
                            {displayedSubjects.map((subject, idx) => (
                                <th key={subject} className={`p-4 text-center border-l border-slate-200 ${idx % 2 === 0 ? 'bg-blue-50/50' : 'bg-orange-50/50'}`}>{subject}</th>
                            ))}
                            {currentUser.role === 'admin_pusat' && <th className="p-4 text-center">Aksi</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={currentUser.role === 'admin_pusat' ? 7 + displayedSubjects.length : 6 + displayedSubjects.length} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data nilai...</td></tr>
                        ) : paginatedData.length === 0 ? (
                            <tr><td colSpan={currentUser.role === 'admin_pusat' ? 7 + displayedSubjects.length : 6 + displayedSubjects.length} className="p-8 text-center text-slate-400 italic">Data tidak ditemukan untuk filter ini.</td></tr>
                        ) : (
                            paginatedData.map((d, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition">
                                    <td className="p-4 text-center text-slate-500">{(currentPage - 1) * rowsPerPage + i + 1}</td>
                                    <td className="p-4 font-mono text-slate-600">{d.username}</td>
                                    <td className="p-4 font-bold text-slate-700">{d.nama}</td>
                                    <td className="p-4 text-slate-600">{d.sekolah}</td>
                                    <td className="p-4 text-slate-600">{d.kecamatan}</td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500">{d.id_paket}</span>
                                    </td>
                                    {displayedSubjects.map((subject, idx) => (
                                        <td key={subject} className={`p-4 text-center border-l border-slate-100 ${idx % 2 === 0 ? 'bg-blue-50/10' : 'bg-orange-50/10'}`}>
                                            {d[`nilai_${subject}`] !== '-' ? (
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-lg font-bold ${idx % 2 === 0 ? 'text-blue-600' : 'text-orange-600'}`}>{d[`nilai_${subject}`]}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">{formatDurationToText(d[`durasi_${subject}`])}</span>
                                                </div>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>
                                    ))}
                                    {currentUser.role === 'admin_pusat' && (
                                        <td className="p-4 text-center">
                                            <button onClick={() => handleEdit(d)} className="p-2 bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 rounded-lg transition">
                                                <Edit size={16}/>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination 
                currentPage={currentPage} 
                totalRows={filteredData.length} 
                rowsPerPage={rowsPerPage} 
                onPageChange={setCurrentPage} 
                onRowsPerPageChange={setRowsPerPage} 
            />

            {/* EDIT MODAL */}
            {editingStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Edit Nilai Peserta</h3>
                            <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-400 uppercase font-bold">Peserta</p>
                                <p className="font-bold text-slate-700">{editingStudent.nama}</p>
                                <p className="text-xs text-slate-500 font-mono">{editingStudent.username}</p>
                            </div>

                            {uniqueSubjects.map(subject => (
                                <div key={subject} className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 flex justify-between">
                                        <span>{subject}</span>
                                        {editForm[`id_${subject}`] && (
                                            <button onClick={() => handleDeleteResult(editForm[`id_${subject}`], subject)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                                                <Trash2 size={12}/> Hapus Nilai
                                            </button>
                                        )}
                                    </label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number" 
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                            placeholder="Nilai (0-100)"
                                            value={editForm[`nilai_${subject}`] || ''}
                                            onChange={e => setEditForm({...editForm, [`nilai_${subject}`]: e.target.value})}
                                        />
                                    </div>
                                    {!editForm[`id_${subject}`] && <p className="text-xs text-slate-400 italic">Belum ada nilai. Masukkan nilai untuk menambahkan.</p>}
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                            <button onClick={() => setEditingStudent(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg text-sm font-bold transition">Batal</button>
                            <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-200">
                                {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan Perubahan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RekapTab;
