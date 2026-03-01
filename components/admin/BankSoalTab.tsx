
import React, { useState, useEffect } from 'react';
import { FileQuestion, Download, Upload, Loader2, Plus, Edit, Trash2, X, Save, Image as ImageIcon } from 'lucide-react';
import { api } from '../../services/api';
import { QuestionRow } from '../../types';
import { useAlert } from '../../context/AlertContext';
import * as XLSX from 'xlsx';

const BankSoalTab = () => {
    const { showAlert } = useAlert();
    // ... existing implementation ...
    const [subjects, setSubjects] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [questions, setQuestions] = useState<QuestionRow[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentQ, setCurrentQ] = useState<QuestionRow | null>(null);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        const loadSubjects = async () => {
            const list = await api.getExams();
            // Filter standard subjects plus Add Survey sheets manually
            let names = list.map(l => l.nama_ujian);
            const listIds = list.map(l => l.id);
            const forbidden = ['Rangking', 'Nilai', 'Rekap_Analisis', 'Config', 'Users', 'Ranking', 'Logs'];
            const filtered = listIds.filter(n => !forbidden.includes(n) && !n.startsWith('Survey_'));
            filtered.push('Survey_Karakter', 'Survey_Lingkungan');
            
            setSubjects(filtered);
            if (filtered.length > 0) setSelectedSubject(filtered[0]);
        };
        loadSubjects();
    }, []);

    useEffect(() => {
        if (!selectedSubject) return;
        const loadQ = async () => {
            setLoadingData(true);
            try {
                // Determine if it is a survey
                const data = await api.getRawQuestions(selectedSubject);
                setQuestions(data);
            } catch(e) { console.error(e); }
            finally { setLoadingData(false); }
        };
        loadQ();
    }, [selectedSubject]);

    const handleEdit = (q: QuestionRow) => {
        setCurrentQ(q);
        setModalOpen(true);
    };

    const handleAddNew = () => {
        const isSurvey = selectedSubject.startsWith('Survey_');
        setCurrentQ({
            id: isSurvey ? `S${questions.length + 1}` : `Q${questions.length + 1}`,
            text_soal: '',
            tipe_soal: isSurvey ? 'LIKERT' : 'PG',
            gambar: '',
            keterangan_gambar: '', // Init
            opsi_a: '',
            opsi_b: '',
            opsi_c: '',
            opsi_d: '',
            kunci_jawaban: '',
            bobot: isSurvey ? 1 : 10,
            id_paket: ''
        });
        setModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        const confirmed = await showAlert(`Yakin ingin menghapus soal ID: ${id}?`, { type: 'confirm' });
        if (confirmed) {
            setLoadingData(true);
            await api.deleteQuestion(selectedSubject, id);
            const data = await api.getRawQuestions(selectedSubject);
            setQuestions(data);
            setLoadingData(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentQ) return;
        setLoadingData(true);
        const finalQ = { ...currentQ, kunci_jawaban: currentQ.kunci_jawaban.toUpperCase() };
        await api.saveQuestion(selectedSubject, finalQ);
        const data = await api.getRawQuestions(selectedSubject);
        setQuestions(data);
        setModalOpen(false);
        setLoadingData(false);
    };

    // --- IMPORT / EXPORT LOGIC ---
    const downloadTemplate = () => {
        const isSurvey = selectedSubject.startsWith('Survey_');
        // Update Template for Survey to use Scale 1, 2, 3, 4
        // A=1, B=2, C=3, D=4
        const header = isSurvey 
            ? ["ID", "Pernyataan", "Skala 1 (Nilai 1)", "Skala 2 (Nilai 2)", "Skala 3 (Nilai 3)", "Skala 4 (Nilai 4)"]
            : ["ID Soal", "Teks Soal", "Tipe Soal (PG/PGK/BS)", "Link Gambar", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Kunci Jawaban", "Bobot", "Ket. Gambar", "ID Paket Soal"];
        
        const row = isSurvey 
            ? [
                {
                    "ID": "S1", 
                    "Pernyataan": "Saya merasa senang belajar hal baru.", 
                    "Skala 1 (Nilai 1)": "Sangat Kurang Sesuai",
                    "Skala 2 (Nilai 2)": "Kurang Sesuai",
                    "Skala 3 (Nilai 3)": "Sesuai",
                    "Skala 4 (Nilai 4)": "Sangat Sesuai",
                }
              ]
            : [{
                "ID Soal": "Q1",
                "Teks Soal": "Berapakah hasil dari 1 + 1?",
                "Tipe Soal (PG/PGK/BS)": "PG",
                "Link Gambar": "",
                "Opsi A / Pernyataan 1": "2",
                "Opsi B / Pernyataan 2": "3",
                "Opsi C / Pernyataan 3": "4",
                "Opsi D / Pernyataan 4": "5",
                "Kunci Jawaban": "A",
                "Bobot": 10,
                "Ket. Gambar": "Gambar ilustrasi penjumlahan",
                "ID Paket Soal": "PAKET-01"
            }];

        const ws = XLSX.utils.json_to_sheet(row);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, isSurvey ? "Template_Survey.xlsx" : "Template_Soal_CBT.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setImporting(true);
        const file = e.target.files[0];
        const reader = new FileReader();
        const isSurvey = selectedSubject.startsWith('Survey_');
        
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
                
                const parsedQuestions: QuestionRow[] = [];
                for (let i = 1; i < data.length; i++) {
                    const row: any = data[i];
                    if (!row[0]) continue;
                    
                    if (isSurvey) {
                         // Mapping for Survey based on new template (Scale 1 up to 4):
                         // 0:ID, 1:Pernyataan, 2:Skala 1, 3:Skala 2, 4:Skala 3, 5:Skala 4, 6:Kunci, 7:Bobot
                         parsedQuestions.push({
                            id: String(row[0]),
                            text_soal: String(row[1] || ""),
                            tipe_soal: 'LIKERT',
                            gambar: "",
                            opsi_a: String(row[2] || ""), // Skala 1 (Nilai 1)
                            opsi_b: String(row[3] || ""), // Skala 2 (Nilai 2)
                            opsi_c: String(row[4] || ""), // Skala 3 (Nilai 3)
                            opsi_d: String(row[5] || ""), // Skala 4 (Nilai 4)
                            kunci_jawaban: String(row[6] || ""), // Key
                            bobot: Number(row[7] || 1) // Weight
                        });
                    } else {
                        parsedQuestions.push({
                            id: String(row[0]),
                            text_soal: String(row[1] || ""),
                            tipe_soal: (String(row[2] || "PG").toUpperCase() as any),
                            gambar: String(row[3] || ""),
                            opsi_a: String(row[4] || ""),
                            opsi_b: String(row[5] || ""),
                            opsi_c: String(row[6] || ""),
                            opsi_d: String(row[7] || ""),
                            kunci_jawaban: String(row[8] || "").toUpperCase(),
                            bobot: Number(row[9] || 10),
                            keterangan_gambar: String(row[10] || ""), // Index 10 for caption
                            id_paket: String(row[11] || "") // Index 11 for id_paket
                        });
                    }
                }

                if (parsedQuestions.length > 0) {
                     await api.importQuestions(selectedSubject, parsedQuestions);
                     await showAlert(`Berhasil mengimpor ${parsedQuestions.length} soal.`, { type: 'success' });
                     setLoadingData(true);
                     const freshData = await api.getRawQuestions(selectedSubject);
                     setQuestions(freshData);
                     setLoadingData(false);
                } else {
                    await showAlert("Tidak ada data soal yang ditemukan dalam file.", { type: 'warning' });
                }

            } catch (err) {
                console.error(err);
                await showAlert("Gagal membaca file Excel.", { type: 'error' });
            } finally {
                setImporting(false);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const isSurveyMode = selectedSubject.startsWith('Survey_');

    const formatImgUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('data:image')) return url;
        if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
            const match = url.match(/[-\w]{25,}/);
            if (match) return `https://drive.google.com/thumbnail?id=${match[0]}&sz=w200`;
        }
        return url;
    };

    return (
        <div className="space-y-6 fade-in max-w-full mx-auto">
             <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><FileQuestion size={24}/></div>
                    <div>
                        <h3 className="font-bold text-slate-800">Manajemen Bank Soal & Survey</h3>
                        <p className="text-xs text-slate-400">Edit database soal ujian and survey.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select 
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-bold min-w-[200px]"
                        value={selectedSubject}
                        onChange={e => setSelectedSubject(e.target.value)}
                    >
                        {subjects.length === 0 ? <option value="">-- Belum ada Mapel --</option> : subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button onClick={async () => {
                        const newSubjectId = prompt("Masukkan ID Mata Pelajaran Baru (tanpa spasi, contoh: Matematika, Bahasa_Indonesia):");
                        if (newSubjectId) {
                            const nama = prompt("Masukkan Nama Mata Pelajaran (contoh: Matematika, Bahasa Indonesia):");
                            if (nama) {
                                const res = await api.addExam(newSubjectId, nama);
                                if (res.success) {
                                    setSubjects([...subjects, newSubjectId]);
                                    setSelectedSubject(newSubjectId);
                                    await showAlert("Mata pelajaran berhasil ditambahkan", { type: 'success' });
                                } else {
                                    await showAlert("Gagal: " + res.message, { type: 'error' });
                                }
                            }
                        }
                    }} className="bg-indigo-100 text-indigo-600 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-200 transition">
                        <Plus size={16}/> Mapel Baru
                    </button>

                    <button onClick={downloadTemplate} className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition">
                        <Download size={16}/> Template
                    </button>

                    <label className={`cursor-pointer px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition text-white ${importing ? 'bg-emerald-400 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                        {importing ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                        {importing ? "Mengimpor..." : "Import Excel"}
                        <input type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" disabled={importing} />
                    </label>

                    <button onClick={handleAddNew} className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition">
                        <Plus size={16}/> Tambah
                    </button>
                </div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {loadingData ? (
                     <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={40} className="animate-spin text-indigo-600 mb-2" />
                        <span className="text-sm font-bold text-slate-400 animate-pulse">Memuat Data...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4 w-16">ID</th>
                                    <th className="p-4 w-24">Paket</th>
                                    <th className="p-4 min-w-[200px]">{isSurveyMode ? 'Pernyataan Survey' : 'Teks Soal'}</th>
                                    {!isSurveyMode && <th className="p-4 w-20">Tipe</th>}
                                    {!isSurveyMode && <th className="p-4 w-20">Kunci</th>}
                                    {isSurveyMode && (
                                        <>
                                            <th className="p-4">Skala 1</th>
                                            <th className="p-4">Skala 2</th>
                                            <th className="p-4">Skala 3</th>
                                            <th className="p-4">Skala 4</th>
                                        </>
                                    )}
                                    <th className="p-4 w-32 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {questions.length === 0 ? (
                                    <tr><td colSpan={10} className="p-8 text-center text-slate-400 italic">Belum ada data di sheet ini.</td></tr>
                                ) : questions.map((q, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition">
                                        <td className="p-4 font-mono font-bold text-slate-600">{q.id}</td>
                                        <td className="p-4">
                                            {q.id_paket ? (
                                                <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[10px] font-bold border border-indigo-100">{q.id_paket}</span>
                                            ) : (
                                                <span className="text-slate-300 text-[10px] italic">No Paket</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="line-clamp-2 font-medium text-slate-700">{q.text_soal}</div>
                                            {q.gambar && (
                                                <div className="mt-2 flex items-start gap-2">
                                                    <div className="relative group">
                                                        <img 
                                                            src={formatImgUrl(q.gambar)} 
                                                            alt="Soal" 
                                                            className="h-12 w-auto min-w-[3rem] object-contain rounded-md border border-slate-200 bg-white shadow-sm hover:scale-[3] hover:z-50 origin-top-left transition-transform duration-200 cursor-pointer"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                            }}
                                                        />
                                                        <div className="hidden flex items-center gap-1 text-xs text-red-400 bg-red-50 px-2 py-1 rounded border border-red-100 mt-1">
                                                            <ImageIcon size={12}/> Link Rusak
                                                        </div>
                                                    </div>
                                                    {q.keterangan_gambar ? (
                                                        <span className="text-[10px] text-slate-400 italic leading-tight self-center line-clamp-2 max-w-[200px]">"{q.keterangan_gambar}"</span>
                                                    ) : (
                                                        <span className="text-[10px] text-blue-400 font-bold bg-blue-50 px-1.5 py-0.5 rounded self-center">IMG</span>
                                                    )}
                                                </div>
                                            )}
                                            {!q.gambar && q.keterangan_gambar && <span className="text-[10px] text-slate-400 block mt-0.5 italic">"{q.keterangan_gambar}"</span>}
                                        </td>
                                        {!isSurveyMode && <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{q.tipe_soal}</span></td>}
                                        {!isSurveyMode && <td className="p-4 font-mono text-emerald-600 font-bold">{q.kunci_jawaban}</td>}
                                        {isSurveyMode && (
                                            <>
                                                <td className="p-4 text-xs text-slate-500">{q.opsi_a}</td>
                                                <td className="p-4 text-xs text-slate-500">{q.opsi_b}</td>
                                                <td className="p-4 text-xs text-slate-500">{q.opsi_c}</td>
                                                <td className="p-4 text-xs text-slate-500">{q.opsi_d}</td>
                                            </>
                                        )}
                                        <td className="p-4 flex justify-center gap-2">
                                            <button onClick={() => handleEdit(q)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(q.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
             </div>
             
             {/* EDIT MODAL */}
             {modalOpen && currentQ && (
                 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                     <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Edit size={20} className="text-indigo-600"/> {currentQ.id ? 'Edit Data' : 'Tambah Baru'}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1">
                            <form id="qForm" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID</label>
                                            <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.id} onChange={e => setCurrentQ({...currentQ, id: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Paket Soal</label>
                                            <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.id_paket || ''} onChange={e => setCurrentQ({...currentQ, id_paket: e.target.value})} placeholder="Contoh: PAKET-01" />
                                        </div>
                                    </div>
                                    {!isSurveyMode && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipe</label>
                                        <select className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-indigo-100 outline-none" value={currentQ.tipe_soal} onChange={e => setCurrentQ({...currentQ, tipe_soal: e.target.value as any})}>
                                            <option value="PG">Pilihan Ganda</option>
                                            <option value="PGK">Pilihan Ganda Kompleks</option>
                                            <option value="BS">Benar / Salah</option>
                                        </select>
                                    </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teks {isSurveyMode ? 'Pernyataan' : 'Soal'}</label>
                                        <textarea required rows={5} className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.text_soal} onChange={e => setCurrentQ({...currentQ, text_soal: e.target.value})}></textarea>
                                    </div>
                                    
                                    {!isSurveyMode && (
                                    <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Gambar (URL / Base64)</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.gambar} onChange={e => setCurrentQ({...currentQ, gambar: e.target.value})} placeholder="https://..." />
                                        {currentQ.gambar && (
                                            <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-200">
                                                <p className="text-[10px] text-slate-400 mb-1">Preview:</p>
                                                <img src={formatImgUrl(currentQ.gambar)} className="h-20 object-contain rounded" alt="Preview"/>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Keterangan Gambar (Opsional)</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.keterangan_gambar} onChange={e => setCurrentQ({...currentQ, keterangan_gambar: e.target.value})} placeholder="Keterangan singkat..." />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kunci Jawaban</label>
                                            <input required type="text" className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-emerald-700" value={currentQ.kunci_jawaban} onChange={e => setCurrentQ({...currentQ, kunci_jawaban: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bobot Nilai</label>
                                            <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.bobot} onChange={e => setCurrentQ({...currentQ, bobot: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                    </>
                                    )}
                                </div>
                                {isSurveyMode ? (
                                    <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                        <h4 className="font-bold text-slate-700 border-b pb-2 mb-2">Konfigurasi Likert (1, 2, 3, 4)</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label Skala 1 (Nilai 1)</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_a} onChange={e => setCurrentQ({...currentQ, opsi_a: e.target.value})} placeholder="Sangat Kurang Sesuai" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label Skala 2 (Nilai 2)</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_b} onChange={e => setCurrentQ({...currentQ, opsi_b: e.target.value})} placeholder="Kurang Sesuai" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label Skala 3 (Nilai 3)</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_c} onChange={e => setCurrentQ({...currentQ, opsi_c: e.target.value})} placeholder="Sesuai" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label Skala 4 (Nilai 4)</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_d} onChange={e => setCurrentQ({...currentQ, opsi_d: e.target.value})} placeholder="Sangat Sesuai" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target (Misal: 4)</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.kunci_jawaban} onChange={e => setCurrentQ({...currentQ, kunci_jawaban: e.target.value})} placeholder="4" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bobot (Default 1)</label>
                                                <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.bobot} onChange={e => setCurrentQ({...currentQ, bobot: Number(e.target.value)})} placeholder="1" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                    <h4 className="font-bold text-slate-700 border-b pb-2 mb-2">Pilihan Jawaban / Pernyataan</h4>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi A / Pernyataan 1</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_a} onChange={e => setCurrentQ({...currentQ, opsi_a: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi B / Pernyataan 2</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_b} onChange={e => setCurrentQ({...currentQ, opsi_b: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi C / Pernyataan 3</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_c} onChange={e => setCurrentQ({...currentQ, opsi_c: e.target.value})} />
                                    </div>
                                    {currentQ.tipe_soal !== 'PGK' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi D / Pernyataan 4</label>
                                            <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_d} onChange={e => setCurrentQ({...currentQ, opsi_d: e.target.value})} />
                                        </div>
                                    )}
                                </div>
                                )}
                            </form>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                            <button onClick={() => setModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition">Batal</button>
                            <button type="submit" form="qForm" disabled={loadingData} className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition flex items-center gap-2">
                                {loadingData ? <><div className="loader w-4 h-4 border-2"></div> Menyimpan...</> : <><Save size={18}/> Simpan Data</>}
                            </button>
                        </div>
                     </div>
                 </div>
             )}
        </div>
    );
};

export default BankSoalTab;
