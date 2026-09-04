
import React, { useState, useMemo, useEffect } from 'react';
import { ClipboardList, FileText, Loader2, Printer, RefreshCw, Search } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel } from '../../utils/adminHelpers';
import { User } from '../../types';
import Pagination from './Pagination';

const RekapSurveyTab = ({ students, currentUser, configs = {} }: { students: any[], currentUser: User, configs?: Record<string, string> }) => {
    const [selectedSurvey, setSelectedSurvey] = useState('Survey_Karakter');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [filterPaket, setFilterPaket] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [surveyOptions, setSurveyOptions] = useState<{id: string, name: string}[]>([]);
    
    useEffect(() => {
        api.getExams().then(exams => {
            const surveys = exams
                .filter(e => e.id.startsWith('Survey_'))
                .map(e => ({ id: e.id, name: e.nama_ujian }));
            setSurveyOptions(surveys);
            if (surveys.length > 0 && !surveys.find(s => s.id === selectedSurvey)) {
                setSelectedSurvey(surveys[0].id);
            }
        });
    }, []);

    const loadData = async () => {
        if (!selectedSurvey) return;
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

    const uniquePakets = useMemo(() => {
        const pakets = new Set(data.map(d => d.id_paket).filter(Boolean));
        return Array.from(pakets).sort();
    }, [data]);

    // FIX: Case-insensitive and trimmed filtering
    const filteredData = useMemo(() => {
        let filtered = data;

        // Apply Paket Filter
        if (filterPaket !== 'all') {
            filtered = filtered.filter(d => d.id_paket === filterPaket);
        }

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

        // Apply Search
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter((d: any) => 
                (d.username || '').toLowerCase().includes(lowerSearch) ||
                (d.nama || '').toLowerCase().includes(lowerSearch) ||
                (d.sekolah || '').toLowerCase().includes(lowerSearch)
            );
        }

        return filtered;
    }, [data, filterSchool, filterKecamatan, currentUser, searchTerm]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredData.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredData, currentPage, rowsPerPage]);

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

    const handlePrint = () => {
        if (filteredData.length === 0) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const surveyTitle = surveyOptions.find(s => s.id === selectedSurvey)?.name || selectedSurvey.replace(/_/g, ' ');
        const currentDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const proktorName = currentUser.nama_lengkap || currentUser.username || "Administrator";

        const rowsHtml = filteredData.map((d, index) => {
            const pred = getSurveyPredicate(d.rata);
            return `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center font-mono">${d.username}</td>
                    <td class="font-bold">${d.nama}</td>
                    <td>${d.sekolah || '-'}</td>
                    <td>${d.kecamatan || '-'}</td>
                    <td class="text-center">${d.id_paket || '-'}</td>
                    <td class="text-center font-bold">${d.total}</td>
                    <td class="text-center font-bold">${d.rata}</td>
                    <td class="text-center font-bold">${pred}</td>
                </tr>
            `;
        }).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Rekap Survey - ${surveyTitle}</title>
                <style>
                    @page {
                        size: A4 landscape;
                        margin: 10mm !important;
                    }
                    *, *::before, *::after {
                        box-sizing: border-box !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 8.5pt;
                    }
                    @media screen {
                        body {
                            background-color: #f1f5f9 !important;
                            padding: 20px !important;
                            display: flex;
                            justify-content: center;
                        }
                        .document-sheet {
                            background: #ffffff !important;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                            padding: 10mm !important;
                        }
                    }
                    @media print {
                        body {
                            background-color: #ffffff !important;
                            padding: 0 !important;
                        }
                        .document-sheet {
                            box-shadow: none !important;
                            padding: 0 !important;
                            width: 100% !important;
                        }
                    }
                    .document-sheet {
                        width: 277mm;
                        margin: 0 auto;
                        box-sizing: border-box !important;
                    }
                    .header-container {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-bottom: 2px solid #000000;
                        padding-bottom: 3mm;
                        margin-bottom: 4mm;
                    }
                    .header-logo {
                        width: 18mm;
                        height: 18mm;
                        object-fit: contain;
                    }
                    .header-title-box {
                        text-align: center;
                        flex: 1;
                        padding: 0 5mm;
                    }
                    .header-title-box h1 {
                        margin: 0;
                        font-size: 13pt;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .header-title-box h2 {
                        margin: 1.5mm 0 0 0;
                        font-size: 10.5pt;
                        font-weight: bold;
                    }
                    .header-title-box p {
                        margin: 1mm 0 0 0;
                        font-size: 8pt;
                        color: #333333;
                    }
                    .meta-info-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 3.5mm;
                        font-size: 8pt;
                    }
                    .meta-info-table td {
                        padding: 1mm 1.5mm;
                        vertical-align: top;
                    }
                    .data-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 7.8pt;
                    }
                    .data-table th, .data-table td {
                        border: 0.8px solid #000000;
                        padding: 1.5mm 2mm;
                        vertical-align: middle;
                    }
                    .data-table thead th {
                        background-color: #f1f5f9 !important;
                        font-weight: bold;
                        text-transform: uppercase;
                        text-align: center;
                        font-size: 7.5pt;
                    }
                    .data-table thead {
                        display: table-header-group;
                    }
                    .data-table tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .text-center { text-align: center; }
                    .font-mono { font-family: monospace; }
                    .font-bold { font-weight: bold; }
                    .signature-section {
                        margin-top: 6mm;
                        display: flex;
                        justify-content: flex-end;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .signature-box {
                        text-align: center;
                        width: 65mm;
                        font-size: 8pt;
                    }
                    .signature-space {
                        height: 16mm;
                    }
                    .signature-name {
                        font-weight: bold;
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <div class="document-sheet">
                    <div class="header-container">
                        <img src="${configs.LOGO_KIRI_URL || 'https://image2url.com/r2/default/images/1769821786493-a2e4eb8b-c903-460d-b8d9-44f326ff71bb.png'}" class="header-logo" alt="Logo Kiri" />
                        <div class="header-title-box">
                            <h1>REKAPITULASI HASIL SURVEY</h1>
                            <h2>${surveyTitle.toUpperCase()}</h2>
                            <p>${configs.PRINT_HEADER_MASTER || 'TRY OUT TKA TAHUN 2026'}</p>
                        </div>
                        <img src="${configs.LOGO_KANAN_URL || 'https://image2url.com/r2/default/images/1769821862384-d6ef24bf-e12c-4616-a255-7366afae4c30.png'}" class="header-logo" alt="Logo Kanan" />
                    </div>

                    <table class="meta-info-table">
                        <tr>
                            <td style="width: 15%;"><strong>Survey</strong></td>
                            <td style="width: 35%;">: ${surveyTitle}</td>
                            <td style="width: 15%;"><strong>Kecamatan</strong></td>
                            <td style="width: 35%;">: ${filterKecamatan === 'all' ? 'Semua Kecamatan' : filterKecamatan}</td>
                        </tr>
                        <tr>
                            <td><strong>Sekolah</strong></td>
                            <td>: ${filterSchool === 'all' ? 'Semua Sekolah' : filterSchool}</td>
                            <td><strong>Total Peserta</strong></td>
                            <td>: ${filteredData.length} Peserta</td>
                        </tr>
                    </table>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 28px;">No</th>
                                <th style="width: 80px;">Username</th>
                                <th>Nama Peserta</th>
                                <th>Sekolah</th>
                                <th>Kecamatan</th>
                                <th style="width: 45px;">Paket</th>
                                <th style="width: 45px;">Total</th>
                                <th style="width: 55px;">Rata-rata</th>
                                <th style="width: 75px;">Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <div class="signature-section">
                        <div class="signature-box">
                            <p style="margin: 0;">Tuban, ${currentDate}</p>
                            <p style="margin: 1mm 0 0 0;">Penanggung Jawab,</p>
                            <div class="signature-space"></div>
                            <p class="signature-name" style="margin: 0;">${proktorName}</p>
                            <p style="margin: 0.5mm 0 0 0; font-size: 7.5pt; color: #555;">NIP: .......................................</p>
                        </div>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 250);
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
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
                    <div className="flex gap-2 w-full lg:w-auto items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Cari Peserta..." 
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100 w-full md:w-48"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={loadData} disabled={loading} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg font-bold hover:bg-slate-200 transition">
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""}/>
                        </button>
                        <select className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-sm w-full lg:w-auto outline-none focus:ring-2 focus:ring-indigo-100" value={selectedSurvey} onChange={e => setSelectedSurvey(e.target.value)}>
                            {surveyOptions.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <select className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-sm w-full lg:w-auto outline-none focus:ring-2 focus:ring-indigo-100" value={filterPaket} onChange={e => setFilterPaket(e.target.value)}>
                            <option value="all">Semua Paket</option>
                            {uniquePakets.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                        <button onClick={handleExport} disabled={filteredData.length === 0} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 border border-emerald-100 transition shadow-sm disabled:opacity-50">
                            <FileText size={14}/> Export
                        </button>
                        <button onClick={handlePrint} disabled={filteredData.length === 0} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-rose-100 border border-rose-100 transition shadow-sm disabled:opacity-50">
                            <Printer size={14}/> Cetak PDF
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
                             <th className="p-4 text-center bg-slate-50">Paket</th>
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
                         ) : paginatedData.length === 0 ? (
                             <tr><td colSpan={8 + questionKeys.length} className="p-8 text-center text-slate-400">
                                 Tidak ada data untuk filter ini.<br/>
                                 <span className="text-xs">Pastikan siswa sudah mengerjakan survey dan filter sekolah sesuai.</span>
                             </td></tr>
                         ) : paginatedData.map((d, i) => {
                             const pred = getSurveyPredicate(d.rata);
                             return (
                             <tr key={i} className="hover:bg-slate-50 transition">
                                 <td className="p-4 text-center text-slate-500 border-r border-slate-100">{(currentPage - 1) * rowsPerPage + i + 1}</td>
                                 <td className="p-4 font-mono text-slate-600 border-r border-slate-100">{d.username}</td>
                                 <td className="p-4 font-bold text-slate-700 sticky left-0 bg-white border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{d.nama}</td>
                                 <td className="p-4 text-slate-600 text-xs">{d.sekolah}</td>
                                 <td className="p-4 text-slate-600 text-xs">{d.kecamatan}</td>
                                 <td className="p-4 text-center">
                                     <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500">{d.id_paket || '-'}</span>
                                 </td>
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
             
             <div className="p-4 border-t border-slate-100">
                 <Pagination 
                    currentPage={currentPage} 
                    totalRows={filteredData.length} 
                    rowsPerPage={rowsPerPage} 
                    onPageChange={setCurrentPage} 
                    onRowsPerPageChange={setRowsPerPage} 
                 />
             </div>
        </div>
    );
};

export default RekapSurveyTab;
