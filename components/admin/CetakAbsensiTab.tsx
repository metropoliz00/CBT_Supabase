
import React, { useState, useMemo, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { api } from '../../services/api';
import { User, Exam } from '../../types';
import { useAlert } from '../../context/AlertContext';

const CetakAbsensiTab = ({ currentUser, students, configs }: { currentUser: User, students: any[], configs: Record<string, string> }) => {
    const { showAlert } = useAlert();
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedSession, setSelectedSession] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');

    useEffect(() => {
        api.getExams().then(res => {
            setExams(res.filter(e => !e.id.startsWith('Survey_')));
        });
    }, []);

    const uniqueSchools = useMemo(() => {
        const schools = new Set(students.map(s => s.kelas_id || s.school).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [students]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(students.map(s => s.kecamatan || s.id_kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const sSchool = (s.kelas_id || s.school || '').toLowerCase();
            const sKecamatan = (s.kecamatan || s.id_kecamatan || '').toLowerCase();

            if (currentUser.role === 'admin_sekolah') {
                if (sSchool !== (currentUser.kelas_id || '').toLowerCase()) return false;
            } else {
                if (filterSchool !== 'all' && (s.kelas_id !== filterSchool && s.school !== filterSchool)) return false;
                if (filterKecamatan !== 'all' && sKecamatan !== filterKecamatan.toLowerCase()) return false;
            }
            if (selectedSession && s.session !== selectedSession) return false;
            if (s.role !== 'siswa' && s.role !== undefined) return false; 
            return true;
        });
    }, [students, currentUser, filterSchool, filterKecamatan, selectedSession]);

    const handlePrint = async () => {
        if (filteredStudents.length === 0) return showAlert("Tidak ada data siswa untuk dicetak.", { type: 'warning' });

        const printWindow = window.open('', '_blank');
        if (!printWindow) return showAlert("Pop-up blocked. Please allow pop-ups.", { type: 'error' });

        const schoolName = currentUser.role === 'admin_sekolah' ? currentUser.kelas_id : (filterSchool !== 'all' ? filterSchool : 'Semua Sekolah');
        const kecamatanName = currentUser.role === 'admin_sekolah' ? (currentUser.kecamatan || '-') : (filterKecamatan !== 'all' ? filterKecamatan : '-');
        const sesiName = selectedSession || 'Semua Sesi';
        const examName = exams.find(e => e.id === selectedExamId)?.nama_ujian || '...........................';
        
        // Full date with weekday for Header Info
        const dateNow = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        
        // Date without weekday for Signature
        const dateOnly = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const signatureDate = `Tuban, ${dateOnly}`;
        
        const proktorName = currentUser.nama_lengkap || "...........................";

        const rowsHtml = filteredStudents.map((s, idx) => {
            const no = idx + 1;
            const isGanjil = no % 2 !== 0;

            return `
            <tr>
                <td style="text-align: center;">${no}</td>
                <td style="text-align: center;">${s.username}</td>
                <td>${s.nama_lengkap || s.fullname}</td>
                <td>${s.kelas_id || s.school}</td>
                <td>${s.kecamatan || s.id_kecamatan || '-'}</td>
                <td style="text-align: center;">${s.session || '-'}</td>
                <td style="padding: 3px 6px !important; font-size: 8.5pt; white-space: nowrap;">
                    <div style="${isGanjil ? 'text-align: left; padding-left: 4px;' : 'margin-left: 50%; text-align: left;'}">
                        ${no}. ................
                    </div>
                </td>
            </tr>
        `;
        }).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Daftar Hadir - ${schoolName} - ${sesiName}</title>
                <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000000'%3E%3Cpath d='M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zM8 5h8v3H8V5zm8 12v2H8v-2h8zm2-2v-2H6v2H4v-4c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v4h-2z'/%3E%3Ccircle cx='18' cy='11.5' r='1'/%3E%3C/svg%3E" />
                <style>
                    @page {
                        size: A4 portrait;
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
                        font-size: 9.5pt;
                        line-height: 1.25;
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
                            width: 210mm;
                            min-height: 297mm;
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
                        height: 65px;
                        width: auto;
                        max-width: 80px;
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
                        font-size: 11pt;
                        font-weight: normal;
                        line-height: 1.2;
                    }
                    
                    .info-table {
                        margin-bottom: 12px;
                        font-size: 9.5pt;
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
                        font-size: 9pt;
                        margin-bottom: 12px;
                        page-break-inside: auto !important;
                        break-inside: auto !important;
                    }
                    .main-table th, .main-table td {
                        border: 1px solid #000000 !important;
                        padding: 4px 5px !important;
                        vertical-align: middle;
                        line-height: 1.2;
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
                        margin-top: 25px;
                        float: right;
                        width: 220px;
                        text-align: center;
                        font-size: 9.5pt;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        clear: both;
                    }
                    .signature-section p {
                        margin: 0;
                        line-height: 1.3;
                    }
                    .signature-section .sig-space {
                        height: 50px;
                    }
                    .signature-section .proktor-name {
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
                            <h2>DAFTAR HADIR</h2>
                            <h2>${configs.PRINT_HEADER_MASTER || configs.HEADER_ABSENSI || 'TRY OUT TKA TAHUN 2026'}</h2>
                            <h3>${schoolName} ${kecamatanName !== '-' ? `- Kecamatan ${kecamatanName}` : ''}</h3>
                        </div>
                        <img src="${configs.LOGO_KANAN_URL || 'https://image2url.com/r2/default/images/1769821862384-d6ef24bf-e12c-4616-a255-7366afae4c30.png'}" class="logo" alt="Logo Kanan" />
                    </div>

                    <table class="info-table">
                        <tr><td style="width: 140px; font-weight: bold;">Mata Pelajaran</td><td style="width: 10px;">:</td><td>${examName}</td></tr>
                        <tr><td style="font-weight: bold;">Sesi / Paket</td><td>:</td><td>${sesiName}${filteredStudents.length > 0 && selectedSession ? ', ' + (filteredStudents[0].id_paket || '-') : ''}</td></tr>
                        <tr><td style="font-weight: bold;">Hari, Tanggal</td><td>:</td><td>${dateNow}</td></tr>
                    </table>

                    <table class="main-table">
                        <thead>
                            <tr>
                                <th style="width: 35px;">No</th>
                                <th style="width: 95px;">Username</th>
                                <th>Nama Peserta</th>
                                <th style="width: 130px;">Sekolah</th>
                                <th style="width: 90px;">Kecamatan</th>
                                <th style="width: 50px;">Sesi</th>
                                <th style="width: 140px;">Tanda Tangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <div class="signature-section">
                        <p>${signatureDate}</p>
                        <p>Proktor,</p>
                        <div class="sig-space"></div>
                        <p class="proktor-name">${proktorName}</p>
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
             <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-700"><Printer size={20}/> Cetak Daftar Hadir (Absensi)</h3>
             
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mata Pelajaran</label>
                         <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
                            <option value="">-- Pilih Mapel --</option>
                            {exams.map(e => <option key={e.id} value={e.id}>{e.nama_ujian}</option>)}
                        </select>
                    </div>
                    <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filter Sesi</label>
                         <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={selectedSession} onChange={e => setSelectedSession(e.target.value)}>
                            <option value="">Semua Sesi</option>
                            <option value="Sesi 1">Sesi 1</option>
                            <option value="Sesi 2">Sesi 2</option>
                            <option value="Sesi 3">Sesi 3</option>
                            <option value="Sesi 4">Sesi 4</option>
                        </select>
                    </div>
                    
                    {currentUser.role === 'admin_pusat' && (
                        <>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filter Kecamatan</label>
                            <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}>
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
                                        const found = students.find(s => (s.kelas_id === val || s.school === val));
                                        const foundKec = found ? (found.kecamatan || found.id_kecamatan) : null;
                                        if (foundKec) setFilterKecamatan(foundKec);
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
                </div>
                
                <div className="flex justify-end mt-4 pt-4 border-t border-slate-200">
                    <button onClick={handlePrint} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-900 transition flex items-center gap-2 shadow-lg">
                        <Printer size={16}/> Cetak Absensi
                    </button>
                </div>
             </div>

             <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4 w-10">No</th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Nama Peserta</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Kecamatan</th>
                            <th className="p-4">Sesi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                         {filteredStudents.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Tidak ada data siswa sesuai filter.</td></tr>
                        ) : (
                            filteredStudents.map((s, idx) => (
                                <tr key={s.username} className="hover:bg-slate-50">
                                    <td className="p-4 text-center text-slate-500 font-mono">{idx+1}</td>
                                    <td className="p-4 font-mono font-bold text-slate-600">{s.username}</td>
                                    <td className="p-4 font-bold text-slate-700">{s.nama_lengkap || s.fullname}</td>
                                    <td className="p-4 text-slate-600">{s.kelas_id || s.school}</td>
                                    <td className="p-4 text-slate-500 text-xs">{s.kecamatan || s.id_kecamatan || '-'}</td>
                                    <td className="p-4"><span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-bold">{s.session || '-'}</span></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
             </div>
        </div>
    );
};

export default CetakAbsensiTab;
