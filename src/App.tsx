/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Mail, CheckCircle, RotateCw, LogOut, Sparkles, Globe, ChevronDown, Check } from 'lucide-react';
import BottomNav from './components/BottomNav';
import { InstallButton } from './components/InstallButton';
import Login from './pages/Login';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { UserProvider, useUser } from './context/UserContext';
import { translateUI } from './services/translationService';
import { LANGUAGES } from './constants';
import { cn } from './lib/utils';
import { WifiOff } from 'lucide-react';

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

const Home = lazy(() => import('./pages/Home'));
const Library = lazy(() => import('./pages/Library'));
const Create = lazy(() => import('./pages/Create'));
const Chat = lazy(() => import('./pages/Chat'));
const Profile = lazy(() => import('./pages/Profile'));
const Moments = lazy(() => import('./pages/Moments'));
const PostView = lazy(() => import('./pages/PostView'));
// const Login = lazy(() => import('./pages/Login'));

const VERIFICATION_LABELS = {
  title: 'Verify your email',
  desc: 'We sent a verification link to',
  clickToContinue: 'Please click it to continue.',
  confirmBtn: 'Confirmed, I clicked it',
  diffAccount: 'Use a different account',
  securityStamp: 'Security by Legacy Protocol'
};

function AnimatedRoutes({ lang, signOut, setLang }: { lang: string; signOut: () => void; setLang: (l: string) => void }) {
  const location = useLocation();
  const { user } = useUser();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="min-h-screen"
      >
        <Suspense fallback={null}>
          <Routes location={location}>
            <Route path="/" element={<ErrorBoundary><Home lang={lang} /></ErrorBoundary>} />
            <Route path="/moments" element={<Moments lang={lang} />} />
            <Route path="/library" element={<Library lang={lang} />} />
            <Route path="/create" element={<Create lang={lang} user={user} setLang={setLang} />} />
            <Route path="/chat" element={<Chat lang={lang} />} />
            <Route path="/work/:id" element={<PostView lang={lang} />} />
            <Route path="/profile" element={<ErrorBoundary><Profile onLogout={signOut} lang={lang} setLang={setLang} /></ErrorBoundary>} />
            <Route path="/profile/:id" element={<ErrorBoundary><Profile onLogout={signOut} lang={lang} setLang={setLang} /></ErrorBoundary>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function AppContent() {
  const { user, profile, loading, signOut, refreshUser, updateLanguage } = useUser();
  const [lang, setLang] = useState('English');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [vLabels, setVLabels] = useState(VERIFICATION_LABELS);
  const [isTranslating, setIsTranslating] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const applyTranslation = async () => {
      if (lang === 'English') {
        setVLabels(VERIFICATION_LABELS);
        return;
      }
      setIsTranslating(true);
      try {
        const translated = await translateUI(VERIFICATION_LABELS, lang);
        if (translated) setVLabels(translated);
      } catch (err) {
        console.error("App level translation error:", err);
      } finally {
        setIsTranslating(false);
      }
    };
    applyTranslation();
  }, [lang]);

  useEffect(() => {
    if (user && location.pathname === '/login') {
      navigate('/', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    if (profile?.language && profile.language !== lang) {
      setLang(profile.language);
    }
  }, [profile?.language, lang]);

  useEffect(() => {
    if (!user || user.emailVerified || user.providerData.some(p => p.providerId === 'google.com' || p.providerId === 'phone')) {
      return;
    }

    const interval = setInterval(refreshUser, 2000);

    return () => clearInterval(interval);
  }, [user, refreshUser]);

  if (loading) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="min-h-screen w-full bg-[#030305] flex items-center justify-center relative overflow-hidden font-sans select-none sm:p-4">
      {/* Premium ambient glows */}
      <div className="absolute top-[-15%] left-[-15%] w-[55%] h-[55%] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[55%] h-[55%] bg-rose-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* 9:16 Portrait Device Frame */}
      <div className="relative w-full h-full bg-black overflow-hidden flex flex-col transform translate-z-0 transition-all select-text">
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full bg-black"
            >
              <Suspense fallback={<div className="h-full bg-black flex items-center justify-center"><RotateCw className="animate-spin text-rose-500" size={24} /></div>}>
                <Routes>
                  <Route path="/login" element={<Login onLogin={() => navigate('/', { replace: true })} />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </Suspense>
            </motion.div>
          ) : user.emailVerified || user.providerData.some(p => p.providerId === 'google.com' || p.providerId === 'phone') ? (
            <motion.div 
              key="app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full w-full bg-black text-white selection:bg-rose-500 selection:text-white font-sans overflow-hidden flex flex-col relative"
            >
              <AnimatePresence>
                {!isOnline && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-0 inset-x-0 z-[100] bg-rose-500 text-white text-xs font-bold uppercase tracking-widest py-1.5 flex flex-row items-center justify-center gap-2"
                  >
                    <WifiOff size={14} />
                    Offline Mode Active
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="h-full w-full relative">
                <AnimatedRoutes lang={lang} signOut={signOut} setLang={setLang} />
              </div>
              <BottomNav lang={lang} />
              <InstallButton />
            </motion.div>
          ) : (
            <motion.div
              key="verify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full w-full bg-black flex items-center justify-center p-6 text-center"
            >
              {/* AI Translating Indicator */}
              <AnimatePresence>
                {isTranslating && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-12 left-1/2 -translate-x-1/2 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-2 z-50"
                  >
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                      <Sparkles size={12} className="text-rose-500" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="max-w-sm w-full space-y-8 bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-colors" />
                
                <div className="relative space-y-6">
                  <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto text-rose-500 rotate-3 group-hover:rotate-6 transition-transform">
                    <Mail size={32} />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-serif italic text-white">{vLabels.title}</h2>
                    <p className="text-sm text-gray-400 leading-relaxed px-4">
                      {vLabels.desc} <span className="text-rose-500 font-medium">{user.email}</span>. {vLabels.clickToContinue}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4">
                    <button
                      onClick={async () => {
                        setIsRefreshing(true);
                        await refreshUser();
                        setTimeout(() => setIsRefreshing(false), 800);
                      }}
                      disabled={isRefreshing}
                      className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-3 group/btn active:scale-95 disabled:opacity-50"
                    >
                      {isRefreshing ? <RotateCw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                      {vLabels.confirmBtn}
                    </button>

                    <button
                      onClick={signOut}
                      className="w-full py-4 bg-white/5 text-gray-400 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <LogOut size={18} />
                      {vLabels.diffAccount}
                    </button>
                  </div>

                  <div className="pt-6 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                      <Sparkles size={12} className="text-rose-500 text-xs" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{vLabels.securityStamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <UserProvider>
          <AppContent />
        </UserProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
