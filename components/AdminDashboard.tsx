
import React, { useState, useEffect, useMemo } from 'react';
import { Home, LogOut, Menu, Monitor, Group, Clock, Printer, List, Calendar, Key, FileQuestion, LayoutDashboard, ClipboardList, BarChart3, Award, RefreshCw, X, CreditCard, ChevronDown, ChevronRight, Settings, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { DashboardSkeleton } from '../utils/adminHelpers';

// Import New Sub-components
import OverviewTab from './admin/OverviewTab';
import AturGelombangTab from './admin/AturGelombangTab';
import KelompokTesTab from './admin/KelompokTesTab';
import AturSesiTab from './admin/AturSesiTab';
import CetakAbsensiTab from './admin/CetakAbsensiTab';
import CetakKartuTab from './admin/CetakKartuTab';
import RekapTab from './admin/RekapTab';
import RankingTab from './admin/RankingTab';
import AnalisisTab from './admin/AnalisisTab';
import StatusTesTab from './admin/StatusTesTab';
import DaftarPesertaTab from './admin/DaftarPesertaTab';
import RilisTokenTab from './admin/RilisTokenTab';
import BankSoalTab from './admin/BankSoalTab';
import RekapSurveyTab from './admin/RekapSurveyTab';
import SettingsTab from './admin/SettingsTab';

interface AdminDashboardProps {
    user: User;
    onLogout: () => void;
}

type TabType = 'overview' | 'rekap' | 'rekap_survey' | 'analisis' | 'ranking' | 'bank_soal' | 'data_user' | 'status_tes' | 'kelompok_tes' | 'rilis_token' | 'atur_sesi' | 'atur_gelombang' | 'cetak_absensi' | 'cetak_kartu' | 'settings';

// Define Menu Structure Interface
interface MenuItem {
    id: TabType;
    label: string;
    icon: React.ElementType;
    roles: string[]; // 'admin_pusat', 'admin_sekolah'
}

interface MenuGroup {
    id: string;
    label: string;
    items: MenuItem[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  // Initialize from localStorage or default to 'overview'
  const [activeTab, setActiveTab] = useState<TabType>(() => {
      const savedTab = localStorage.getItem('cbt_admin_tab');
      return (savedTab as TabType) || 'overview';
  });

  const [dashboardData, setDashboardData] = useState<any>({ 
      students: [], 
      questionsMap: {}, 
      totalUsers: 0, 
      token: 'TOKEN',
      duration: 60,
      maxQuestions: 0, 
      surveyDuration: 30, // Initialize
      statusCounts: { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 },
      activityFeed: [],
      allUsers: [], 
      schedules: [],
      configs: {}
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // State for Accordion Menu
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
      'main': true,
      'ujian': true,
      'laporan': false
  });

  // FIX: Local state for current user to allow updates without re-login
  const [currentUserState, setCurrentUserState] = useState<User>(user);

  useEffect(() => {
    setCurrentUserState(user);
  }, [user]);

  // Wrapper to switch tab and save to localStorage
  const handleTabChange = (tab: TabType) => {
      setActiveTab(tab);
      localStorage.setItem('cbt_admin_tab', tab);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
  };

  const toggleGroup = (groupId: string) => {
      setExpandedGroups(prev => ({
          ...prev,
          [groupId]: !prev[groupId]
      }));
  };

  // Define Menu Configuration
  const menuConfig: MenuGroup[] = useMemo(() => {
    return [
    {
        id: 'main',
        label: 'Utama',
        items: [
            { id: 'overview', label: 'Dashboard', icon: Home, roles: ['admin_pusat', 'admin_sekolah'] },
        ]
    },
    {
        id: 'ujian',
        label: 'Manajemen Ujian',
        items: [
            { id: 'status_tes', label: 'Status Tes', icon: Monitor, roles: ['admin_pusat', 'admin_sekolah'] },
            { id: 'kelompok_tes', label: 'Kelompok Tes', icon: Group, roles: ['admin_pusat', 'admin_sekolah', 'proktor'] },
            { id: 'atur_sesi', label: 'Atur Sesi', icon: Clock, roles: ['admin_pusat', 'admin_sekolah', 'proktor'] },
            { id: 'cetak_kartu', label: 'Cetak Kartu', icon: CreditCard, roles: ['admin_pusat', 'admin_sekolah'] },
            { id: 'cetak_absensi', label: 'Cetak Absensi', icon: Printer, roles: ['admin_pusat', 'admin_sekolah'] },
            { id: 'data_user', label: 'Daftar Peserta', icon: List, roles: ['admin_pusat', 'admin_sekolah', 'proktor'] },
            { id: 'atur_gelombang', label: 'Atur Gelombang', icon: Calendar, roles: ['admin_pusat'] },
            { id: 'rilis_token', label: 'Rilis Token', icon: Key, roles: ['admin_pusat', 'admin_sekolah', 'proktor'] },
        ]
    },
    {
        id: 'laporan',
        label: 'Laporan & Data',
        items: [
            { id: 'bank_soal', label: 'Bank Soal & Survey', icon: FileQuestion, roles: ['admin_pusat'] },
            { id: 'rekap', label: 'Rekap Nilai', icon: LayoutDashboard, roles: ['admin_pusat'] },
            { id: 'rekap_survey', label: 'Rekap Survey', icon: ClipboardList, roles: ['admin_pusat'] },
            { id: 'analisis', label: 'Analisis Soal', icon: BarChart3, roles: ['admin_pusat'] },
            { id: 'ranking', label: 'Peringkat', icon: Award, roles: ['admin_pusat'] },
        ]
    },
    {
        id: 'pengaturan',
        label: 'Pengaturan',
        items: [
            { id: 'settings', label: 'Setting Sistem', icon: Settings, roles: ['admin_pusat'] },
        ]
    }
  ];
  }, [dashboardData.configs, currentUserState.role]);

  // Auto-expand group based on active tab on mount
  useEffect(() => {
      menuConfig.forEach(group => {
          if (group.items.some(item => item.id === activeTab)) {
              setExpandedGroups(prev => ({ ...prev, [group.id]: true }));
          }
      });
  }, [activeTab, menuConfig]);

  // Update document title based on active tab
  useEffect(() => {
      let activeLabel = 'Dashboard';
      for (const group of menuConfig) {
          const item = group.items.find(i => i.id === activeTab);
          if (item) {
              activeLabel = item.label;
              break;
          }
      }
      document.title = `${activeLabel} | CBT Admin`;
  }, [activeTab, menuConfig]);

  const fetchData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
        const data = await api.getDashboardData();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            setDashboardData(data);
            
            // FIX: Sync current user data if found in dashboard data
            if (data.allUsers && Array.isArray(data.allUsers)) {
                const freshUser = data.allUsers.find((u: any) => u.username === user.username);
                if (freshUser) {
                    const updatedUser = { ...user, ...freshUser };
                    setCurrentUserState(updatedUser);
                    localStorage.setItem('cbt_user', JSON.stringify(updatedUser));
                }
            }
        } else {
            console.warn("Received empty dashboard data");
        }
    } catch (e: any) {
        console.error("Dashboard fetch error:", e);
        if (e.message === 'Failed to fetch' || e.message.includes('NetworkError')) {
            // This usually means CORS error, adblocker, or offline
            console.warn("Network error detected. Please check your connection or disable adblockers.");
        }
    } finally {
        setLoading(false);
        if (!silent) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Poll for realtime updates on overview tab
  useEffect(() => {
    if (activeTab === 'overview') {
        const interval = setInterval(() => {
            fetchData(true);
        }, 10000); // 10 seconds
        return () => clearInterval(interval);
    }
  }, [activeTab]);

  const getTabTitle = () => {
    let foundTitle = "Dashboard";
    menuConfig.forEach(group => {
        const item = group.items.find(i => i.id === activeTab);
        if (item) foundTitle = item.label;
    });
    return foundTitle;
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden fade-in backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) md:translate-x-0 md:static md:inset-auto md:flex shadow-xl md:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Sidebar Header */}
        <div className="p-6 flex justify-between items-center border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Monitor size={22} className="animate-pulse" />
             </div>
             <div>
                <h1 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">CBT <span className="text-indigo-600">Admin</span></h1>
                <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-wider">{currentUserState.role === 'admin_pusat' ? 'Administrator' : 'Proktor Panel'}</p>
             </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"><X size={20} /></button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
            {menuConfig.map(group => {
                // Filter items based on role
                const filteredItems = group.items.filter(item => item.roles.includes(currentUserState.role));
                
                if (filteredItems.length === 0) return null;

                const isExpanded = expandedGroups[group.id];

                return (
                    <div key={group.id} className="space-y-1">
                        {/* Group Header (Accordion Toggle) */}
                        {group.id !== 'main' && (
                            <button 
                                onClick={() => toggleGroup(group.id)}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-extrabold text-slate-400 uppercase tracking-wider hover:text-indigo-600 transition-colors group select-none"
                            >
                                <span>{group.label}</span>
                                {isExpanded ? <ChevronDown size={14} className="text-slate-300 group-hover:text-indigo-500"/> : <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500"/>}
                            </button>
                        )}

                        {/* Group Items */}
                        <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded || group.id === 'main' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            {filteredItems.map(item => {
                                const isActive = activeTab === item.id;
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleTabChange(item.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group relative ${
                                            isActive 
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-1' 
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-700'
                                        }`}
                                    >
                                        <Icon size={18} className={isActive ? 'text-indigo-100' : 'text-slate-400 group-hover:text-indigo-500 transition-colors'} strokeWidth={2.5} />
                                        <span>{item.label}</span>
                                        {isActive && <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full shadow-sm animate-pulse"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-3 flex items-center gap-3">
                 {currentUserState.photo_url ? (
                    <img 
                        src={currentUserState.photo_url} 
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-white" 
                        alt="Profile"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                ) : null}
                <div className={`${currentUserState.photo_url ? 'hidden' : ''} w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold border border-indigo-200 shadow-inner`}>
                    {currentUserState.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-slate-900 truncate">{currentUserState.nama_lengkap || currentUserState.username}</p>
                    <p className="text-[10px] font-bold text-indigo-600 truncate">{currentUserState.role === 'admin_pusat' ? 'Administrator' : currentUserState.kelas_id}</p>
                </div>
            </div>
            <button onClick={onLogout} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition">
                <LogOut size={16} /> Keluar
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col h-full w-full">
        {/* Sticky Header Mobile */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between md:hidden">
            <div className="flex items-center gap-3">
                 <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50 active:scale-95 transition">
                    <Menu size={20} />
                </button>
                <h1 className="text-lg font-bold text-slate-800">CBT System</h1>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => fetchData(false)} 
                    disabled={isRefreshing || loading}
                    className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shadow-sm active:scale-95 transition disabled:opacity-50"
                >
                    <RefreshCw size={18} className={isRefreshing || loading ? "animate-spin" : ""} />
                </button>
                <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
                     {currentUserState.username.charAt(0).toUpperCase()}
                </div>
            </div>
        </header>

        <div className="p-4 md:p-8 max-w-[1440px] w-full mx-auto">
          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{getTabTitle()}</h2>
                <p className="text-sm text-slate-500 mt-1">Kelola data dan pantau aktivitas ujian secara realtime.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => fetchData(false)} 
                disabled={isRefreshing || loading} 
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 text-sm font-bold rounded-full border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition shadow-sm disabled:opacity-70 disabled:cursor-wait"
              >
                <RefreshCw size={16} className={isRefreshing || loading ? "animate-spin" : ""} />
                <span>{isRefreshing ? 'Menyinkronkan...' : 'Refresh Data'}</span>
              </button>
            </div>
          </div>

          {loading ? <DashboardSkeleton /> : (
             <>
                {(!dashboardData.allUsers || dashboardData.allUsers.length === 0) && !loading && (
                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center mb-6">
                        <AlertCircle className="mx-auto text-amber-500 mb-2" size={32} />
                        <h3 className="font-bold text-amber-800">Data belum termuat sempurna</h3>
                        <p className="text-sm text-amber-700 mb-4">Koneksi mungkin lambat atau data sedang diproses di backend.</p>
                        <button onClick={() => fetchData(false)} className="px-6 py-2 bg-amber-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-amber-200 hover:bg-amber-600 transition">Coba Lagi</button>
                    </div>
                )}
                {activeTab === 'overview' && <OverviewTab dashboardData={dashboardData} currentUserState={currentUserState} />}
                {activeTab === 'status_tes' && <StatusTesTab currentUser={currentUserState} students={dashboardData.allUsers || []} refreshData={fetchData} />}
                {activeTab === 'kelompok_tes' && <KelompokTesTab currentUser={currentUserState} students={dashboardData.allUsers || []} refreshData={fetchData} />}
                {activeTab === 'atur_sesi' && (
                    <AturSesiTab 
                        currentUser={currentUserState} 
                        students={dashboardData.allUsers || []} 
                        refreshData={fetchData} 
                        isLoading={isRefreshing} 
                        readOnly={currentUserState.role !== 'admin_pusat' && dashboardData.configs?.ALLOW_PROCTOR_SESSION_EDIT !== 'TRUE'}
                        configs={dashboardData.configs || {}}
                        activeSessions={dashboardData.activeSessions || []}
                    />
                )}
                {activeTab === 'cetak_absensi' && <CetakAbsensiTab currentUser={currentUserState} students={dashboardData.allUsers || []} />}
                {activeTab === 'cetak_kartu' && <CetakKartuTab currentUser={currentUserState} students={dashboardData.allUsers || []} schedules={dashboardData.schedules || []} />}
                {activeTab === 'data_user' && (currentUserState.role === 'admin_pusat' || currentUserState.role === 'admin_sekolah' || currentUserState.role === 'proktor') && <DaftarPesertaTab currentUser={currentUserState} onDataChange={fetchData} />}
                {activeTab === 'atur_gelombang' && currentUserState.role === 'admin_pusat' && <AturGelombangTab students={dashboardData.allUsers || []} currentUser={currentUserState} refreshData={() => fetchData(true)} />}
                {activeTab === 'rilis_token' && <RilisTokenTab currentUser={currentUserState} token={dashboardData.token} duration={dashboardData.duration} maxQuestions={dashboardData.maxQuestions} surveyDuration={dashboardData.surveyDuration} refreshData={fetchData} isRefreshing={isRefreshing} configs={dashboardData.configs || {}} activeSessions={dashboardData.activeSessions || []} schedules={dashboardData.schedules || []} />}
                {activeTab === 'bank_soal' && currentUserState.role === 'admin_pusat' && <BankSoalTab />}
                {activeTab === 'rekap' && currentUserState.role === 'admin_pusat' && <RekapTab students={dashboardData.allUsers} currentUser={currentUserState} />}
                {activeTab === 'rekap_survey' && currentUserState.role === 'admin_pusat' && <RekapSurveyTab students={dashboardData.allUsers || []} currentUser={currentUserState} />}
                {activeTab === 'ranking' && currentUserState.role === 'admin_pusat' && <RankingTab students={dashboardData.allUsers} currentUser={currentUserState} />}
                {activeTab === 'analisis' && currentUserState.role === 'admin_pusat' && <AnalisisTab students={dashboardData.allUsers} />}
                {activeTab === 'settings' && currentUserState.role === 'admin_pusat' && <SettingsTab currentUser={currentUserState} onDataChange={fetchData} configs={dashboardData.configs || {}} />}
             </>

          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
