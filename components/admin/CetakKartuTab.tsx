
import React, { useState, useMemo, useEffect } from 'react';
import { Printer, User as UserIcon, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { User } from '../../types';
import { api } from '../../services/api';
import { useAlert } from '../../context/AlertContext';

const CetakKartuTab = ({ currentUser, students, schedules }: { currentUser: User, students: any[], schedules: any[] }) => {
    const { showAlert } = useAlert();
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [filterSession, setFilterSession] = useState('all'); 
    const [showAll, setShowAll] = useState(false);
    
    const [localStudents, setLocalStudents] = useState<any[]>(students);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchFullData = async () => {
            setIsLoading(true);
            try {
                const data = await api.getUsers();
                if (Array.isArray(data) && data.length > 0) {
                    setLocalStudents(data);
                }
            } catch (e) {
                console.error("Failed to load full student data for cards", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFullData();
    }, []);

    const uniqueSchools = useMemo(() => {
        const schools = new Set(localStudents.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [localStudents]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(localStudents.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [localStudents]);

    const filteredStudents = useMemo(() => {
        return localStudents.filter(s => {
            if (currentUser.role === 'admin_sekolah') {
                if ((s.school || '').toLowerCase() !== (currentUser.kelas_id || '').toLowerCase()) return false;
            } else {
                if (filterSchool !== 'all' && s.school !== filterSchool) return false;
                if (filterKecamatan !== 'all' && (s.kecamatan || '').toLowerCase() !== filterKecamatan.toLowerCase()) return false;
            }
            if (filterSession !== 'all' && s.session !== filterSession) return false;
            if (s.role !== 'siswa') return false; 
            return true;
        });
    }, [localStudents, currentUser, filterSchool, filterKecamatan, filterSession]);

    const getGelombang = (schoolName: string) => {
        const sched = schedules.find((s: any) => s.school === schoolName);
        return sched ? sched.gelombang : '-';
    };

    const handlePrint = async () => {
        if (filteredStudents.length === 0) return showAlert("Tidak ada data siswa untuk dicetak.", { type: 'warning' });

        const printWindow = window.open('', '_blank');
        if (!printWindow) return showAlert("Pop-up blocked. Please allow pop-ups.", { type: 'error' });

        const proktorName = currentUser.nama_lengkap || "...........................";
        
        const cardsHtml = filteredStudents.map((s) => `
            <div class="card">
                <div class="card-header">
                    <img src="https://image2url.com/r2/default/images/1769821786493-a2e4eb8b-c903-460d-b8d9-44f326ff71bb.png" class="logo" />
                    <div class="header-text">
                        <h2>KARTU PESERTA</h2>
                        <p class="title-sub">TRY OUT TKA TAHUN 2026</p>
                        <p class="school-name">${s.school} - Kecamatan ${s.kecamatan || '-'}</p>
                    </div>
                    <img src="https://image2url.com/r2/default/images/1769821862384-d6ef24bf-e12c-4616-a255-7366afae4c30.png" class="logo" />
                </div>
                <div class="card-body">
                    <div class="info-col">
                        <table class="info-table">
                            <tr><td width="65">Nama</td><td>: <b>${s.fullname}</b></td></tr>
                            <tr><td>Sekolah</td><td>: ${s.school}</td></tr>
                            <tr><td>Gelombang</td><td>: ${getGelombang(s.school)}</td></tr>
                            <tr><td>Sesi</td><td>: <b>${s.session || '-'}</b></td></tr>
                            <tr><td>Username</td><td>: <b>${s.username}</b></td></tr>
                            <tr><td>Password</td><td>: <b>${s.password || '-'}</b></td></tr>
                        </table>
                    </div>
                    <div class="photo-col">
                        <div class="photo-box">
                            ${s.photo_url 
                                ? `<img src="${s.photo_url}" style="width:100%; height:100%; object-fit:cover;" />` 
                                : `<span style="font-size:8pt; color:#ccc; text-align:center;">FOTO<br>3x4</span>`
                            }
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="signature">
                        <p>Proktor</p>
                        <div class="sig-space"></div>
                        <p class="proktor-name"><b>${proktorName}</b></p>
                    </div>
                </div>
            </div>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cetak Kartu Peserta_TKA 2026</title>
                <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000000'%3E%3Cpath d='M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zM8 5h8v3H8V5zm8 12v2H8v-2h8zm2-2v-2H6v2H4v-4c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v4h-2z'/%3E%3Ccircle cx='18' cy='11.5' r='1'/%3E%3C/svg%3E" />
                <style>
                    @page { size: A4 portrait; margin: 4mm; }
                    body { font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; background: #eee; }
                    .page-container {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 2mm;
                        width: 100%;
                        max-width: 202mm;
                        margin: 0 auto;
                    }
                    .card {
                        background: white;
                        border: 1px solid #000;
                        width: 100mm;
                        height: 68mm;
                        padding: 5px;
                        box-sizing: border-box;
                        position: relative;
                        page-break-inside: avoid;
                        display: flex;
                        flex-direction: column;
                    }
                    .card-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-bottom: 2px double #000;
                        padding-bottom: 3px;
                        margin-bottom: 4px;
                        height: 15mm;
                    }
                    .logo { height: 12mm; width: auto; object-fit: contain; }
                    .header-text { text-align: center; flex: 1; }
                    .header-text h2 { font-size: 11pt; margin: 0; font-weight: bold; }
                    .header-text .title-sub { font-size: 10pt; margin: 2px 0 0; font-weight: bold; }
                    .header-text .school-name { font-size: 8pt; margin: 2px 0 0; font-style: italic; }
                    
                    .card-body { 
                        display: flex; 
                        flex: 1; 
                        gap: 5px; 
                        padding-top: 2px;
                    }
                    .info-col { flex: 1; }
                    .info-table { width: 100%; font-size: 8pt; border-collapse: collapse; }
                    .info-table td { padding: 2px 1px; vertical-align: top; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 55mm; }
                    
                    .photo-col { width: 22mm; display: flex; justify-content: center; align-items: flex-start; padding-top: 0; }
                    .photo-box {
                        width: 20mm; height: 26mm;
                        border: 1px solid #999;
                        display: flex; align-items: center; justify-content: center;
                    }

                    .card-footer {
                        position: absolute;
                        bottom: 6px;
                        right: 55px;
                        width: 160px;
                        text-align: center;
                    }
                    .signature {
                        font-size: 9pt;
                    }
                    .signature p { margin: 0; }
                    .signature .proktor-name {
                        font-size: 7pt; 
                        line-height: 1.2;
                    }
                    .sig-space { height: 15px; }

                    @media print {
                        body { background: white; }
                        .page-container { gap: 2mm; }
                    }
                </style>
            </head>
            <body>
                <div class="page-container">
                    ${cardsHtml}
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

    const displayedStudents = showAll ? filteredStudents : filteredStudents.slice(0, 12);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg flex items-center gap-2 text-slate-700"><Printer size={20}/> Cetak Kartu Peserta</h3>
                 {isLoading && <span className="text-xs text-indigo-600 font-bold flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Mengambil Data...</span>}
             </div>
             
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filter Sesi</label>
                        <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={filterSession} onChange={e => setFilterSession(e.target.value)}>
                            <option value="all">Semua Sesi</option>
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
                                        const found = localStudents.find(s => s.school === val);
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
                    {currentUser.role === 'admin_sekolah' && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-2 flex flex-col justify-center">
                            <p className="text-sm text-slate-600">Sekolah: <b>{currentUser.kelas_id}</b></p>
                            <p className="text-xs text-slate-400">Total Peserta: {filteredStudents.length}</p>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                    <div className="text-xs text-slate-500">
                        Siap cetak: <b>{filteredStudents.length}</b> kartu.
                    </div>
                    <button onClick={handlePrint} disabled={isLoading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg disabled:opacity-50">
                        <Printer size={16}/> Print Kartu
                    </button>
                </div>
             </div>

             <div className="border border-slate-200 rounded-lg p-4 bg-slate-100 overflow-y-auto max-h-[700px]">
                 {/* Dashboard Preview Grid - Set to 2 Columns to match Print */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center max-w-[800px] mx-auto">
                    {displayedStudents.map((s, idx) => (
                        <div key={idx} className="bg-white border border-slate-400 p-1.5 rounded-sm shadow-sm flex flex-col gap-1 relative text-[10px] mx-auto overflow-hidden" 
                             style={{ width: '378px', height: '257px', fontFamily: 'Arial, sans-serif' }}>
                            {/* Header Preview - Ratio 15mm/68mm * 257px = ~57px */}
                            <div className="flex justify-between items-center border-b-2 border-double border-slate-800 pb-1 mb-1 h-[57px]">
                                <img src="https://image2url.com/r2/default/images/1769821786493-a2e4eb8b-c903-460d-b8d9-44f326ff71bb.png" className="h-[46px] w-auto object-contain pl-1" alt="Logo"/>
                                <div className="text-center flex-1 leading-tight px-1">
                                    <h4 className="font-bold text-[13px]">KARTU PESERTA</h4>
                                    <p className="font-bold text-[11px]">TRY OUT TKA TAHUN 2026</p>
                                    <p className="text-[10px] italic mt-0.5 truncate max-w-[400px] mx-auto">{s.school} - Kecamatan {s.kecamatan || '-'}</p>
                                </div>
                                <img src="https://image2url.com/r2/default/images/1769821862384-d6ef24bf-e12c-4616-a255-7366afae4c30.png" className="h-[46px] w-auto object-contain pr-1" alt="Logo"/>
                            </div>
                            
                            {/* Body Preview */}
                            <div className="flex gap-2 flex-1 pt-1 px-1">
                                <div className="flex-1">
                                    <table className="w-full text-[11px] leading-loose">
                                        <tbody>
                                            <tr><td className="w-16">Nama</td><td>: <b>{s.fullname}</b></td></tr>
                                            <tr><td>Sekolah</td><td>: {s.school}</td></tr>
                                            <tr><td>Gelombang</td><td>: {getGelombang(s.school)}</td></tr>
                                            <tr><td>Sesi</td><td>: <b>{s.session || '-'}</b></td></tr>
                                            <tr><td>Username</td><td>: <b>{s.username}</b></td></tr>
                                            <tr><td>Password</td><td>: <b>{s.password || '-'}</b></td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="w-[83px] flex flex-col items-center">
                                    <div className="w-[76px] h-[98px] border border-slate-400 bg-slate-50 flex items-center justify-center text-[8px] text-slate-400 overflow-hidden">
                                        {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover"/> : <span className="text-center leading-tight">FOTO<br/>3x4</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Preview */}
                            <div className="absolute bottom-2 right-16 text-[10px] text-center w-[160px]">
                                <p>Proktor</p>
                                <div className="h-8"></div>
                                <p className="font-bold leading-tight text-[9px]">{currentUser.nama_lengkap}</p>
                            </div>
                        </div>
                    ))}
                 </div>
                 
                 {filteredStudents.length === 0 && <p className="text-center text-slate-400 italic py-10">Tidak ada data siswa yang sesuai filter.</p>}
                 
                 {/* Load More Button */}
                 {filteredStudents.length > 12 && (
                     <div className="mt-8 flex justify-center pb-4">
                         <button 
                            onClick={() => setShowAll(!showAll)} 
                            className="bg-white border border-slate-300 text-slate-600 px-6 py-2 rounded-full font-bold text-xs hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm flex items-center gap-2 group"
                         >
                            {showAll ? (
                                <>Tutup Tampilan <ChevronUp size={16} className="group-hover:-translate-y-1 transition-transform"/></>
                            ) : (
                                <>Lihat Semua ({filteredStudents.length} Peserta) <ChevronDown size={16} className="group-hover:translate-y-1 transition-transform"/></>
                            )}
                         </button>
                     </div>
                 )}
             </div>
        </div>
    );
};

export default CetakKartuTab;
