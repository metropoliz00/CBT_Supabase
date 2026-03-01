import React, { useState, useEffect } from 'react';
import { User, QuestionWithOptions, UserAnswerValue, Exam } from '../types';
import { Clock, Check, ChevronRight, AlertCircle, Smile, Frown, Meh, ThumbsUp } from 'lucide-react';
import { api } from '../services/api';
import { useAlert } from '../context/AlertContext';

interface StudentSurveyProps {
  user: User;
  surveyType: 'Survey_Karakter' | 'Survey_Lingkungan';
  onFinish: () => void;
}

const DEFAULT_LIKERT_OPTIONS = [
    { value: 4, label: "Sangat Sesuai", icon: ThumbsUp, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { value: 3, label: "Sesuai", icon: Smile, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { value: 2, label: "Kurang Sesuai", icon: Meh, color: "text-orange-600 bg-orange-50 border-orange-200" },
    { value: 1, label: "Sangat Kurang Sesuai", icon: Frown, color: "text-red-600 bg-red-50 border-red-200" }
];

const StudentSurvey: React.FC<StudentSurveyProps> = ({ user, surveyType, onFinish }) => {
    const { showAlert } = useAlert();
    const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [startTime] = useState(Date.now());
    const [duration, setDuration] = useState(30); // Default local fallback
    const [timeLeft, setTimeLeft] = useState(0);

    const title = surveyType === 'Survey_Karakter' ? "Survey Karakter" : "Survey Lingkungan Belajar";

    useEffect(() => {
        const init = async () => {
            try {
                // Get Duration from Exams list config
                const exams = await api.getExams();
                const surveyConfig = exams.find(e => e.id === surveyType);
                const dur = surveyConfig ? surveyConfig.durasi : 30;
                setDuration(dur);
                setTimeLeft(dur * 60);

                const qData = await api.getSurveyQuestions(surveyType);
                setQuestions(qData);
            } catch(e) {
                console.error(e);
                await showAlert("Gagal memuat survey.", { type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [surveyType]);

    useEffect(() => {
        if (timeLeft <= 0 || loading) return;
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timeLeft, loading]);

    const handleAnswer = (qId: string, value: number) => {
        setAnswers(prev => ({ ...prev, [qId]: value }));
        // Auto scroll to next question could be added here if desired
    };

    const handleSubmit = async (isTimeout = false) => {
        setSubmitting(true);
        try {
            if (document.fullscreenElement) await document.exitFullscreen(); 
        } catch(e) {}

        try {
            await api.submitSurvey({
                user,
                surveyType,
                answers,
                startTime
            });
            if (isTimeout) await showAlert("Waktu survey habis. Jawaban tersimpan otomatis.", { type: 'warning', title: 'Waktu Habis' });
            onFinish();
        } catch(e) {
            console.error(e);
            await showAlert("Gagal mengirim survey. Coba lagi.", { type: 'error' });
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const progress = questions.length > 0 ? Math.round((Object.keys(answers).length / questions.length) * 100) : 0;
    const isComplete = questions.length > 0 && Object.keys(answers).length === questions.length;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
                <div className="loader border-indigo-600 w-10 h-10 border-4"></div>
                <p className="text-slate-500 font-bold">Menyiapkan Survey...</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4 p-8 text-center">
                <AlertCircle size={48} className="text-slate-300"/>
                <h2 className="text-xl font-bold text-slate-700">Survey Belum Tersedia</h2>
                <button onClick={onFinish} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Kembali</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {user.photo_url ? (
                            <img src={user.photo_url} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm bg-white" alt="Profile" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                                {user.nama_lengkap.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h1 className="font-bold text-slate-800 text-lg">{title}</h1>
                            <p className="text-xs text-slate-500">{user.nama_lengkap}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold ${timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            <Clock size={16}/>
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1 bg-slate-100 w-full">
                    <div className="h-full bg-indigo-600 transition-all duration-300" style={{width: `${progress}%`}}></div>
                </div>
            </header>

            {/* Questions List */}
            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm mb-6">
                    <strong>Petunjuk:</strong> Pilihlah jawaban yang paling menggambarkan diri atau kondisi lingkungan belajar Anda. Nilai dihitung dari 1-4 sesuai dengan pilihan Anda.
                </div>

                {questions.map((q, idx) => {
                    const hasDynamicOptions = q.options && q.options.length === 4;
                    let optionsToRender = DEFAULT_LIKERT_OPTIONS;

                    if (hasDynamicOptions) {
                        // Update: Fixed mapping A=1, B=2, C=3, D=4
                        // Index 0 (A) = 1, Index 1 (B) = 2, Index 2 (C) = 3, Index 3 (D) = 4
                        const mapped = q.options.map((o, i) => {
                            const val = i + 1; 
                            const style = DEFAULT_LIKERT_OPTIONS.find(d => d.value === val) || DEFAULT_LIKERT_OPTIONS[0];
                            return { 
                                value: val, 
                                label: o.text_jawaban, 
                                icon: style.icon, 
                                color: style.color
                            };
                        });
                        // Use mapped directly (A..D) without shuffling
                        optionsToRender = mapped;
                    }

                    return (
                        <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex gap-4 mb-4">
                                <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded h-fit text-sm">{idx + 1}</span>
                                <p className="text-slate-800 font-medium text-lg leading-relaxed">{q.text_soal}</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pl-0 md:pl-12">
                                {optionsToRender.map((opt) => {
                                    const isSelected = answers[q.id] === opt.value;
                                    const Icon = opt.icon;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleAnswer(q.id, opt.value)}
                                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${isSelected ? `border-indigo-600 bg-indigo-50 shadow-md transform scale-[1.02]` : 'border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'}`}
                                        >
                                            <Icon size={24} className={isSelected ? 'text-indigo-600' : 'text-slate-400'}/>
                                            <span className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-500'}`}>{opt.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                <div className="pt-8 pb-10 flex justify-center">
                    <button
                        onClick={() => handleSubmit(false)}
                        disabled={submitting || !isComplete}
                        className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 shadow-xl transition-all transform hover:-translate-y-1 ${!isComplete ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-500/30'}`}
                    >
                        {submitting ? <div className="loader border-white w-6 h-6 border-2"></div> : <Check size={24}/>}
                        {submitting ? "Menyimpan..." : "Kirim Jawaban Survey"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentSurvey;