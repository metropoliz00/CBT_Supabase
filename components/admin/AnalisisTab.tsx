
import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, FileText, Loader2, Search } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel } from '../../utils/adminHelpers';
import { Exam } from '../../types';

const AnalisisTab = ({ students }: { students: any[] }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedPaket, setSelectedPaket] = useState('all');
    const [availablePakets, setAvailablePakets] = useState<string[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingPakets, setLoadingPakets] = useState(false);
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    const userMap = useMemo(() => {
        const map: Record<string, any> = {};
        students.forEach(s => map[s.username] = s);
        return map;
    }, [students]);

    useEffect(() => { 
        api.getExams().then(res => {
            setExams(res.filter(e => !e.id.startsWith('Survey_')));
        }); 
    }, []);

    useEffect(() => {
        if (!selectedExam) {
            setAvailablePakets([]);
            setSelectedPaket('all');
            setQuestions([]);
            return;
        }
        setLoadingPakets(true);
        api.getRawQuestions(selectedExam).then(res => {
            setQuestions(res);
            const pakets = Array.from(new Set(res.map(q => q.id_paket).filter(Boolean))) as string[];
            setAvailablePakets(pakets.sort());
        }).finally(() => setLoadingPakets(false));
    }, [selectedExam]);

    useEffect(() => {
        if (!selectedExam) return;
        setLoading(true);
        api.getRecap().then(res => {
            const examData = res.filter((r: any) => (r.subject || r.mapel) === selectedExam);
            setData(examData);
        }).catch(console.error).finally(() => setLoading(false));
    }, [selectedExam]);

    const uniqueSchools = useMemo(() => {
        const schools = new Set(data.map(d => d.school || d.sekolah).filter(Boolean));
        return Array.from(schools).sort();
    }, [data]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students]);

    // Get max questions config for selected exam
    const limitQuestions = useMemo(() => {
        const examConfig = exams.find(e => e.id === selectedExam);
        return examConfig?.max_questions || 0;
    }, [exams, selectedExam]);

    // Get question map for text display
    const questionMap = useMemo(() => {
        return Object.fromEntries(questions.map(q => [q.id, q.text_soal]));
    }, [questions]);

    const { parsedData, questionIds } = useMemo(() => {
        const filteredByPaket = data.filter(d => selectedPaket === 'all' || d.id_paket === selectedPaket);
        
        const parsed = filteredByPaket.map(d => {
            let ans = {};
            try {
                if (typeof d.analisis === 'string') {
                    ans = JSON.parse(d.analisis);
                } else {
                    ans = d.analisis || {};
                }
            } catch (e) {
                console.error("Failed to parse analysis JSON", e);
            }
            return { ...d, ansMap: ans };
        });

        // Get question IDs from the actual questions in the package if selected
        let sortedKeys: string[] = [];
        if (selectedPaket !== 'all') {
            sortedKeys = questions
                .filter(q => q.id_paket === selectedPaket)
                .map(q => q.id)
                .sort((a, b) => {
                    const numA = parseInt(a.replace(/\D/g, '')) || 0;
                    const numB = parseInt(b.replace(/\D/g, '')) || 0;
                    return numA - numB;
                });
        } else {
            const allKeys = new Set<string>();
            parsed.forEach(p => { Object.keys(p.ansMap).forEach(k => allKeys.add(k)); });
            
            sortedKeys = Array.from(allKeys).sort((a, b) => {
                const numA = parseInt(a.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.replace(/\D/g, '')) || 0;
                return numA - numB;
            });
        }

        // Filter keys based on max_questions setting
        if (limitQuestions > 0) {
            sortedKeys = sortedKeys.filter(key => {
                const num = parseInt(key.replace(/\D/g, '')) || 0;
                // Only include if number exists and is within limit
                return num > 0 && num <= limitQuestions;
            });
        }

        return { parsedData: parsed, questionIds: sortedKeys };
    }, [data, limitQuestions, selectedPaket, questions]);

    const filteredParsedData = useMemo(() => {
        return parsedData.filter(d => {
            const user = userMap[d.username];
            const userKecamatan = d.kecamatan || (user ? user.kecamatan : '-');
            const schoolName = d.school || d.sekolah;
            const schoolMatch = filterSchool === 'all' || schoolName === filterSchool;
            const kecMatch = filterKecamatan === 'all' || (userKecamatan && userKecamatan.toLowerCase() === filterKecamatan.toLowerCase());
            
            let searchMatch = true;
            if (searchTerm) {
                const lowerSearch = searchTerm.toLowerCase();
                searchMatch = 
                    (d.username || '').toLowerCase().includes(lowerSearch) ||
                    (d.fullname || d.nama || '').toLowerCase().includes(lowerSearch) ||
                    (d.school || d.sekolah || '').toLowerCase().includes(lowerSearch);
            }

            return schoolMatch && kecMatch && searchMatch;
        });
    }, [parsedData, filterSchool, filterKecamatan, userMap, searchTerm]);

    // Calculate Statistics per Question
    const questionStats = useMemo(() => {
        const stats: Record<string, { correct: number, wrong: number, percent: number }> = {};
        
        questionIds.forEach(qId => {
            let correctCount = 0;
            let totalCount = 0;
            
            filteredParsedData.forEach(d => {
                const val = d.ansMap[qId];
                // Only count if the question exists in the answer map
                if (val !== undefined && val !== "") {
                    totalCount++;
                    if (Number(val) === 1) correctCount++;
                }
            });

            stats[qId] = {
                correct: correctCount,
                wrong: totalCount - correctCount,
                percent: totalCount > 0 ? (correctCount / totalCount) * 100 : 0
            };
        });
        
        return stats;
    }, [filteredParsedData, questionIds]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2"><BarChart3 size={20}/> Analisis Butir Soal</h3>
                    <div className="flex flex-col gap-0.5 mt-1">
                        <p className="text-xs text-slate-400">Detail jawaban benar/salah setiap peserta.</p>
                        {limitQuestions > 0 && (
                            <p className="text-[10px] font-bold text-indigo-500 bg-indigo-50 w-fit px-2 py-0.5 rounded">
                                Menampilkan {limitQuestions} Soal (Sesuai Pengaturan)
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
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
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}><option value="all">Semua Kecamatan</option>{uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}</select>
                    <select 
                        className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" 
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
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}><option value="">-- Pilih Ujian --</option>{exams.map(e => <option key={e.id} value={e.id}>{e.nama_ujian}</option>)}</select>
                    <select 
                        className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50" 
                        value={selectedPaket} 
                        onChange={e => setSelectedPaket(e.target.value)}
                        disabled={!selectedExam || loadingPakets}
                    >
                        <option value="all">Semua Paket</option>
                        {availablePakets.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {filteredParsedData.length > 0 && (<button onClick={() => {
                            const exportData = filteredParsedData.map(d => {
                                const row: any = { Nama: d.fullname || d.nama, Sekolah: d.school || d.sekolah, Kecamatan: d.kecamatan || userMap[d.username]?.kecamatan || '-', Nilai: d.score || d.nilai };
                                questionIds.forEach(q => row[q] = d.ansMap[q]);
                                return row;
                            });
                            exportToExcel(exportData, `Analisis_${selectedExam}`);
                        }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"><FileText size={16}/> Export</button>)}
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[600px]">
                <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="p-3 w-10 text-center border-r border-slate-200 bg-slate-50" rowSpan={2}>No</th>
                            <th className="p-3 border-r border-slate-200 bg-slate-50" rowSpan={2}>Username</th>
                            <th className="p-3 sticky left-0 bg-slate-50 z-30 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" rowSpan={2}>Nama Peserta</th>
                            <th className="p-3 bg-slate-50" rowSpan={2}>Sekolah</th>
                            <th className="p-3 bg-slate-50" rowSpan={2}>Kecamatan</th>
                            <th className="p-3 border-r border-slate-200 bg-slate-50" rowSpan={2}>Nilai</th>
                            {questionIds.map(q => (<th key={q} className="p-3 text-center min-w-[40px] bg-slate-50 border-b border-slate-200">{q}</th>))}
                        </tr>
                        <tr>
                            {questionIds.map(q => (<th key={q} className="p-1 text-[10px] font-normal text-slate-400 text-center min-w-[40px] bg-slate-50 truncate max-w-[100px]" title={questionMap[q]}>{questionMap[q] || '-'}</th>))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (<tr><td colSpan={6 + questionIds.length} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data analisis...</td></tr>) : filteredParsedData.length === 0 ? (<tr><td colSpan={6 + questionIds.length} className="p-8 text-center text-slate-400 italic">Silakan pilih ujian untuk melihat data.</td></tr>) : (filteredParsedData.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition">
                            <td className="p-3 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
                            <td className="p-3 font-mono text-slate-600 border-r border-slate-100">{d.username}</td>
                            <td className="p-3 font-bold text-slate-700 sticky left-0 bg-white border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{d.fullname || d.nama}</td>
                            <td className="p-3 text-slate-600">{d.school || d.sekolah}</td>
                            <td className="p-3 text-slate-600">{d.kecamatan || userMap[d.username]?.kecamatan || '-'}</td>
                            <td className="p-3 font-bold text-indigo-600 border-r border-slate-100">{d.score || d.nilai}</td>
                            {questionIds.map(q => { 
                                const val = d.ansMap[q]; 
                                const isCorrect = Number(val) === 1; 
                                return (
                                    <td key={q} className={`p-2 text-center font-bold border-l border-slate-50 ${val === undefined ? 'text-slate-300' : isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                        {val === undefined ? '-' : isCorrect ? '✓' : '✗'}
                                    </td>
                                ); 
                            })}
                        </tr>)))}
                    </tbody>
                    {filteredParsedData.length > 0 && (
                        <tfoot className="bg-slate-100 font-bold sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t-2 border-slate-300">
                            <tr>
                                <td colSpan={6} className="p-3 text-right bg-slate-100 border-r border-slate-200">Total Benar</td>
                                {questionIds.map(q => (
                                    <td key={q} className="p-3 text-center text-emerald-600 bg-slate-100 border-l border-slate-200">{questionStats[q]?.correct}</td>
                                ))}
                            </tr>
                            <tr>
                                <td colSpan={6} className="p-3 text-right bg-slate-100 border-r border-slate-200">Total Salah</td>
                                {questionIds.map(q => (
                                    <td key={q} className="p-3 text-center text-rose-600 bg-slate-100 border-l border-slate-200">{questionStats[q]?.wrong}</td>
                                ))}
                            </tr>
                            <tr>
                                <td colSpan={6} className="p-3 text-right bg-slate-100 border-r border-slate-200">Kategori Soal</td>
                                {questionIds.map(q => {
                                    const percent = questionStats[q]?.percent || 0;
                                    const category = percent >= 75 ? 'Mudah' : percent >= 50 ? 'Sedang' : 'Sulit';
                                    const color = percent >= 75 ? 'text-emerald-700' : percent >= 50 ? 'text-yellow-700' : 'text-rose-700';
                                    return (
                                        <td key={q} className={`p-3 text-center ${color} bg-slate-100 border-l border-slate-200 font-bold`}>
                                            {category}
                                        </td>
                                    );
                                })}
                            </tr>
                            <tr>
                                <td colSpan={6} className="p-3 text-right bg-slate-100 border-r border-slate-200">% Ketercapaian</td>
                                {questionIds.map(q => {
                                    const percent = questionStats[q]?.percent || 0;
                                    const color = percent >= 75 ? 'text-emerald-700' : percent >= 50 ? 'text-yellow-700' : 'text-rose-700';
                                    return (
                                        <td key={q} className={`p-3 text-center ${color} bg-slate-100 border-l border-slate-200`}>
                                            {percent.toFixed(0)}%
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default AnalisisTab;
