import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, LogOut, Globe, Shield, Camera, Languages as LangIcon, ChevronLeft, Key, Lock, Fingerprint, EyeOff, Trash2, Check, ChevronDown, Search, Sparkles, Zap, ExternalLink, Cpu, Database, ChevronRight, UserPlus, UserMinus, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, increment, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { LANGUAGES } from '../constants';
import { cn } from '../lib/utils';
import { translateUI, hasCache } from '../services/translationService';

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
  profileSyncing: 'Updating profile...',
  emptyFollowing: 'Empty archive connection.',
  emptyFollowers: 'No incoming broadcasts yet.',
  identitySecure: 'Secured',
  returnBtn: 'Return',
  followBtn: 'Follow',
  followingActive: 'Following',
  closeArchive: 'Close Archive',
  uploadingMsg: 'Updating photo...',
  uploadSuccessMsg: 'Photo updated.',
  deactivateConfirmTitle: 'Deactivate?',
  deactivateConfirmDesc: 'Your account and data will be archived for 30 days before permanent deletion.',
  confirmDeactivationBtn: 'Confirm Deactivation',
  cancelBtn: 'Cancel',
  userNotFound: 'User not found',
  dbError: 'Unable to connect. Please try again later.'
};

import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import { ProfileSkeleton } from '../components/ui/Skeleton';

export default function Profile({ 
  onLogout, 
  lang, 
  setLang 
}: { 
  onLogout: () => void; 
  lang: string; 
  setLang: (l: string) => void; 
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile, loading: userLoading, updateLanguage } = useUser();
  const { showToast } = useToast();
  
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeView, setActiveView] = useState<'profile' | 'security'>('profile');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [followedAuthors, setFollowedAuthors] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowActionLoading, setIsFollowActionLoading] = useState(false);
  const [followingSearch, setFollowingSearch] = useState('');
  const [followersSearch, setFollowersSearch] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isOwnProfile = !id || id === user?.uid;

  // Sync profile data
  useEffect(() => {
    if (isOwnProfile) {
      setProfile(currentUserProfile);
      setProfileLoading(userLoading);
    } else if (id) {
      setProfileLoading(true);
      const userRef = doc(db, 'users', id);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          showToast(labels.userNotFound, 'error');
          navigate('/profile');
        }
        setProfileLoading(false);
      });
      return () => unsubscribe();
    }
  }, [id, isOwnProfile, currentUserProfile, userLoading, navigate, showToast]);

  // Sync following status
  useEffect(() => {
    if (!user || isOwnProfile || !id) {
      setIsFollowing(false);
      return;
    }
    const followRef = doc(db, `users/${user.uid}/following`, id);
    const unsubscribe = onSnapshot(followRef, (docSnap) => {
      setIsFollowing(docSnap.exists());
    });
    return () => unsubscribe();
  }, [user, id, isOwnProfile]);

  // Fetch following list
  useEffect(() => {
    const targetId = id || user?.uid;
    if (!targetId) return;
    const q = query(collection(db, `users/${targetId}/following`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const authors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFollowedAuthors(authors);
    });
    return () => unsubscribe();
  }, [user, id]);

  // Fetch followers list
  useEffect(() => {
    const targetId = id || user?.uid;
    if (!targetId) return;
    const q = query(collection(db, `users/${targetId}/followers`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const followerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFollowers(followerList);
    });
    return () => unsubscribe();
  }, [user, id]);

  const handleFollow = async () => {
    if (!user || !id || isOwnProfile) return;
    setIsFollowActionLoading(true);
    
    const authorId = id;
    const authorName = profile?.displayName || 'Legacy Builder';
    
    const followRef = doc(db, `users/${user.uid}/following`, authorId);
    const followerRef = doc(db, `users/${authorId}/followers`, user.uid);
    const userRef = doc(db, 'users', user.uid);
    const authorRef = doc(db, 'users', authorId);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        await deleteDoc(followerRef);
        await updateDoc(userRef, { followingCount: increment(-1) });
        await updateDoc(authorRef, { followersCount: increment(-1) });
        showToast(`Unfollowed @${authorName}`, 'info');
      } else {
        const followData = {
          followerId: user.uid,
          followedId: authorId,
          createdAt: serverTimestamp(),
          followerName: currentUserProfile?.displayName || user.displayName || 'Legacy Friend',
          followedName: authorName
        };
        await setDoc(followRef, followData);
        await setDoc(followerRef, followData);
        await updateDoc(userRef, { followingCount: increment(1) });
        await updateDoc(authorRef, { followersCount: increment(1) });
        showToast(`Following @${authorName}`, 'success');
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'unavailable' || error.code === 'network-request-failed') {
        showToast(labels.dbError, 'error');
      } else {
        showToast('Action failed. Check your connection.', 'error');
      }
    } finally {
      setIsFollowActionLoading(false);
    }
  };

  useEffect(() => {
    console.log('Profile component loaded');
    console.log('User:', user?.uid);
    console.log('Profile:', profile);
    console.log('Loading:', profileLoading);
  }, [user?.uid, profile, profileLoading]);

  useEffect(() => {
    const applyTranslation = async () => {
      // Reset immediately to English
      if (lang === 'English' || !TRANSLATION_LANGUAGES.includes(lang)) {
        setLabels(DEFAULT_LABELS);
        return;
      }

      setIsTranslating(true);
      try {
        const translated = await translateUI(DEFAULT_LABELS, lang);
        if (translated) {
          setLabels(translated);
        }
      } catch (err) {
        console.error("Translation error in Profile:", err);
        setLabels(DEFAULT_LABELS);
      } finally {
        setIsTranslating(false);
      }
    };
    applyTranslation();
  }, [lang]);

  const selectedLanguage = LANGUAGES.find(l => l.name === lang) || LANGUAGES[0];

  const filteredLanguages = LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(langSearch.toLowerCase()) || 
    l.native.toLowerCase().includes(langSearch.toLowerCase())
  );
  
  if (profileLoading) return <ProfileSkeleton />;

  return (
    <div className="p-4 pt-10 pb-24 min-h-screen relative">
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
                <h3 className="text-xl font-bold uppercase tracking-widest text-white">{labels.deactivateConfirmTitle}</h3>
                <p className="text-xs text-gray-500 leading-relaxed italic">
                  {labels.deactivateConfirmDesc}
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
                  {labels.confirmDeactivationBtn}
                </button>
                <button 
                  onClick={() => setShowDeactivateConfirm(false)}
                  className="w-full py-4 bg-white/5 text-gray-400 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-colors"
                >
                  {labels.cancelBtn}
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
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
              <Sparkles size={16} className="text-rose-500" />
            </motion.div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white">{labels.identitySecure}</span>
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
               {!isOwnProfile && (
                 <button 
                  onClick={() => navigate(-1)}
                  className="self-start mb-4 flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
                 >
                   <ChevronLeft size={20} />
                   <span className="text-xs font-bold uppercase tracking-widest">{labels.returnBtn}</span>
                 </button>
               )}
               <div className="relative group">
                 <div className="w-24 h-24 bg-gradient-to-tr from-rose-500 to-purple-600 rounded-full p-1 shadow-2xl">
                   <div className="w-full h-full bg-black rounded-full flex items-center justify-center overflow-hidden border-2 border-black">
                     <img 
                       src={profile?.photoURL || (isOwnProfile ? user?.photoURL : null) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'user'}`} 
                       alt="Profile" 
                       referrerPolicy="no-referrer"
                       className="w-full h-full object-cover"
                     />
                   </div>
                 </div>
                 {isOwnProfile && (
                   <>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            showToast('Updating photo...', 'info');
                            const { importProfilePicture } = await import('../services/storageService');
                            const url = await importProfilePicture(file);
                            // Set url in firestore
                            await setDoc(doc(db, 'users', user!.uid), { photoURL: url }, { merge: true });
                            showToast('Photo updated.', 'success');
                          } catch (err: any) {
                            showToast('Update failed.', 'error');
                          }
                        }
                      }}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-white text-black p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                    >
                      <Camera size={14} />
                    </button>
                   </>
                 )}
               </div>
               <h2 className="text-2xl font-serif italic mt-4">{profile?.displayName || labels.writerAnonymous}</h2>
               <p className="text-gray-500 text-xs tracking-widest uppercase font-bold mt-1">@{profile?.username || 'legacy_user'}</p>
               
               {!isOwnProfile && user && (
                 <button 
                  onClick={handleFollow}
                  disabled={isFollowActionLoading}
                  className={cn(
                    "mt-6 px-10 py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                    isFollowing 
                      ? "bg-white/10 text-white border border-white/20 hover:bg-white/20" 
                      : "bg-rose-500 text-white shadow-xl shadow-rose-500/20 hover:scale-105 active:scale-95"
                  )}
                 >
                   {isFollowActionLoading ? (
                     <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                       <Zap size={14} />
                     </motion.div>
                   ) : isFollowing ? (
                     <>
                       <UserCheck size={14} />
                       {labels.followingActive}
                     </>
                   ) : (
                     <>
                       <UserPlus size={14} />
                       {labels.followBtn}
                     </>
                   )}
                 </button>
               )}

               <div className="flex gap-8 mt-8 bg-white/5 px-6 py-4 rounded-[2.5rem] border border-white/10 shadow-inner w-full max-w-sm">
                  <button onClick={() => setIsFollowingModalOpen(true)} className="text-center group active:scale-95 transition-transform flex-1 flex flex-col items-center">
                    <p className="font-bold text-lg group-hover:text-rose-500 transition-colors">{profile?.followingCount || 0}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black font-sans">{labels.followingLabel}</p>
                    {followedAuthors.length > 0 && (
                      <div className="flex -space-x-1.5 overflow-hidden mt-1.5">
                        {followedAuthors.slice(0, 4).map((author) => (
                          <img
                            key={author.id}
                            className="inline-block h-5 w-5 rounded-full ring-2 ring-zinc-950 object-cover"
                            src={author.followedPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.followedName || 'user'}`}
                            alt={author.followedName}
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    )}
                  </button>
                  
                  <button onClick={() => setIsFollowersModalOpen(true)} className="text-center group active:scale-95 transition-transform flex-1 flex flex-col items-center border-x border-white/5 px-4">
                    <p className="font-bold text-lg group-hover:text-rose-500 transition-colors">{profile?.followersCount || 0}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black font-sans">{labels.followersLabel}</p>
                    {followers.length > 0 && (
                      <div className="flex -space-x-1.5 overflow-hidden mt-1.5">
                        {followers.slice(0, 4).map((follower) => (
                          <img
                            key={follower.id}
                            className="inline-block h-5 w-5 rounded-full ring-2 ring-zinc-950 object-cover"
                            src={follower.followerPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${follower.followerName || 'user'}`}
                            alt={follower.followerName}
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    )}
                  </button>
                  
                  <div className="text-center flex-1 flex flex-col items-center justify-center">
                    <p className="font-bold text-lg text-rose-500">{profile?.worksCount || 0}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black font-sans">{labels.worksLabel}</p>
                    <div className="flex items-center gap-0.5 mt-1.5 text-[8px] font-bold tracking-tight text-white/50 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full uppercase">
                      📖 CORE
                    </div>
                  </div>
               </div>
             </div>

             {/* Following List Modal */}
             <AnimatePresence>
                {isFollowingModalOpen && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsFollowingModalOpen(false)}
                    className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-sm shadow-2xl flex flex-col max-h-[70vh]"
                    >
                      <div className="p-8 pb-4 text-center">
                        <h3 className="text-xl font-bold uppercase tracking-[0.2em] text-white">{labels.followingLabel}</h3>
                      </div>

                      {/* Search Input bar */}
                      <div className="px-6 pb-4">
                        <div className="relative">
                          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input 
                            type="text"
                            placeholder="Search following..."
                            value={followingSearch}
                            onChange={(e) => setFollowingSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
                          />
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 space-y-3">
                         {followedAuthors.filter(a => (a.followedName || '').toLowerCase().includes(followingSearch.toLowerCase())).length === 0 ? (
                            <div className="text-center py-10 opacity-30 italic flex flex-col items-center gap-2">
                               <Database size={24} />
                               <p className="text-sm">No connections found.</p>
                            </div>
                         ) : (
                            followedAuthors.filter(a => (a.followedName || '').toLowerCase().includes(followingSearch.toLowerCase())).map(author => (
                              <button 
                                key={author.id} 
                                onClick={() => {
                                  setIsFollowingModalOpen(false);
                                  setFollowingSearch('');
                                  navigate(`/profile/${author.followedId || author.id}`);
                                }}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0 group-hover:scale-110 transition-transform bg-zinc-800 animate-fade-in">
                                    <img 
                                      src={author.followedPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.followedName || 'user'}`} 
                                      alt="Avatar" 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  <span className="text-sm font-bold text-gray-200">@{author.followedName || 'Legacy Author'}</span>
                                </div>
                                <ChevronRight size={14} className="text-gray-600 group-hover:translate-x-1 transition-transform" />
                              </button>
                            ))
                         )}
                      </div>
                      <div className="p-6 pt-0 border-t border-white/5 bg-zinc-900">
                        <button 
                          onClick={() => { setIsFollowingModalOpen(false); setFollowingSearch(''); }}
                          className="w-full py-4 bg-white/5 text-gray-400 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-colors"
                        >
                          {labels.closeArchive}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
             </AnimatePresence>

             {/* Followers List Modal */}
             <AnimatePresence>
                {isFollowersModalOpen && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsFollowersModalOpen(false)}
                    className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-sm shadow-2xl flex flex-col max-h-[70vh]"
                    >
                      <div className="p-8 pb-4 text-center">
                        <h3 className="text-xl font-bold uppercase tracking-[0.2em] text-white">{labels.followersLabel}</h3>
                      </div>

                      {/* Search Input bar */}
                      <div className="px-6 pb-4">
                        <div className="relative">
                          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input 
                            type="text"
                            placeholder="Search followers..."
                            value={followersSearch}
                            onChange={(e) => setFollowersSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
                          />
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 space-y-3">
                         {followers.filter(f => (f.followerName || '').toLowerCase().includes(followersSearch.toLowerCase())).length === 0 ? (
                            <div className="text-center py-10 opacity-30 italic flex flex-col items-center gap-2">
                               <Database size={24} />
                               <p className="text-sm">No connections found.</p>
                            </div>
                         ) : (
                            followers.filter(f => (f.followerName || '').toLowerCase().includes(followersSearch.toLowerCase())).map(follower => (
                              <button 
                                key={follower.id} 
                                onClick={() => {
                                  setIsFollowersModalOpen(false);
                                  setFollowersSearch('');
                                  navigate(`/profile/${follower.followerId || follower.id}`);
                                }}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0 group-hover:scale-110 transition-transform bg-zinc-800 animate-fade-in">
                                    <img 
                                      src={follower.followerPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${follower.followerName || 'user'}`} 
                                      alt="Avatar" 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  <span className="text-sm font-bold text-gray-200">@{follower.followerName || 'Legacy Friend'}</span>
                                </div>
                                <ChevronRight size={14} className="text-gray-600 group-hover:translate-x-1 transition-transform" />
                              </button>
                            ))
                         )}
                      </div>
                      <div className="p-6 pt-0 border-t border-white/5 bg-zinc-900">
                        <button 
                          onClick={() => { setIsFollowersModalOpen(false); setFollowersSearch(''); }}
                          className="w-full py-4 bg-white/5 text-gray-400 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-colors"
                        >
                          {labels.closeArchive}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
             </AnimatePresence>

             <div className="space-y-2">
               {isOwnProfile && (
                 <>
                   <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4 ml-1">{labels.settingsHeader}</h3>
                    
                   {/* Microsoft Word Style Language Selector */}
                   <div className="relative mb-3">
                     <button 
                       onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                       className="w-full flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 group hover:border-rose-500/30 transition-all font-inherit"
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
                 </>
               )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
