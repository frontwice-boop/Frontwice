import React, { useState, useEffect } from 'react';
import { Settings, LogOut, Globe, Shield, Camera, Languages as LangIcon, ChevronLeft, Key, Lock, Fingerprint, EyeOff, Trash2, Check, ChevronDown, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LANGUAGES } from '../constants';
import { cn } from '../lib/utils';
import { translateProfile, hasCache } from '../services/translationService';

const TRANSLATION_LANGUAGES = LANGUAGES.map(l => l.name);

const DEFAULT_LABELS = {
  followingLabel: 'Following',
  followersLabel: 'Followers',
  worksLabel: 'Works',
  securityLabel: 'Account Security',
  langSettingLabel: 'Language Setting',
  logoutLabel: 'Log Out',
  privacyLabel: 'Password & Privacy',
  backToProfile: 'Back to Profile',
  accountSecurityTitle: 'Account & Security',
  accountSecurityDesc: 'Manage your digital legacy and privacy settings.',
  authentication: 'Authentication',
  changePassword: 'Change Password',
  twoFactor: 'Two-Factor Auth',
  privacyControl: 'Privacy Control',
  privateProfile: 'Private Profile',
  privateProfileDesc: 'Only followers can see your work',
  deactivateAccount: 'Deactivate Account',
  writerAnonymous: 'Writer Anonymous',
  settingsHeader: 'Settings',
  profileSyncing: 'AI Syncing Profile...',
  aiConfigLabel: 'AI Configuration',
  aiKeyStatus: 'API Key Protocol',
  aiKeyActive: 'PROTOCOL ACTIVE',
  aiKeyMissing: 'ACTION REQUIRED',
  aiKeyDesc: 'Link your Gemini Pro key in AI Studio Secrets to activate Expert Review.',
  aiSettingsBtn: 'Manage AI Secrets'
};

import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';

export default function Profile({ 
  onLogout, 
  lang, 
  setLang 
}: { 
  onLogout: () => void; 
  lang: string; 
  setLang: (l: string) => void; 
}) {
  const { user, profile, loading, updateLanguage } = useUser();
  const { showToast } = useToast();
  const [activeView, setActiveView] = useState<'profile' | 'security'>('profile');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const applyTranslation = async () => {
      if (lang !== 'English' && TRANSLATION_LANGUAGES.includes(lang)) {
        const cacheKey = `profile_${lang}`;
        if (!hasCache(cacheKey)) {
          setIsTranslating(true);
        }
        
        const translated = await translateProfile(DEFAULT_LABELS, lang);
        if (translated) {
          setLabels(translated);
        }
        setIsTranslating(false);
      } else {
        setLabels(DEFAULT_LABELS);
      }
    };
    applyTranslation();
  }, [lang]);

  const selectedLanguage = LANGUAGES.find(l => l.name === lang) || LANGUAGES[0];

  const filteredLanguages = LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(langSearch.toLowerCase()) || 
    l.native.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <div className="p-4 pt-10 pb-24 h-full overflow-y-auto no-scrollbar relative min-h-screen">
      {/* Deactivation Confirmation Modal */}
      <AnimatePresence>
        {showDeactivateConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold uppercase tracking-widest text-white">Deactivate?</h3>
                <p className="text-xs text-gray-500 leading-relaxed italic">
                  CRITICAL: All collected moments and works will be archived for 30 days before permanent deletion.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowDeactivateConfirm(false);
                    showToast('Account deactivation requested. Our team will contact you.', 'info');
                  }}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-rose-600 transition-colors"
                >
                  Confirm Deactivation
                </button>
                <button 
                  onClick={() => setShowDeactivateConfirm(false)}
                  className="w-full py-4 bg-white/5 text-gray-400 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Translating Indicator */}
      <AnimatePresence>
        {isTranslating && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-black/60 backdrop-blur-xl px-6 py-2 rounded-full border border-rose-500/30 flex items-center gap-3 shadow-2xl"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
              <Sparkles size={16} className="text-rose-500" />
            </motion.div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white">{labels.profileSyncing}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeView === 'security' ? (
          <motion.div
            key="security-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full"
          >
            <button 
              onClick={() => setActiveView('profile')}
              className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
            >
              <ChevronLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
              <span className="text-sm font-bold uppercase tracking-widest">{labels.backToProfile}</span>
            </button>

            <h2 className="text-3xl font-serif italic mb-2 px-2">{labels.accountSecurityTitle}</h2>
            <p className="text-gray-400 text-sm mb-8 px-2">{labels.accountSecurityDesc}</p>

            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                {/* Password Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-500">
                      <Key size={16} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{labels.authentication}</span>
                  </div>
                  
                  <button 
                    onClick={() => showToast('Password reset link sent to: ' + user.email, 'success')}
                    className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Lock size={18} className="text-gray-500" />
                      <span className="text-sm font-medium text-white">{labels.changePassword}</span>
                    </div>
                    <Settings size={14} className="text-gray-600 group-hover:rotate-90 transition-transform" />
                  </button>

                  <button 
                    onClick={() => setIs2FAEnabled(!is2FAEnabled)}
                    className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Fingerprint size={18} className={cn("transition-colors", is2FAEnabled ? "text-rose-500" : "text-gray-500")} />
                      <span className="text-sm font-medium text-white">{labels.twoFactor}</span>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-colors",
                      is2FAEnabled ? "bg-rose-500" : "bg-gray-700"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                        is2FAEnabled ? "right-1" : "left-1"
                      )} />
                    </div>
                  </button>
                </div>

                {/* Privacy Section */}
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-500">
                      <Globe size={16} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{labels.privacyControl}</span>
                  </div>

                  <button 
                    onClick={() => setIsPrivate(!isPrivate)}
                    className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <EyeOff size={18} className={cn("transition-colors", isPrivate ? "text-cyan-500" : "text-gray-500")} />
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">{labels.privateProfile}</p>
                        <p className="text-[10px] text-gray-500">{labels.privateProfileDesc}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-colors",
                      isPrivate ? "bg-cyan-500" : "bg-gray-700"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                        isPrivate ? "right-1" : "left-1"
                      )} />
                    </div>
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="pt-6 border-t border-white/5">
                  <button 
                    onClick={() => setShowDeactivateConfirm(true)}
                    className="w-full flex items-center gap-3 p-4 bg-rose-500/5 rounded-2xl hover:bg-rose-500/10 transition-colors group"
                  >
                    <Trash2 size={18} className="text-rose-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span className="text-sm font-bold text-rose-500">{labels.deactivateAccount}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="profile-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
             <div className="flex flex-col items-center mb-10">
               <div className="relative group">
                 <div className="w-24 h-24 bg-gradient-to-tr from-rose-500 to-purple-600 rounded-full p-1">
                   <div className="w-full h-full bg-black rounded-full flex items-center justify-center overflow-hidden border-2 border-black">
                     <img 
                       src={profile?.photoURL || user?.photoURL || "https://picsum.photos/seed/user123/200/200"} 
                       alt="Profile" 
                       referrerPolicy="no-referrer"
                       className="w-full h-full object-cover"
                     />
                   </div>
                 </div>
                 <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={() => showToast('Legacy identity updated.', 'success')}
                 />
                 <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-white text-black p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                 >
                   <Camera size={14} />
                 </button>
               </div>
               <h2 className="text-2xl font-serif italic mt-4">{profile?.displayName || user?.displayName || labels.writerAnonymous}</h2>
               <p className="text-gray-500 text-xs tracking-widest uppercase font-bold mt-1">@{profile?.username || user?.email?.split('@')[0] || 'frontwice'}</p>
               
               <div className="flex gap-8 mt-6">
                  <div className="text-center">
                    <p className="font-bold text-lg">1.2K</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{labels.followingLabel}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">45K</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{labels.followersLabel}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">890</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{labels.worksLabel}</p>
                  </div>
               </div>
             </div>

             <div className="space-y-2">
               <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4 ml-1">{labels.settingsHeader}</h3>
               
               {/* Microsoft Word Style Language Selector */}
               <div className="relative mb-3">
                 <button 
                   onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                   className="w-full flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 group hover:border-rose-500/30 transition-all"
                 >
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                       <LangIcon size={20} />
                     </div>
                     <div className="text-left">
                       <p className="font-bold">{labels.langSettingLabel}</p>
                       <p className="text-xs text-gray-500">{selectedLanguage.native}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{selectedLanguage.name}</span>
                     <ChevronDown size={18} className={cn("text-gray-600 transition-transform", isLangMenuOpen && "rotate-180")} />
                   </div>
                 </button>

                 <AnimatePresence>
                   {isLangMenuOpen && (
                     <>
                       <motion.div 
                         initial={{ opacity: 0 }} 
                         animate={{ opacity: 1 }} 
                         exit={{ opacity: 0 }}
                         onClick={() => setIsLangMenuOpen(false)}
                         className="fixed inset-0 z-[150]"
                       />
                       <motion.div
                         initial={{ opacity: 0, y: 10, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: 10, scale: 0.95 }}
                         className="absolute right-0 left-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl z-[160] overflow-hidden"
                       >
                         <div className="p-4 border-b border-white/5">
                           <div className="relative">
                             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                             <input 
                               type="text"
                               placeholder="Search for a language..."
                               value={langSearch}
                               onChange={(e) => setLangSearch(e.target.value)}
                               className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                             />
                           </div>
                         </div>
                         <div className="max-h-72 overflow-y-auto no-scrollbar p-2 space-y-1">
                           {filteredLanguages.length > 0 ? (
                             filteredLanguages.map((l) => (
                               <button
                                 key={l.name}
                                 onClick={async () => {
                                   setLang(l.name);
                                   await updateLanguage(l.name);
                                   setIsLangMenuOpen(false);
                                   setLangSearch('');
                                 }}
                                 className={cn(
                                   "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group/item",
                                   lang === l.name ? "bg-rose-500 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                                 )}
                               >
                                 <div className="flex flex-col items-start px-1">
                                   <span className="text-sm font-bold">{l.name}</span>
                                   <span className="text-xs opacity-60 font-medium">{l.native}</span>
                                 </div>
                                 {lang === l.name && <Check size={18} />}
                               </button>
                             ))
                           ) : (
                             <div className="p-8 text-center text-gray-500">
                               <p className="text-sm font-bold uppercase tracking-widest">No languages found</p>
                             </div>
                           )}
                         </div>
                       </motion.div>
                     </>
                   )}
                 </AnimatePresence>
               </div>

               <button 
                 onClick={() => setActiveView('security')}
                 className="w-full flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 group hover:border-cyan-500/30 transition-all font-inherit"
               >
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                     <Shield size={20} />
                   </div>
                   <div className="text-left">
                     <p className="font-bold text-white">{labels.securityLabel}</p>
                     <p className="text-xs text-gray-500">{labels.privacyLabel}</p>
                   </div>
                 </div>
                 <Settings size={18} className="text-gray-600 transition-transform group-hover:rotate-45" />
               </button>

               {/* AI Configuration Section */}
               <div className="pt-2">
                 <div className="bg-gradient-to-br from-rose-500/5 to-cyan-500/5 border border-white/5 rounded-3xl p-6 space-y-4 shadow-lg shadow-black/20">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-rose-500">
                         <Sparkles size={20} />
                       </div>
                       <div className="text-left">
                         <p className="font-bold text-sm tracking-tight">{labels.aiConfigLabel}</p>
                         <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                           ACTION REQUIRED
                         </p>
                       </div>
                     </div>
                     <div className="p-2 bg-black/40 rounded-lg border border-white/10">
                        <Key size={14} className="text-gray-600" />
                     </div>
                   </div>
                   
                   <p className="text-[11px] text-gray-500 leading-relaxed italic">
                     {labels.aiKeyDesc}
                   </p>

                   <button 
                     onClick={() => showToast('Open AI Studio Settings (Gear Icon) -> Secrets to set GEMINI_API_KEY', 'info')}
                     className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                   >
                     <Settings size={12} />
                     {labels.aiSettingsBtn}
                   </button>
                 </div>
               </div>

               <button 
                 className="w-full flex items-center justify-between bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 group hover:bg-rose-500/10 transition-colors mt-8"
                 onClick={onLogout}
               >
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
                     <LogOut size={20} />
                   </div>
                   <p className="font-bold text-rose-500">{labels.logoutLabel}</p>
                 </div>
               </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
