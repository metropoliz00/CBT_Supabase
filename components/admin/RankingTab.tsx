
import React, { useState, useMemo, useEffect } from 'react';
import { Award, FileText, Loader2, Printer, Search } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel, getPredicateBadge } from '../../utils/adminHelpers';
import { User } from '../../types';
import { useAlert } from '../../context/AlertContext';
import Pagination from './Pagination';

const RankingTab = ({ students, currentUser, configs }: { students: any[], currentUser: User, configs: Record<string, string> }) => {
    const { showAlert } = useAlert();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterPaket, setFilterPaket] = useState('all');
    const [filterSubject, setFilterSubject] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const userMap = useMemo(() => {
        const map: Record<string, any> = {};
        students.forEach(s => map[s.username] = s);
        return map;
    }, [students]);
    
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
    
    const uniqueSchools = useMemo(() => {
        let relevantData = data;
        if (currentUser.role === 'proktor' && currentUser.id_sekolah) {
            relevantData = data.filter(d => d.id_sekolah === currentUser.id_sekolah);
        } else if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            relevantData = data.filter(d => d.id_kecamatan === currentUser.id_kecamatan);
        } else if (currentUser.role === 'admin_sekolah') {
            const mySchoolName = (currentUser.kelas_id || '').toLowerCase();
            relevantData = data.filter(d => (d.sekolah || '').toLowerCase() === mySchoolName);
        }

        // Filter by kecamatan if selected
        if (filterKecamatan !== 'all') {
            relevantData = relevantData.filter(d => {
                const kec = d.kecamatan || userMap[d.username]?.kecamatan;
                return kec && kec.toLowerCase() === filterKecamatan.toLowerCase();
            });
        }

        const schools = new Set(relevantData.map(d => d.sekolah).filter(Boolean));
        return Array.from(schools).sort();
    }, [data, currentUser, filterKecamatan, userMap]);

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

    const subjectsPerPaket = useMemo(() => {
        const map = new Map<string, Set<string>>();
        data.forEach(d => {
            const paket = d.id_paket || 'none';
            const subject = d.mapel || d.subject || d.exam_id;
            if (subject) {
                if (!map.has(paket)) map.set(paket, new Set());
                map.get(paket)!.add(subject);
            }
        });
        return map;
    }, [data]);

    const uniquePakets = useMemo(() => {
        const pakets = new Set(data.map(d => d.id_paket).filter(Boolean));
        return Array.from(pakets).sort();
    }, [data]);
    
    useEffect(() => {
        setLoading(true);
        api.getRecap().then(res => { setData(res); }).catch(console.error).finally(() => setLoading(false));
    }, []);
    
    const pivotedData = useMemo(() => {
        const map = new Map<string, any>();
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
                    baseEntry[`score_${sub}`] = null;
                });
                map.set(key, baseEntry);
            }
            const entry = map.get(key);
            const subject = d.mapel || d.subject || d.exam_id || '';
            const rawVal = d.score ?? d.nilai;
            const val = parseFloat(rawVal);
            const safeVal = isNaN(val) ? 0 : val;
            
            if (subject) {
                entry[`score_${subject}`] = safeVal;
            }
        });
        const result = Array.from(map.values()).map(item => {
            let total = 0;
            let count = 0;
            displayedSubjects.forEach(sub => {
                if (item[`score_${sub}`] !== null) {
                    total += item[`score_${sub}`];
                    count++;
                }
            });
            const paket = item.id_paket || 'none';
            const paketSubjects = subjectsPerPaket.get(paket)?.size || 0;
            const expectedSubjects = filterSubject === 'all' ? paketSubjects : displayedSubjects.length;
            const avg = expectedSubjects > 0 ? total / expectedSubjects : 0;
            return { ...item, avg };
        });
        return result.sort((a, b) => b.avg - a.avg);
    }, [data, userMap, filterPaket, uniqueSubjects, subjectsPerPaket, displayedSubjects, filterSubject]);
    
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
            filtered = filtered.filter(d => {
                const kecMatch = filterKecamatan === 'all' || (d.kecamatan && d.kecamatan.toLowerCase() === filterKecamatan.toLowerCase());
                const schoolMatch = filterSchool === 'all' || (d.sekolah && d.sekolah.toLowerCase() === filterSchool.toLowerCase());
                return kecMatch && schoolMatch;
            });
        }

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(d => 
                (d.username || '').toLowerCase().includes(lowerSearch) ||
                (d.nama || '').toLowerCase().includes(lowerSearch) ||
                (d.sekolah || '').toLowerCase().includes(lowerSearch)
            );
        }

        return filtered;
    }, [pivotedData, filterKecamatan, filterSchool, currentUser, searchTerm]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredData.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredData, currentPage, rowsPerPage]);

    const getPredicateText = (score: number) => {
        if (score >= 86) return "Istimewa";
        if (score >= 71) return "Baik";
        if (score >= 56) return "Memadai";
        return "Kurang";
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
                ${displayedSubjects.map(sub => `<td style="text-align: center;">${d[`score_${sub}`] !== null ? d[`score_${sub}`] : '-'}</td>`).join('')}
                <td style="text-align: center; font-weight: bold;">${d.avg.toFixed(2)}</td>
                <td style="text-align: center;">${getPredicateText(d.avg)}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Peringkat Peserta - ${schoolName} - ${kecamatanName}</title>
                <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000000'%3E%3Cpath d='M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zM8 5h8v3H8V5zm8 12v2H8v-2h8zm2-2v-2H6v2H4v-4c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v4h-2z'/%3E%3Ccircle cx='18' cy='11.5' r='1'/%3E%3C/svg%3E" />
                <style>
                    @page {
                        size: A4 landscape;
                        margin: 10mm !important;
                    }

                    *, *::before, *::after {
                        box-sizing: border-box !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }

                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 8.5pt;
                        line-height: 1.2;
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
                            width: 297mm;
                            min-height: 210mm;
                            margin: 0 auto;
                        }
                    }

                    @media print {
                        body {
                            padding: 0 !important;
                            background: #ffffff !important;
                        }
                        .document-sheet {
                            box-shadow: none !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            width: 100% !important;
                        }
                        button, .no-print {
                            display: none !important;
                        }
                    }

                    .header-container {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-bottom: 2.5px double #000000;
                        padding-bottom: 8px;
                        margin-bottom: 12px;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .logo {
                        height: 60px;
                        width: auto;
                        max-width: 75px;
                        object-fit: contain;
                    }
                    .header-text {
                        text-align: center;
                        flex-grow: 1;
                        padding: 0 10px;
                    }
                    .header-text h2 {
                        margin: 0;
                        font-size: 13pt;
                        text-transform: uppercase;
                        line-height: 1.2;
                        font-weight: bold;
                    }
                    .header-text h3 {
                        margin: 3px 0 0;
                        font-size: 10.5pt;
                        font-weight: normal;
                        line-height: 1.2;
                    }

                    .info-table {
                        margin-bottom: 10px;
                        font-size: 9pt;
                        width: 100%;
                        border-collapse: collapse;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .info-table td {
                        padding: 2px 4px;
                        vertical-align: top;
                        border: none !important;
                    }

                    .main-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        border-spacing: 0 !important;
                        font-size: 8.5pt;
                        margin-bottom: 12px;
                        page-break-inside: auto !important;
                        break-inside: auto !important;
                    }
                    .main-table th, .main-table td {
                        border: 1px solid #000000 !important;
                        padding: 4px 5px !important;
                        vertical-align: middle;
                        line-height: 1.15;
                    }
                    .main-table th {
                        background-color: #f0f0f0 !important;
                        text-align: center;
                        font-weight: bold;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    thead {
                        display: table-header-group !important;
                    }
                    tfoot {
                        display: table-footer-group !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    .signature-section {
                        margin-top: 20px;
                        float: right;
                        width: 220px;
                        text-align: center;
                        font-size: 9pt;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        clear: both;
                    }
                    .signature-section p {
                        margin: 0;
                        line-height: 1.3;
                    }
                    .signature-section .sig-space {
                        height: 45px;
                    }
                    .signature-section .signer-name {
                        font-weight: bold;
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <div class="document-sheet">
                    <div class="header-container">
                        <img src="${configs.LOGO_KIRI_URL || 'https://image2url.com/r2/default/images/1769821786493-a2e4eb8b-c903-460d-b8d9-44f326ff71bb.png'}" class="logo" alt="Logo Kiri" />
                        <div class="header-text">
                            <h2>DAFTAR PERINGKAT PESERTA</h2>
                            <h2>${configs.PRINT_HEADER_MASTER || configs.HEADER_PERINGKAT || 'TRY OUT TKA TAHUN 2026'}</h2>
                            <h3>${schoolName} ${kecamatanName !== '-' ? `- Kecamatan ${kecamatanName}` : ''}</h3>
                        </div>
                        <img src="${configs.LOGO_KANAN_URL || 'https://image2url.com/r2/default/images/1769821862384-d6ef24bf-e12c-4616-a255-7366afae4c30.png'}" class="logo" alt="Logo Kanan" />
                    </div>

                    <table class="info-table">
                        <tr><td style="width: 120px; font-weight: bold;">Kecamatan</td><td style="width: 10px;">:</td><td>${kecamatanName}</td></tr>
                        <tr><td style="font-weight: bold;">Sekolah</td><td>:</td><td>${schoolName}</td></tr>
                        <tr><td style="font-weight: bold;">Tanggal Cetak</td><td>:</td><td>${dateNow}</td></tr>
                    </table>

                    <table class="main-table">
                        <thead>
                            <tr>
                                <th style="width: 35px;">Rank</th>
                                <th style="width: 85px;">Username</th>
                                <th>Nama Peserta</th>
                                <th style="width: 130px;">Sekolah</th>
                                <th style="width: 85px;">Kecamatan</th>
                                <th style="width: 55px;">Paket</th>
                                ${displayedSubjects.map(sub => `<th style="width: 50px;">${sub}</th>`).join('')}
                                <th style="width: 55px;">Rata2</th>
                                <th style="width: 75px;">Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <div class="signature-section">
                        <p>${signatureDate}</p>
                        <p>Administrator,</p>
                        <div class="sig-space"></div>
                        <p class="signer-name">${adminName}</p>
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
    
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="font-bold text-lg flex items-center gap-2"><Award size={20}/> Peringkat Peserta</h3>
                <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Cari Peserta..." 
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100 w-full md:w-48"
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
                    <button onClick={handlePrint} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition shadow-lg shadow-rose-200"><Printer size={16}/> Cetak PDF</button>
                    <button onClick={() => exportToExcel(filteredData, "Peringkat_Siswa_TKA")} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"><FileText size={16}/> Excel</button>
                </div>
            </div>
            
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-xs">
                        <tr>
                            <th className="p-4 text-center w-16">Rank</th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Nama</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Kecamatan</th>
                            <th className="p-4 text-center">Paket</th>
                            {displayedSubjects.map(sub => (
                                <th key={sub} className="p-4 text-center border-l border-slate-200">{sub}</th>
                            ))}
                            <th className="p-4 text-center border-l border-slate-200">Akhir</th>
                            <th className="p-4 text-center border-l border-slate-200">Predikat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={8 + displayedSubjects.length} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data...</td></tr>
                        ) : paginatedData.length === 0 ? (
                            <tr><td colSpan={8 + displayedSubjects.length} className="p-8 text-center text-slate-400 italic">Data tidak ditemukan.</td></tr>
                        ) : (
                            paginatedData.map((d, i) => {
                                const globalRank = (currentPage - 1) * rowsPerPage + i + 1;
                                return (
                                <tr key={i} className="border-b hover:bg-slate-50 transition">
                                    <td className="p-4 font-bold text-center text-slate-500"><div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${globalRank <= 3 ? 'bg-yellow-100 text-yellow-700 font-black' : 'bg-slate-100'}`}>{globalRank}</div></td>
                                    <td className="p-4 font-mono text-slate-600">{d.username}</td>
                                    <td className="p-4 font-bold text-slate-600">{d.nama}</td>
                                    <td className="p-4 text-slate-600">{d.sekolah}</td>
                                    <td className="p-4 text-slate-600">{d.kecamatan}</td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500">{d.id_paket}</span>
                                    </td>
                                    {displayedSubjects.map(sub => (
                                        <td key={sub} className="p-4 text-center font-bold text-slate-700 border-l border-slate-100">
                                            {d[`score_${sub}`] !== null ? d[`score_${sub}`] : '-'}
                                        </td>
                                    ))}
                                    <td className="p-4 text-center font-extrabold text-indigo-600 text-lg border-l border-slate-100">{d.avg.toFixed(2)}</td>
                                    <td className="p-4 text-center border-l border-slate-100">{getPredicateBadge(d.avg)}</td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-4">
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

export default RankingTab;
