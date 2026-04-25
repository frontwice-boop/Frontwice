import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, ArrowRight, UserPlus, LogIn, Eye, EyeOff, Camera, ShieldCheck, Smartphone, User, Globe, Sparkles, Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../lib/utils';

import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { translateUI, hasCache } from '../services/translationService';
import { LANGUAGES } from '../constants';

const DEFAULT_LABELS = {
  loginTab: 'LOGIN',
  signupTab: 'SIGNUP',
  googleBtn: 'Continue with Google',
  orEmail: 'Or use email',
  fullName: 'Full Name',
  username: 'Username',
  email: 'Email Address',
  password: 'Password',
  confirmPassword: 'Confirm Password',
  show: 'Show',
  hide: 'Hide',
  signInBtn: 'Sign In',
  signUpBtn: 'Sign Up',
  welcomeBack: 'Welcome back!',
  accountCreated: 'Account created successfully!',
  terms: 'By continuing, you agree to our Terms of Service and Privacy Policy.',
  slogan: 'Unleash your creativity',
  photo: 'PHOTO',
  errorEmailInUse: 'This email is already registered. Try logging in instead.',
  errorInvalidEmail: 'Please enter a valid email address.',
  errorWeakPassword: 'Password is too weak. (Min. 6 characters)',
  errorUserNotFound: 'No account found with this email.',
  errorWrongPassword: 'Incorrect password. Please try again.',
  errorGeneric: 'Authentication failed. Please try again.'
};

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const { signIn, signUpWithEmail, signInWithEmail } = useUser();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState('English');
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');

  useEffect(() => {
    const applyTranslation = async () => {
      if (lang !== 'English') {
        setIsTranslating(true);
        const translated = await translateUI(DEFAULT_LABELS, lang);
        if (translated) setLabels(translated);
        setIsTranslating(false);
      } else {
        setLabels(DEFAULT_LABELS);
      }
    };
    applyTranslation();
  }, [lang]);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin && password !== confirmPassword) {
      showToast("Passwords don't match!", "error");
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await signInWithEmail(email, password, lang);
        showToast(labels.welcomeBack, "success");
      } else {
        await signUpWithEmail(email, password, name, username, profilePic || '', lang);
        showToast(labels.accountCreated, "success");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let message = labels.errorGeneric;
      
      if (error.code === 'auth/email-already-in-use') {
        message = labels.errorEmailInUse;
      } else if (error.code === 'auth/invalid-email') {
        message = labels.errorInvalidEmail;
      } else if (error.code === 'auth/weak-password') {
        message = labels.errorWeakPassword;
      } else if (error.code === 'auth/user-not-found') {
        message = labels.errorUserNotFound;
      } else if (error.code === 'auth/wrong-password') {
        message = labels.errorWrongPassword;
      }

      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedLanguage = LANGUAGES.find(l => l.name === lang) || LANGUAGES[0];

  const filteredLanguages = LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(langSearch.toLowerCase()) || 
    l.native.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 pb-24 relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-rose-500 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500 rounded-full blur-[120px]" />
      </div>

      {/* Language Selector */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative group min-w-[140px]">
          <button 
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center justify-between w-full gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl hover:bg-white/10 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-rose-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white">{selectedLanguage.name}</span>
            </div>
            <ChevronDown size={14} className={cn("text-gray-500 transition-transform", isLangMenuOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isLangMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  onClick={() => setIsLangMenuOpen(false)}
                  className="fixed inset-0 z-0"
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-white/5">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input 
                        type="text"
                        placeholder="Language..."
                        value={langSearch}
                        onChange={(e) => setLangSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-white"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto no-scrollbar p-1.5 space-y-1">
                    {filteredLanguages.map((l) => (
                      <button
                        key={l.name}
                        onClick={() => {
                          setLang(l.name);
                          setIsLangMenuOpen(false);
                          setLangSearch('');
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all",
                          lang === l.name ? "bg-rose-500 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <div className="flex flex-col items-start px-1 text-left">
                          <span className="text-xs font-bold">{l.name}</span>
                          <span className="text-[10px] opacity-60 font-medium">{l.native}</span>
                        </div>
                        {lang === l.name && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm space-y-8 z-10"
      >
        <div className="text-center">
          <h1 className="text-4xl font-serif italic mb-2 bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent lowercase">frontwice</h1>
          <p className="text-gray-400 text-[10px] tracking-[0.2em] uppercase font-bold">{labels.slogan}</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-sm relative overflow-hidden">
          {/* AI Translating Indicator */}
          <AnimatePresence>
            {isTranslating && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-2 left-1/2 -translate-x-1/2 bg-rose-500/10 border border-rose-500/20 px-3 py-0.5 rounded-full flex items-center gap-2 z-50"
              >
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                  <Sparkles size={10} className="text-rose-500" />
                </motion.div>
                <span className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter">AI Localizing...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            key="form-step"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="flex bg-black/40 p-1 rounded-xl mb-8">
              <button 
                onClick={() => setIsLogin(true)}
                className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", isLogin ? "bg-white text-black" : "text-gray-500 hover:text-white uppercase")}
              >
                {labels.loginTab}
              </button>
              <button 
                onClick={() => setIsLogin(false)}
                className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", !isLogin ? "bg-white text-black" : "text-gray-500 hover:text-white uppercase")}
              >
                {labels.signupTab}
              </button>
            </div>

                {!isLogin && (
                  <div className="flex flex-col items-center mb-6">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 bg-white/5 border-2 border-dashed border-white/20 rounded-full flex flex-col items-center justify-center cursor-pointer hover:border-rose-500/50 transition-colors overflow-hidden relative group"
                    >
                      {profilePic ? (
                        <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera size={20} className="text-gray-500 group-hover:text-rose-500 transition-colors" />
                          <span className="text-[8px] text-gray-500 font-bold mt-1 group-hover:text-rose-500 uppercase">{labels.photo}</span>
                        </>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera size={16} />
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleProfilePicChange} 
                      className="hidden" 
                      accept="image/*"
                    />
                  </div>
                )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <button 
                type="button"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await signIn(lang);
                    showToast(labels.welcomeBack, "success");
                  } catch (error: any) {
                    console.error("Google Auth error:", error);
                    if (error.code === 'auth/popup-blocked') {
                      showToast('Popup blocked! Please allow popups for this site.', 'error');
                    } else if (error.code === 'auth/cancelled-popup-request') {
                      // Operation cancelled, no need for toast
                    } else {
                      showToast(labels.errorGeneric, "error");
                    }
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full py-4 bg-white text-black rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-gray-100 active:scale-95 transition-all shadow-xl shadow-white/5 disabled:opacity-50 group mb-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <div className="bg-white p-1 rounded-lg">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <span className="text-xs uppercase tracking-widest">{labels.googleBtn}</span>
                    <ArrowRight className="text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" size={16} />
                  </>
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold">
                  <span className="bg-[#121212] px-4 text-gray-500">{labels.orEmail}</span>
                </div>
              </div>

              {!isLogin && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">{labels.fullName}</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                          <input 
                            type="text" 
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">{labels.username}</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">@</div>
                          <input 
                            type="text" 
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                            placeholder="username"
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">{labels.email}</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] text-gray-500 font-bold uppercase">{labels.password}</label>
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] text-gray-500 hover:text-white transition-colors uppercase font-bold"
                      >
                        {showPassword ? <EyeOff size={12} className="inline mr-1" /> : <Eye size={12} className="inline mr-1" />}
                        {showPassword ? labels.hide : labels.show}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                      />
                    </div>
                  </div>

                  {!isLogin && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">{labels.confirmPassword}</label>
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-[10px] text-gray-500 hover:text-white transition-colors uppercase font-bold"
                        >
                          {showConfirmPassword ? <EyeOff size={12} className="inline mr-1" /> : <Eye size={12} className="inline mr-1" />}
                          {showConfirmPassword ? labels.hide : labels.show}
                        </button>
                      </div>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                        />
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 mt-6 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm",
                      isLogin 
                        ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/20" 
                        : "bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-600/20"
                    )}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                        {isLogin ? labels.signInBtn : labels.signUpBtn}
                      </>
                    )}
                  </button>

            </form>

          </motion.div>
        </div>

        <div className="text-center text-[10px] text-gray-500 uppercase tracking-widest font-bold px-8">
           {labels.terms}
        </div>
      </motion.div>
    </div>
  );
}
