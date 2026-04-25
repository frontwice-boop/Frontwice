/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Mail, CheckCircle, RotateCw, LogOut, Sparkles } from 'lucide-react';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Library from './pages/Library';
import Create from './pages/Create';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Moments from './pages/Moments';
import Login from './pages/Login';
import { ToastProvider } from './context/ToastContext';
import { UserProvider, useUser } from './context/UserContext';
import { translateUI } from './services/translationService';

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
        <Routes location={location}>
          <Route path="/" element={<Home lang={lang} />} />
          <Route path="/moments" element={<Moments lang={lang} />} />
          <Route path="/library" element={<Library lang={lang} />} />
          <Route path="/create" element={<Create lang={lang} user={user} setLang={setLang} />} />
          <Route path="/chat" element={<Chat lang={lang} />} />
          <Route path="/profile" element={<Profile onLogout={signOut} lang={lang} setLang={setLang} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function AppContent() {
  const { user, profile, loading, signOut, refreshUser } = useUser();
  const [lang, setLang] = useState('English');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [vLabels, setVLabels] = useState(VERIFICATION_LABELS);

  // Sync global language with user profile
  React.useEffect(() => {
    if (profile?.language) {
      setLang(profile.language);
    }
  }, [profile?.language]);

  // Translate verification labels
  React.useEffect(() => {
    const translateVerif = async () => {
      if (lang !== 'English') {
        const translated = await translateUI(VERIFICATION_LABELS, lang);
        if (translated) setVLabels(translated);
      } else {
        setVLabels(VERIFICATION_LABELS);
      }
    };
    translateVerif();
  }, [lang]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="z-10 text-center"
        >
          <h1 className="text-4xl font-serif italic mb-2 tracking-tighter text-white">Frontwice</h1>
          <div className="w-12 h-0.5 bg-rose-500 mx-auto rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
              className="w-full h-full bg-white opacity-50"
            />
          </div>
        </motion.div>
        {/* Atmospheric Blur Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-rose-500/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-cyan-500/10 blur-[100px] rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login onLogin={() => {}} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Verification Gate
  if (user && !user.emailVerified) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
         {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-rose-500 rounded-full blur-[120px]" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500 rounded-full blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8 text-center z-10"
        >
          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="text-rose-500" size={40} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-serif italic mb-2 tracking-tight">{vLabels.title}</h1>
            <p className="text-sm text-gray-400 font-medium">
              {vLabels.desc} <span className="text-white font-bold">{user.email}</span>. {vLabels.clickToContinue}
            </p>
          </div>

          <div className="space-y-4 pt-10">
            <button 
              onClick={async () => {
                setIsRefreshing(true);
                await refreshUser();
                setIsRefreshing(false);
              }}
              className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-[0.98]"
            >
              <RotateCw className={isRefreshing ? "animate-spin" : ""} size={20} />
              {vLabels.confirmBtn}
            </button>

            <button 
              onClick={signOut}
              className="w-full py-4 bg-white/5 border border-white/10 text-gray-400 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <LogOut size={20} />
              {vLabels.diffAccount}
            </button>
          </div>

          <div className="pt-8 border-t border-white/5 flex items-center justify-center gap-2">
            <Sparkles size={12} className="text-rose-500" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">{vLabels.securityStamp}</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white selection:bg-rose-500 selection:text-white font-sans overflow-x-hidden">
        <main className="pb-16 max-w-lg mx-auto min-h-screen relative border-x border-white/5 bg-zinc-950/50 shadow-2xl transition-all">
          <AnimatedRoutes lang={lang} signOut={signOut} setLang={setLang} />
        </main>
        <BottomNav lang={lang} />
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </ToastProvider>
  );
}
