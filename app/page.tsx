'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Lock, 
  User, 
  LogOut, 
  ChevronRight, 
  FolderIcon, 
  FileText, 
  PlayCircle, 
  ExternalLink,
  Search,
  LayoutDashboard,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { AppxService, decrypt, decodeBase64 } from '@/lib/appx';
import { cn } from '@/lib/utils';

// Types
interface Course {
  id: string;
  course_name: string;
  course_thumbnail: string;
  price: string;
}

interface ContentItem {
  id: string;
  Title: string;
  material_type: 'FOLDER' | 'VIDEO' | 'PDF' | string;
}

const MASTER_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjIxMzYxOCIsImVtYWlsIjoiZmV5bmxlYXJuODY3QGdtYWlsLmNvbSIsIm5hbWUiOiJTQU1FRVIiLCJ0aW1lc3RhbXAiOjE3NzE0MTA2NzIsInRlbmFudFR5cGUiOiJ1c2VyIiwidGVuYW50TmFtZSI6ImRpc2hhb25saW5lY2xhc3Nlc19kYiIsInRlbmFudElkIjoiIiwiZGlzcG9zYWJsZSI6ZmFsc2V9.3brTy5ENwRXrUrpYtdy7xBPMXbAcpozI8LvNwDgIZrk";

export default function DishaDashboard() {
  const [authState, setAuthState] = useState<{ token: string; userid: string } | null>(null);
  const [view, setView] = useState<'LOGIN' | 'COURSES' | 'CONTENT'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [folderHistory, setFolderHistory] = useState<{ id: string; title: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Login Form State
  const [loginMethod, setLoginMethod] = useState<'CREDENTIALS' | 'TOKEN'>('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customToken, setCustomToken] = useState('');

  // Persist session
  useEffect(() => {
    const saved = localStorage.getItem('disha_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Promise.resolve().then(() => {
          setAuthState(parsed);
          setView('COURSES');
        });
      } catch (e) {
        localStorage.removeItem('disha_auth');
      }
    }
  }, []);

  const loadCourses = React.useCallback(async () => {
    if (!authState) return;
    setLoading(true);
    try {
      const res = await AppxService.getPurchases(authState.userid, authState.token);
      let courseList: Course[] = [];
      
      if (res.data && Array.isArray(res.data)) {
        res.data.forEach((item: any) => {
          if (item.coursedt && Array.isArray(item.coursedt)) {
            courseList.push(...item.coursedt);
          }
        });
      }

      // If getPurchases fails or is empty, try mycoursev2
      if (courseList.length === 0) {
        const res2 = await AppxService.getMyCourses(authState.userid, authState.token);
        if (res2.data && Array.isArray(res2.data)) {
          courseList = res2.data;
        }
      }

      setCourses(courseList);
    } catch (err) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [authState]);

  useEffect(() => {
    if (view === 'COURSES') {
      Promise.resolve().then(() => {
        loadCourses();
      });
    }
  }, [view, loadCourses]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let token = '';
      let userid = '12345'; // Default or extracted

      if (loginMethod === 'CREDENTIALS') {
        const res = await AppxService.login(email, password);
        if (res.status === 200 && res.data) {
          token = res.data.token;
          userid = res.data.userid;
        } else {
          throw new Error(res.message || 'Login failed');
        }
      } else {
        token = customToken || MASTER_TOKEN;
      }

      const session = { token, userid };
      setAuthState(session);
      localStorage.setItem('disha_auth', JSON.stringify(session));
      setView('COURSES');
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const loadFolder = async (folderId: string, folderTitle: string) => {
    if (!authState || !selectedCourse) return;
    setLoading(true);
    try {
      const res = await AppxService.getCourseFolders(selectedCourse.id, folderId, authState.token, authState.userid);
      if (res.data && Array.isArray(res.data)) {
        setContentItems(res.data);
        if (folderId === '-1') {
          setFolderHistory([]);
        } else if (!folderHistory.find(f => f.id === folderId)) {
          setFolderHistory([...folderHistory, { id: folderId, title: folderTitle }]);
        }
      } else {
        setContentItems([]);
      }
    } catch (err) {
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setView('CONTENT');
    loadFolder('-1', 'Root');
  };

  const handleBackToCourses = () => {
    setView('COURSES');
    setSelectedCourse(null);
    setContentItems([]);
    setFolderHistory([]);
  };

  const handleLogout = () => {
    localStorage.removeItem('disha_auth');
    setAuthState(null);
    setView('LOGIN');
    setCourses([]);
  };

  const handleItemClick = async (item: ContentItem) => {
    if (item.material_type === 'FOLDER') {
      loadFolder(item.id, item.Title);
    } else {
      // For videos or PDFs, we need to decrypt the link
      setLoading(true);
      try {
        const res = await AppxService.getVideoDetails(selectedCourse!.id, item.id, authState!.token, authState!.userid);
        if (res.data) {
          const downloadLink = res.data.download_link;
          if (downloadLink) {
            const decLink = decrypt(downloadLink);
            if (decLink) {
              window.open(decLink, '_blank');
            } else {
               // Handle encrypted links array fallback
               const encryptedLinks = res.data.encrypted_links;
               if (encryptedLinks && encryptedLinks.length > 0) {
                  const encryptedPath = encryptedLinks[0].path;
                  const decryptedPath = decrypt(encryptedPath);
                  if (decryptedPath) {
                    window.open(decryptedPath, '_blank');
                    return;
                  }
               }
               setError('Could not decrypt link');
            }
          } else if (res.data.video_id) {
            // YouTube or raw ID
             window.open(`https://www.youtube.com/watch?v=${decrypt(res.data.video_id)}`, '_blank');
          }
        }
      } catch (err) {
        setError('Failed to fetch item details');
      } finally {
        setLoading(false);
      }
    }
  };

  const navigateToHistory = (index: number) => {
    const target = folderHistory[index];
    const newHistory = folderHistory.slice(0, index + 1);
    setFolderHistory(newHistory);
    loadFolder(target.id, target.title);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">Disha Online Classes</h1>
            <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">Student Dashboard</p>
          </div>
        </div>
        
        {authState && (
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-all text-sm font-semibold"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto p-6 sm:p-8">
        <AnimatePresence mode="wait">
          {view === 'LOGIN' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto mt-12"
            >
              <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-[#F1F5F9] overflow-hidden p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex bg-blue-50 p-4 rounded-full text-blue-600 mb-4">
                    <ShieldCheck size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A]">Welcome Back</h2>
                  <p className="text-[#64748B] mt-2">Log in to access your course materials</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 flex items-start gap-3 text-sm">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p>{error}</p>
                  </div>
                )}

                <div className="flex gap-2 p-1 bg-[#F1F5F9] rounded-2xl mb-6">
                  <button 
                    onClick={() => setLoginMethod('CREDENTIALS')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                      loginMethod === 'CREDENTIALS' ? "bg-white text-blue-600 shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
                    )}
                  >
                    Credentials
                  </button>
                  <button 
                    onClick={() => setLoginMethod('TOKEN')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                      loginMethod === 'TOKEN' ? "bg-white text-blue-600 shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
                    )}
                  >
                    Token
                  </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {loginMethod === 'CREDENTIALS' ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#64748B] ml-1">Email / Phone</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
                          <input 
                            type="text"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            placeholder="Enter your registered info"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#64748B] ml-1">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
                          <input 
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#64748B] ml-1">Access Token</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
                        <textarea 
                          value={customToken}
                          onChange={(e) => setCustomToken(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none min-h-[100px]"
                          placeholder="Paste your auth token here (Leave blank for Master Token)"
                        />
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : "Sign In to Dashboard"}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'COURSES' && (
            <motion.div 
              key="courses"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Your Courses</h2>
                  <p className="text-[#64748B] mt-1 font-medium">Browse and manage your purchased batches</p>
                </div>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                    type="text"
                    placeholder="Search your courses..."
                    className="bg-white border border-[#E2E8F0] rounded-full py-2.5 pl-12 pr-6 w-full sm:w-80 shadow-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-medium"
                  />
                </div>
              </div>

              {loading && courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="animate-spin text-blue-600" size={40} />
                  <p className="text-[#64748B] font-semibold animate-pulse">Syncing your courses...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {courses.map((course) => (
                    <motion.div 
                      key={course.id}
                      whileHover={{ y: -4 }}
                      onClick={() => handleCourseClick(course)}
                      className="group cursor-pointer bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all"
                    >
                      <div className="aspect-video relative overflow-hidden bg-[#F1F5F9]">
                        {course.course_thumbnail ? (
                          <img 
                            src={course.course_thumbnail} 
                            alt={course.course_name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#94A3B8]">
                            <BookOpen size={48} />
                          </div>
                        )}
                        <div className="absolute top-4 right-4 h-8 px-3 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-xs font-bold text-blue-600 shadow-sm">
                          Active
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="font-bold text-[#0F172A] mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                          {course.course_name}
                        </h3>
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-xs font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded-md">ID: {course.id}</span>
                          <span className="flex items-center gap-1 text-blue-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            Open <ChevronRight size={16} />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'CONTENT' && selectedCourse && (
            <motion.div 
              key="content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleBackToCourses}
                  className="p-3 bg-white border border-[#E2E8F0] rounded-2xl text-[#64748B] hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">{selectedCourse.course_name}</h2>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B] mt-1">
                    <span onClick={() => loadFolder('-1', 'Root')} className="hover:text-blue-600 cursor-pointer">Courses</span>
                    {folderHistory.map((folder, idx) => (
                      <React.Fragment key={folder.id}>
                        <ChevronRight size={14} className="opacity-50" />
                        <span 
                          onClick={() => navigateToHistory(idx)}
                          className="hover:text-blue-600 cursor-pointer last:text-blue-600 last:font-bold"
                        >
                          {folder.title}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[32px] shadow-sm border border-[#E2E8F0] overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-[#F1F5F9]">
                  {loading && contentItems.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="animate-spin text-blue-600" size={32} />
                    </div>
                  ) : contentItems.length > 0 ? (
                    contentItems.map((item) => (
                      <motion.div 
                        key={item.id}
                        whileHover={{ backgroundColor: '#F8FAFC' }}
                        onClick={() => handleItemClick(item)}
                        className="flex items-center justify-between p-5 cursor-pointer group transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                            item.material_type === 'FOLDER' ? "bg-blue-50 text-blue-600" :
                            item.material_type === 'VIDEO' ? "bg-red-50 text-red-600" :
                            item.material_type === 'PDF' ? "bg-amber-50 text-amber-600" :
                            "bg-slate-50 text-slate-600"
                          )}>
                            {item.material_type === 'FOLDER' && <FolderIcon size={24} />}
                            {item.material_type === 'VIDEO' && <PlayCircle size={24} />}
                            {item.material_type === 'PDF' && <FileText size={24} />}
                            {item.material_type !== 'FOLDER' && item.material_type !== 'VIDEO' && item.material_type !== 'PDF' && <FileText size={24} />}
                          </div>
                          <div>
                            <h4 className="font-bold text-[#0F172A] group-hover:text-blue-600 transition-colors leading-tight">{item.Title}</h4>
                            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mt-0.5">{item.material_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {item.material_type !== 'FOLDER' && (
                             <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                               <ExternalLink size={18} className="text-[#94A3B8]" />
                             </div>
                          )}
                          <ChevronRight size={20} className="text-[#CBD5E1] group-hover:text-blue-600 transition-colors" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-20 text-[#64748B]">
                      <div className="inline-flex bg-slate-50 p-6 rounded-full text-slate-300 mb-4">
                        <Search size={48} />
                      </div>
                      <p className="font-bold text-lg">No content found</p>
                      <p className="text-sm mt-1">This folder appears to be empty.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-10 px-6 border-t border-[#E2E8F0] bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 grayscale opacity-60">
            <LayoutDashboard size={20} />
            <span className="font-bold tracking-tight">Disha Online Classes Dashboard</span>
          </div>
          <p className="text-sm font-medium text-[#94A3B8]">© 2026 Crafted with Excellence for Students.</p>
          <div className="flex gap-6 text-[#94A3B8] text-sm font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
