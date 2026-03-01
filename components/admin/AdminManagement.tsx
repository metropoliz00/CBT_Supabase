import React, { useState, useEffect, useMemo } from 'react';
import { Shield, UserPlus, Search, Edit, Trash2, X, Camera, Save, Loader2, Upload, FileText, Download } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';
import { useAlert } from '../../context/AlertContext';
import * as XLSX from 'xlsx';
import { exportToExcel } from '../../utils/adminHelpers';

const AdminManagement = ({ currentUser, onDataChange }: { currentUser: User, onDataChange: () => void }) => {
    const { showAlert } = useAlert();
    const [admins, setAdmins] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [formData, setFormData] = useState<Partial<User>>({
        id: '', username: '', password: '', nama_lengkap: '', role: 'admin_sekolah',
        kelas_id: '', kecamatan: '', jenis_kelamin: 'L', photo: '', photo_url: '',
        id_sekolah: '', id_gugus: '', id_kecamatan: ''
    });

    useEffect(() => { loadAdmins(); }, []);

    const loadAdmins = async () => {
        setLoading(true);
        try {
            const data = await api.getUsers();
            setAdmins(data.filter(u => u.role === 'admin_sekolah' || u.role === 'admin_pusat'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (username: string) => {
        const confirmed = await showAlert("Yakin ingin menghapus admin/proktor ini?", { type: 'confirm' });
        if (!confirmed) return;
        setLoading(true);
        try {
            await api.deleteUser(username);
            setAdmins(prev => prev.filter(u => u.username !== username));
            onDataChange();
        } catch (e) {
            await showAlert("Gagal menghapus admin/proktor.", { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user: User) => {
        setFormData({ 
            id: user.id || '', 
            username: user.username || '', 
            password: user.password || '', 
            nama_lengkap: user.nama_lengkap || '', 
            role: user.role || 'admin_sekolah', 
            kelas_id: user.kelas_id || '', 
            kecamatan: user.kecamatan || '', 
            jenis_kelamin: user.jenis_kelamin || 'L', 
            photo: '', 
            photo_url: user.photo_url || '',
            id_sekolah: user.id_sekolah || '', 
            id_gugus: user.id_gugus || '', 
            id_kecamatan: user.id_kecamatan || ''
        });
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setFormData({
            id: '', username: '', password: '', nama_lengkap: '', role: 'admin_sekolah',
            kelas_id: '', kecamatan: '', jenis_kelamin: 'L', photo: '', photo_url: '',
            id_sekolah: '', id_gugus: '', id_kecamatan: ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = { ...formData, fullname: formData.nama_lengkap, school: formData.kelas_id, gender: formData.jenis_kelamin };
            await api.saveUser(payload);
            await loadAdmins();
            setIsModalOpen(false);
            onDataChange();
        } catch (e) {
            console.error(e);
            await showAlert("Gagal menyimpan data.", { type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { 
                await showAlert("Ukuran file terlalu besar. Maks 2MB", { type: 'warning' }); 
                return; 
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const maxSize = 500;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                    } else {
                        if (height > maxSize) { width *= maxSize / height; height = maxSize; }
                    }
                    
                    canvas.width = Math.floor(width);
                    canvas.height = Math.floor(height);
                    
                    if (ctx) {
                        ctx.fillStyle = "#FFFFFF";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                        setFormData(prev => ({ ...prev, photo: dataUrl }));
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExport = () => { 
        const dataToExport = filteredAdmins.map((u, i) => ({ 
            No: i + 1, 
            Username: u.username, 
            Password: u.password, 
            "Nama Lengkap": u.nama_lengkap, 
            Role: u.role, 
            "Jenis Kelamin": u.jenis_kelamin, 
            "Sekolah / Kelas": u.kelas_id, 
            "Kecamatan": u.kecamatan || '-', 
            "ID Sekolah": u.id_sekolah || '', 
            "ID Gugus": u.id_gugus || '', 
            "ID Kecamatan": u.id_kecamatan || '' 
        })); 
        exportToExcel(dataToExport, "Data_Admin_Proktor", "Admins"); 
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
        if (!e.target.files || e.target.files.length === 0) return;
        setIsImporting(true);
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
                const parsedUsers = [];
                const skippedRows: number[] = [];
                for (let i = 1; i < data.length; i++) {
                    const row: any = data[i];
                    if (!String(row[0]).trim() || !String(row[3]).trim()) {
                        if(row.some((cell: any) => cell.toString().trim() !== '')) { 
                            skippedRows.push(i + 1);
                        }
                        continue;
                    }
                    parsedUsers.push({
                        username: String(row[0]),
                        password: String(row[1]),
                        role: String(row[2] || 'admin_sekolah').toLowerCase(),
                        nama_lengkap: String(row[3]),
                        fullname: String(row[3]),
                        jenis_kelamin: String(row[4] || 'L').toUpperCase(),
                        gender: String(row[4] || 'L').toUpperCase(),
                        kelas_id: String(row[5] || ''),
                        school: String(row[5] || ''),
                        kecamatan: String(row[6] || ''),
                        photo_url: String(row[7] || ''),
                        id_sekolah: String(row[8] || ''),
                        id_gugus: String(row[9] || ''),
                        id_kecamatan: String(row[10] || '')
                    });
                }

                if (parsedUsers.length > 0) {
                    await api.importUsers(parsedUsers);
                    let successMessage = `Berhasil mengimpor ${parsedUsers.length} admin/proktor.`;
                    if (skippedRows.length > 0) {
                        successMessage += ` ${skippedRows.length} baris dilewati karena data tidak lengkap (baris: ${skippedRows.slice(0, 5).join(', ')}${skippedRows.length > 5 ? '...' : ''}).`;
                    }
                    await showAlert(successMessage, { type: 'success' });
                    await loadAdmins();
                    onDataChange();
                } else {
                    let warningMessage = "Tidak ada data valid yang ditemukan untuk diimpor.";
                    if (skippedRows.length > 0) {
                        warningMessage += ` ${skippedRows.length} baris dilewati karena data tidak lengkap.`;
                    }
                    await showAlert(warningMessage, { type: 'warning' });
                }
            } catch (err) {
                console.error(err);
                await showAlert("Gagal membaca file Excel. Pastikan formatnya benar.", { type: 'error' });
            } finally {
                setIsImporting(false);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => { 
        const ws = XLSX.utils.json_to_sheet([ 
            { 
                "Username": "proktor01", 
                "Password": "123", 
                "Role (siswa/admin_sekolah/admin_pusat)": "admin_sekolah", 
                "Nama Lengkap": "Pak Guru", 
                "L/P": "L", 
                "Sekolah / Kelas": "UPT SD Negeri Glodog", 
                "Kecamatan": "Palang", 
                "Link Foto (Opsional)": "", 
                "ID Sekolah": "SCH002", 
                "ID Gugus": "G02", 
                "ID Kecamatan": "KEC02" 
            } 
        ]); 
        const wb = XLSX.utils.book_new(); 
        XLSX.utils.book_append_sheet(wb, ws, "Template_Admin"); 
        XLSX.writeFile(wb, "Template_Import_Admin.xlsx"); 
    };

    const uniqueKecamatans = useMemo<string[]>(() => {
        let relevantAdmins = admins;
        if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            relevantAdmins = admins.filter(u => u.id_kecamatan === currentUser.id_kecamatan);
        } else if (currentUser.role === 'admin_sekolah') {
            const mySchoolName = (currentUser.kelas_id || '').toLowerCase();
            relevantAdmins = admins.filter(u => (u.kelas_id || '').toLowerCase() === mySchoolName);
        }
        const kecamatans = new Set(relevantAdmins.map(u => u.kecamatan).filter(Boolean));
        return Array.from(kecamatans).sort() as string[];
    }, [admins, currentUser]);
    const uniqueSchools = useMemo<string[]>(() => {
        let filtered = admins;
        if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            filtered = admins.filter(u => u.id_kecamatan === currentUser.id_kecamatan);
        } else if (currentUser.role === 'admin_sekolah') {
            const mySchoolName = (currentUser.kelas_id || '').toLowerCase();
            filtered = admins.filter(u => (u.kelas_id || '').toLowerCase() === mySchoolName);
        }

        if (filterKecamatan !== 'all') filtered = filtered.filter(u => u.kecamatan === filterKecamatan);
        const schools = new Set(filtered.map(u => u.kelas_id).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [admins, filterKecamatan, currentUser]);

    const filteredAdmins = useMemo(() => {
        let filtered = admins;

        // Apply role-based filtering first
        if (currentUser.role === 'admin_kecamatan' && currentUser.id_kecamatan) {
            filtered = filtered.filter(u => u.id_kecamatan === currentUser.id_kecamatan);
        } else if (currentUser.role === 'admin_sekolah') {
            const mySchoolName = (currentUser.kelas_id || '').toLowerCase();
            filtered = filtered.filter(u => (u.kelas_id || '').toLowerCase() === mySchoolName);
        }

        // Apply dropdown filters for admin_pusat (or if no specific role filter applied)
        if (currentUser.role === 'admin_pusat' || (!currentUser.id_kecamatan && !currentUser.kelas_id)) {
            if (filterKecamatan !== 'all') filtered = filtered.filter(u => u.kecamatan === filterKecamatan);
            if (filterSchool !== 'all') filtered = filtered.filter(u => u.kelas_id === filterSchool);
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(u => 
                u.username.toLowerCase().includes(lower) || 
                u.nama_lengkap.toLowerCase().includes(lower) || 
                (u.kelas_id && u.kelas_id.toLowerCase().includes(lower)) ||
                (u.kecamatan && u.kecamatan.toLowerCase().includes(lower))
            );
        }
        return filtered;
    }, [admins, filterKecamatan, filterSchool, searchTerm, currentUser]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Shield size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-slate-700">Manajemen Admin & Proktor</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={handleExport} className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-100 transition border border-emerald-100"><FileText size={14}/> Export Data</button>
                    <button onClick={downloadTemplate} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-200 transition"><Download size={14}/> Template</button>
                    <label className={`cursor-pointer bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition ${isImporting ? 'opacity-50 cursor-wait' : ''}`}>
                        {isImporting ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>} {isImporting ? "Mengimpor..." : "Impor Excel"}
                        <input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
                    </label>
                    <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition">
                        <UserPlus size={14}/> Tambah Admin/Proktor
                    </button>
                </div>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Cari admin atau proktor..." 
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {currentUser.role === 'admin_pusat' && (
                        <>
                            <select 
                                className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white" 
                                value={filterKecamatan} 
                                onChange={e => {
                                    setFilterKecamatan(e.target.value);
                                    setFilterSchool('all');
                                }}
                            >
                                <option value="all">Semua Kecamatan</option>{uniqueKecamatans.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <select 
                                className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white" 
                                value={filterSchool} 
                                onChange={e => {
                                    const val = e.target.value;
                                    setFilterSchool(val);
                                    if (val !== 'all') {
                                        const schoolUser = admins.find(u => u.kelas_id === val);
                                        if (schoolUser && schoolUser.kecamatan) {
                                            setFilterKecamatan(schoolUser.kecamatan);
                                        }
                                    }
                                }}
                            >
                                <option value="all">Semua Sekolah</option>{uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </>
                    )}
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Username</th>
                                <th className="p-4">Nama Lengkap</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Sekolah</th>
                                <th className="p-4">Kecamatan</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data...</td></tr>
                            ) : filteredAdmins.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Data tidak ditemukan.</td></tr>
                            ) : (
                                filteredAdmins.map(u => (
                                    <tr key={u.id || u.username} className="hover:bg-slate-50 transition">
                                        <td className="p-4 font-mono font-bold text-slate-600">{u.username}</td>
                                        <td className="p-4 text-slate-700 flex items-center gap-3">
                                            {u.photo_url ? 
                                                <img src={u.photo_url} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-white" /> : 
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-300">{(u.nama_lengkap || '?').charAt(0)}</div>
                                            }
                                            <span>{u.nama_lengkap ? u.nama_lengkap : <span className="text-red-500 italic">[Nama Kosong]</span>}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.role === 'admin_pusat' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {u.role === 'admin_sekolah' ? 'Proktor' : 'Admin Pusat'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600 text-xs">{u.kelas_id || '-'}</td>
                                        <td className="p-4 text-slate-600 text-xs">{u.kecamatan || '-'}</td>
                                        <td className="p-4 flex justify-center gap-2">
                                            <button onClick={() => handleEdit(u)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(u.username)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-slate-800">{formData.id ? 'Edit Admin/Proktor' : 'Tambah Admin/Proktor'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="flex justify-center mb-6">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 bg-white flex items-center justify-center shadow-sm">
                                            {(formData as any).photo ? <img src={(formData as any).photo} className="w-full h-full object-cover" /> : formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" /> : <Camera size={32} className="text-slate-300"/>}
                                        </div>
                                        <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 shadow-md">
                                            <Upload size={14}/>
                                            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleImageChange} />
                                        </label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                                        <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={!!formData.id} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                        <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                                    <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.nama_lengkap} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kecamatan</label>
                                    <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.kecamatan || ''} onChange={e => setFormData({...formData, kecamatan: e.target.value})} placeholder="Kecamatan" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                                        <select className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none bg-white" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as User['role']})}>
                                            <option value="admin_sekolah">Proktor</option>
                                            <option value="admin_pusat">Admin Pusat</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jenis Kelamin</label>
                                        <select className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none bg-white" value={formData.jenis_kelamin} onChange={e => setFormData({...formData, jenis_kelamin: e.target.value})}>
                                            <option value="L">Laki-laki</option>
                                            <option value="P">Perempuan</option>
                                        </select>
                                    </div>
                                </div>
                                {formData.role === 'admin_sekolah' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Sekolah</label>
                                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.kelas_id || ''} onChange={e => setFormData({...formData, kelas_id: e.target.value})} placeholder="Sekolah (opsional)" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Sekolah</label><input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.id_sekolah || ''} onChange={e => setFormData({...formData, id_sekolah: e.target.value})} placeholder="SCH001" /></div>
                                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Gugus</label><input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.id_gugus || ''} onChange={e => setFormData({...formData, id_gugus: e.target.value})} placeholder="G01" /></div>
                                        </div>
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Kecamatan</label><input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.id_kecamatan || ''} onChange={e => setFormData({...formData, id_kecamatan: e.target.value})} placeholder="KEC01" /></div>
                                    </>
                                )}
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">Batal</button>
                                    <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2">
                                        {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Simpan
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminManagement;
