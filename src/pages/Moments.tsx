import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, MapPin, User as UserIcon, Play, Image as ImageIcon, Video, PlusCircle, Upload, Sparkles, Heart, MessageCircle, Share2, CornerDownRight as Reply, Send, X as Close, ThumbsUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { translateMoments, translateUI, hasCache } from '../services/translationService';
import { LANGUAGES } from '../constants';

interface Comment {
  id: string;
  user: string;
  text: string;
  time: string;
  replies?: Comment[];
}

const REACTIONS = [
  { type: 'like', icon: '👍', label: 'Like', color: 'text-blue-500' },
  { type: 'love', icon: '❤️', label: 'Love', color: 'text-red-500' },
  { type: 'care', icon: '🥰', label: 'Care', color: 'text-yellow-500' },
  { type: 'haha', icon: '😆', label: 'Haha', color: 'text-yellow-500' },
  { type: 'wow', icon: '😮', label: 'Wow', color: 'text-yellow-500' },
  { type: 'sad', icon: '😢', label: 'Sad', color: 'text-yellow-500' },
  { type: 'anger', icon: '😡', label: 'Angry', color: 'text-orange-600' },
];

const TRANSLATION_LANGUAGES = LANGUAGES.map(l => l.name);

const DEFAULT_UI = {
  title: 'Moments Gallery',
  tagline: 'AI-Generated Visual Legacies',
  localizingLabel: 'AI Localizing Archive...',
  videoTab: 'AI Videos',
  pictureTab: 'AI Pictures',
  publishBtn: 'Publish to Gallery',
  placeholderTitle: 'Title of this moment...',
  yearLabel: 'YEAR',
  conventionLabel: 'CONVENTION',
  chooseLabel: 'Choose',
  publisherLabel: 'PUBLISHER',
  searchVideos: 'Search videos...',
  searchPictures: 'Search pictures...',
  endOfArchive: 'End of archive',
  noItemsFound: 'No found in this archive.',
  dbError: 'Connection interrupted. Please check your network or retry.'
};

import { useToast } from '../context/ToastContext';

import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, deleteDoc, getDocs, updateDoc, increment, getDoc, where } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { generateMomentCaption, analyzeMomentSentiment } from '../services/geminiService';

export default function Moments({ lang }: { lang: string }) {
  const { showToast } = useToast();
  const { user, profile } = useUser();
  const [activeTab, setActiveTab] = useState<'video' | 'photo'>('video');
  const [searchYear, setSearchYear] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [momentSentiment, setMomentSentiment] = useState<{ mood: string, explanation: string } | null>(null);
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [moments, setMoments] = useState<any[]>([]);
  const [translatedMoments, setTranslatedMoments] = useState<any[]>([]);
  const [ui, setUi] = useState(DEFAULT_UI);

  // Upload State
  const [newMomentTitle, setNewMomentTitle] = useState('');
  const [newMomentYear, setNewMomentYear] = useState('');
  const [newMomentLocation, setNewMomentLocation] = useState('');
  const [newMomentFile, setNewMomentFile] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Interaction State
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [userCommentLikes, setUserCommentLikes] = useState<Set<string>>(new Set());
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, user: string } | null>(null);

  // Real-time moments listener - now synced with master posts feed
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'posts'), 
      where('genre', '==', 'Moment'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const momentsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          // Extract specific moment metadata if stored in fullWork or desc
          year: data.year || new Date(data.createdAt?.toDate?.() || Date.now()).getFullYear().toString(),
          location: data.location || 'Unknown'
        };
      });
      setMoments(momentsData);
    }, (error) => {
      if (error instanceof Error && error.message.includes('requires an index')) {
        // Fallback for missing composite index
        const fallbackQ = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        onSnapshot(fallbackQ, (s) => {
          setMoments(s.docs.filter(d => d.data().genre === 'Moment').map(d => ({ id: d.id, ...d.data() })));
        });
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'posts (Moments)');
    });
    return () => unsubscribe();
  }, [user]);

  // Real-time reactions listener for the current user
  useEffect(() => {
    if (!user) return;
    const unsubscribeFns = moments.map(moment => {
      const path = `posts/${moment.id}/Reaction/${user.uid}`;
      return onSnapshot(doc(db, path), (doc) => {
        if (doc.exists()) {
          setUserReactions(prev => ({ ...prev, [moment.id]: doc.data().type }));
        } else {
          setUserReactions(prev => {
            const next = { ...prev };
            delete next[moment.id];
            return next;
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
    });
    return () => unsubscribeFns.forEach(fn => fn());
  }, [user, moments.length]);

  // Real-time comments listener for the selected moment
  useEffect(() => {
    if (!selectedMomentId) return;
    const path = `posts/${selectedMomentId}/comments`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Nest replies
      const topLevel = commentsData.filter(c => !c.parentCommentId);
      const withReplies = topLevel.map(c => ({
        ...c,
        replies: commentsData.filter(r => r.parentCommentId === c.id)
      }));
      
      setComments(prev => ({ ...prev, [selectedMomentId]: withReplies }));
    });
    return () => unsubscribe();
  }, [selectedMomentId]);

  // UI Translation
  useEffect(() => {
    const applyUiTranslation = async () => {
      if (lang !== 'English' && TRANSLATION_LANGUAGES.includes(lang)) {
        const translatedUI = await translateUI(DEFAULT_UI, lang);
        if (translatedUI) setUi(translatedUI);
      } else {
        setUi(DEFAULT_UI);
      }
    };
    applyUiTranslation();
  }, [lang]);

  // Gallery Translation
  useEffect(() => {
    const applyGalleryTranslation = async () => {
      if (moments.length === 0) {
        setTranslatedMoments([]);
        return;
      }

      if (lang !== 'English' && TRANSLATION_LANGUAGES.includes(lang)) {
        setIsTranslating(true);
        setTranslatedMoments([]); // Reset to avoid language flash
        const translated = await translateMoments(moments, lang);
        setTranslatedMoments(translated);
        setIsTranslating(false);
      } else {
        setTranslatedMoments(moments);
      }
    };
    applyGalleryTranslation();
  }, [lang, moments]);

  const filteredMoments = translatedMoments.filter(m => {
    const matchesTab = m.type === activeTab;
    const matchesYear = m.year.toLowerCase().includes(searchYear.toLowerCase());
    const matchesLocation = m.location.toLowerCase().includes(searchLocation.toLowerCase());
    const matchesUser = (m.authorName || m.user || '').toLowerCase().includes(searchUser.toLowerCase());
    return matchesTab && matchesYear && matchesLocation && matchesUser;
  });

  const handleGenerateCaption = async () => {
    if (!newMomentLocation || !newMomentYear) {
      showToast('Please enter location and year for better context', 'warning');
      return;
    }
    setIsGeneratingCaption(true);
    setMomentSentiment(null);
    try {
      const caption = await generateMomentCaption(newMomentLocation, newMomentYear);
      setNewMomentTitle(caption);
      
      // Auto-analyze sentiment
      handleAnalyzeSentiment(caption);
    } catch (error) {
      showToast('Caption engine is busy. Please enter a title manually.', 'error');
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleAnalyzeSentiment = async (caption: string) => {
    setIsAnalyzingSentiment(true);
    try {
      const sentiment = await analyzeMomentSentiment(caption);
      setMomentSentiment(sentiment);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzingSentiment(false);
    }
  };

  // Real-time comment likes listener for the current user
  useEffect(() => {
    if (!user || !selectedMomentId) {
      setUserCommentLikes(new Set());
      return;
    }
    
    // We only need to listen to likes for comments of the selected moment
    const path = `posts/${selectedMomentId}/comments`;
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
        snapshot.docs.forEach(commentDoc => {
            const likesPath = `posts/${selectedMomentId}/comments/${commentDoc.id}/likes/${user.uid}`;
            onSnapshot(doc(db, likesPath), (likeDoc) => {
                if (likeDoc.exists()) {
                    setUserCommentLikes(prev => new Set([...prev, commentDoc.id]));
                } else {
                    setUserCommentLikes(prev => {
                        const next = new Set(prev);
                        next.delete(commentDoc.id);
                        return next;
                    });
                }
            });
        });
    });
    return () => unsubscribe();
  }, [user, selectedMomentId]);

  const handleReaction = async (momentId: string, type: string) => {
    if (!user) return;
    const reactionDoc = doc(db, `posts/${momentId}/Reaction/${user.uid}`);
    const momentRef = doc(db, 'posts', momentId);
    
    const oldType = userReactions[momentId];

    try {
      if (oldType === type) {
        // Remove reaction
        await deleteDoc(reactionDoc);
        await updateDoc(momentRef, { 
          likesCount: increment(-1),
          [`reactionCounts.${type}`]: increment(-1)
        });
      } else if (oldType) {
        // Change reaction
        await setDoc(reactionDoc, {
          userId: user.uid,
          type,
          createdAt: serverTimestamp()
        });
        await updateDoc(momentRef, {
          [`reactionCounts.${oldType}`]: increment(-1),
          [`reactionCounts.${type}`]: increment(1)
        });
      } else {
        // New reaction
        await setDoc(reactionDoc, {
          userId: user.uid,
          type,
          createdAt: serverTimestamp()
        });
        await updateDoc(momentRef, { 
          likesCount: increment(1),
          [`reactionCounts.${type}`]: increment(1)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${momentId}/Reaction/${user.uid}`);
    }
    setActiveReactionMenu(null);
  };

  const handleAddComment = async (momentId: string) => {
    if (!newComment.trim() || !user) return;

    const commentData: any = {
      authorId: user.uid,
      authorName: profile?.displayName || 'Legacy Explorer',
      text: newComment,
      createdAt: serverTimestamp(),
      parentCommentId: replyTo?.id || null,
      replyToUser: replyTo?.user || null
    };

    const path = `posts/${momentId}/comments`;
    try {
      await addDoc(collection(db, path), commentData);

      // Update comments count on master posts collection
      const momentRef = doc(db, 'posts', momentId);
      await updateDoc(momentRef, {
        commentsCount: increment(1)
      });

      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      showToast('Check connection to archive.', 'error');
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user || !selectedMomentId) return;
    const likeRef = doc(db, `posts/${selectedMomentId}/comments/${commentId}/likes/${user.uid}`);
    const commentRef = doc(db, `posts/${selectedMomentId}/comments`, commentId);

    const isLiked = userCommentLikes.has(commentId);
    
    try {
      if (isLiked) {
         await deleteDoc(likeRef);
         await updateDoc(commentRef, { likesCount: increment(-1) });
         showToast('Signal boost removed.', 'info');
      } else {
         await setDoc(likeRef, { createdAt: serverTimestamp() });
         await updateDoc(commentRef, { likesCount: increment(1) });
         showToast('Archive transmission liked!', 'success');
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `posts/${selectedMomentId}/comments/${commentId}/likes`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewMomentFile(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
    if (!newMomentTitle || !newMomentYear || !newMomentFile || !user) {
      showToast('Please fill in title, year and provide a file.', 'error');
      return;
    }

    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: profile?.displayName || 'Legacy Builder',
        desc: newMomentTitle,
        fullWork: `Moment captured in ${newMomentLocation || 'Unknown'} (${newMomentYear})`,
        year: newMomentYear,
        location: newMomentLocation || 'Unknown',
        genre: 'Moment',
        type: activeTab,
        coverImage: newMomentFile,
        images: [newMomentFile], // Wrap for consistency with gallery schema
        likesCount: 0,
        commentsCount: 0,
        music: 'AI Original Audio',
        color: 'from-rose-600 to-purple-600',
        createdAt: serverTimestamp()
      });

      // Increment works count in profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { worksCount: increment(1) });

      showToast('Moment published successfully!', 'success');
      
      // Reset state
      setNewMomentTitle('');
      setNewMomentYear('');
      setNewMomentLocation('');
      setNewMomentFile(null);
      setIsPublishing(false);
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'posts');
       showToast('An error occurred during transmission.', 'error');
    }
  };

  return (
    <div className="h-full bg-black text-gray-200 pb-24 p-6 relative overflow-y-auto no-scrollbar" onMouseLeave={() => setActiveReactionMenu(null)}>
      {/* AI Translating Indicator */}
      <AnimatePresence>
        {isTranslating && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-xl px-6 py-2 rounded-full border border-rose-500/30 flex items-center gap-3 shadow-2xl"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
              <Sparkles size={16} className="text-rose-500" />
            </motion.div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white">Archive Synchronized</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col gap-2 px-2 pt-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="text-rose-500" size={24} />
            <h3 className="text-2xl font-serif italic text-white">{ui.title}</h3>
          </div>
          <button 
            onClick={() => setIsPublishing(!isPublishing)}
            className="p-2 bg-rose-500 rounded-full text-white shadow-lg hover:rotate-90 transition-transform"
          >
            <PlusCircle size={24} />
          </button>
        </div>
        <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">{ui.tagline}</p>
      </div>

      {/* Publish New Moment Section */}
      <AnimatePresence>
        {isPublishing && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 space-y-6">
              <div className="flex gap-4 p-1 bg-black/40 rounded-2xl w-fit">
                <button 
                  onClick={() => setActiveTab('video')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all",
                    activeTab === 'video' ? "bg-rose-500 text-white" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Video size={14} /> VIDEO
                </button>
                <button 
                  onClick={() => setActiveTab('photo')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all",
                    activeTab === 'photo' ? "bg-rose-500 text-white" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <ImageIcon size={14} /> PICTURE
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="text" 
                    value={newMomentTitle}
                    onChange={(e) => setNewMomentTitle(e.target.value)}
                    placeholder={ui.placeholderTitle} 
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-6 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/30 font-serif italic"
                  />
                  <button 
                    onClick={handleGenerateCaption}
                    disabled={isGeneratingCaption}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 hover:text-rose-400 transition-all disabled:opacity-50"
                    title="Generate AI Caption"
                  >
                    {isGeneratingCaption ? (
                       <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
                        <Sparkles size={18} />
                      </motion.div>
                    ) : (
                      <Sparkles size={18} />
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {momentSentiment && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4 flex gap-4 items-start"
                    >
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                        <Sparkles size={16} className="text-rose-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">{momentSentiment.mood} VIBE</p>
                        <p className="text-xs text-gray-400 italic">"{momentSentiment.explanation}"</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500/50" size={14} />
                    <input 
                      type="text" 
                      value={newMomentYear}
                      onChange={(e) => setNewMomentYear(e.target.value)}
                      placeholder={ui.yearLabel} 
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold" 
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500/50" size={14} />
                    <input 
                      type="text" 
                      value={newMomentLocation}
                      onChange={(e) => setNewMomentLocation(e.target.value)}
                      placeholder={ui.conventionLabel} 
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold" 
                    />
                  </div>
                </div>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "h-48 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 group transition-all cursor-pointer relative overflow-hidden",
                    newMomentFile ? "border-rose-500/50" : "border-white/10 hover:border-rose-500/30 text-gray-500"
                  )}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden" 
                    accept={activeTab === 'video' ? "video/*" : "image/*"} 
                  />
                  
                  {newMomentFile ? (
                    activeTab === 'video' ? (
                      <div className="flex flex-col items-center gap-2">
                        <Video size={40} className="text-rose-500" />
                        <span className="text-[10px] font-bold text-rose-500">VIDEO READY</span>
                      </div>
                    ) : (
                      <img src={newMomentFile} alt="Preview" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <>
                      <Upload size={24} className="group-hover:text-rose-500" />
                      <span className="text-[10px] uppercase tracking-widest">{ui.chooseLabel} {activeTab === 'video' ? 'AI Video' : 'AI Picture'}</span>
                    </>
                  )}
                </div>

                <button 
                  onClick={handlePublish}
                  className="w-full py-4 bg-gradient-to-r from-rose-600 to-purple-600 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform active:scale-95"
                >
                  {ui.publishBtn}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {/* Toggle Sections */}
        <div className="flex gap-8 border-b border-white/10 px-4">
          <button 
            onClick={() => setActiveTab('video')}
            className={cn(
              "pb-4 text-xs font-bold tracking-[0.2em] uppercase transition-all relative",
              activeTab === 'video' ? "text-white" : "text-gray-600"
            )}
          >
            {ui.videoTab}
            {activeTab === 'video' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />}
          </button>
          <button 
            onClick={() => setActiveTab('photo')}
            className={cn(
              "pb-4 text-xs font-bold tracking-[0.2em] uppercase transition-all relative",
              activeTab === 'photo' ? "text-white" : "text-gray-600"
            )}
          >
            {ui.pictureTab}
            {activeTab === 'photo' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />}
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-2xl backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
            <input 
              type="text"
              placeholder={activeTab === 'video' ? ui.searchVideos : ui.searchPictures}
              className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/30 transition-all placeholder:text-gray-700"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500/40 group-focus-within:text-rose-500 transition-colors" size={14} />
              <input 
                type="text"
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value)}
                placeholder={ui.yearLabel}
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-10 pr-2 text-[10px] focus:outline-none focus:border-rose-500/30 font-bold uppercase tracking-widest transition-all"
              />
            </div>
            <div className="relative group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500/40 group-focus-within:text-rose-500 transition-colors" size={14} />
              <input 
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder={ui.conventionLabel}
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-10 pr-2 text-[10px] focus:outline-none focus:border-rose-500/30 font-bold uppercase tracking-widest transition-all"
              />
            </div>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500/40 group-focus-within:text-rose-500 transition-colors" size={14} />
              <input 
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder={ui.publisherLabel}
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-10 pr-2 text-[10px] focus:outline-none focus:border-rose-500/30 font-bold uppercase tracking-widest transition-all"
              />
            </div>
          </div>
        </div>

        {/* Moments Feed Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredMoments.map((moment, i) => (
            <motion.div 
              key={moment.id || i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -5 }}
              className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden group cursor-pointer shadow-lg relative aspect-[3/4]"
            >
              <img src={moment.coverImage || moment.images?.[0] || moment.mediaURL || (moment as any).image} alt={moment.title || moment.desc} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
              
              {/* Media Type Indicator */}
              <div className="absolute top-4 right-4">
                {moment.type === 'video' ? (
                  <div className="p-2 bg-rose-500 rounded-full shadow-xl">
                    <Play size={12} fill="white" />
                  </div>
                ) : (
                  <div className="p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white flex items-center justify-center">
                    <ImageIcon size={12} className="text-white" />
                    {moment.images?.length > 1 && <span className="text-[8px] font-bold ml-1">+{moment.images.length - 1}</span>}
                  </div>
                )}
              </div>

              {/* Moment Info */}
              <div className="absolute bottom-4 left-4 right-4 space-y-2">
                <h4 className="font-serif italic text-white text-base leading-tight line-clamp-2">{moment.title || moment.desc}</h4>
                <div className="flex flex-wrap items-center gap-2 text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1"><MapPin size={8} /> {moment.location}</span>
                  <span className="text-rose-500/50">•</span>
                  <span>{moment.year}</span>
                </div>
                
                {/* Visual Interactions on Card */}
                <div className="pt-2 flex items-center justify-between border-t border-white/10">
                   <div className="flex items-center gap-3">
                      <div className="relative">
                        <AnimatePresence>
                          {activeReactionMenu === moment.id && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.5, originY: 1 }}
                              animate={{ opacity: 1, y: -45, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.5 }}
                              className="absolute bottom-full left-0 bg-zinc-900 border border-white/10 rounded-full p-1.5 flex gap-1 z-50 shadow-[0_10px_30px_-10px_rgba(0,0,0,1)] backdrop-blur-xl"
                            >
                              {REACTIONS.map((reac, idx) => (
                                <motion.button
                                  key={reac.type}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  whileHover={{ scale: 1.4, y: -5 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => { e.stopPropagation(); handleReaction(moment.id, reac.type); }}
                                  className="w-8 h-8 flex items-center justify-center text-xl hover:bg-white/5 rounded-full transition-all relative group/emoji"
                                >
                                  <span className="drop-shadow-sm">{reac.icon}</span>
                                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded-full opacity-0 group-hover/emoji:opacity-100 transition-all duration-200 pointer-events-none border border-white/10 shadow-xl whitespace-nowrap font-bold">
                                    {reac.label}
                                  </span>
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveReactionMenu(activeReactionMenu === moment.id ? null : moment.id); }}
                          onMouseEnter={() => { if (!activeReactionMenu) setActiveReactionMenu(moment.id); }}
                          className="flex items-center gap-1 group relative"
                        >
                          {userReactions[moment.id] ? (
                            <div className="flex items-center gap-1">
                              <motion.span 
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="text-sm"
                              >
                                {REACTIONS.find(r => r.type === userReactions[moment.id])?.icon}
                              </motion.span>
                              <span className="text-[10px] font-bold text-white">{moment.likesCount || 0}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <ThumbsUp size={14} className="text-gray-500 group-hover:text-blue-500 transition-colors fill-current opacity-60 group-hover:opacity-100" />
                              <span className="text-[10px] font-bold text-gray-500">{moment.likesCount || 0}</span>
                            </div>
                          )}

                          {/* Reaction summary icons */}
                          {moment.likesCount > 0 && moment.reactionCounts && (
                            <div className="absolute -top-3 left-0 flex -space-x-1">
                              {Object.entries(moment.reactionCounts)
                                .filter(([_, count]: any) => count > 0)
                                .sort(([_, a]: any, [__, b]: any) => b - a)
                                .slice(0, 3)
                                .map(([type], idx) => (
                                  <div 
                                    key={type} 
                                    className="w-4 h-4 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-[8px] shadow-lg"
                                    style={{ zIndex: 10 - idx }}
                                  >
                                    {REACTIONS.find(r => r.type === type)?.icon}
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </button>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedMomentId(moment.id); }}
                        className="flex items-center gap-1 group"
                      >
                        <MessageCircle size={14} className="text-gray-500 group-hover:text-cyan-500 transition-colors" />
                        <span className="text-[10px] text-gray-500 font-bold">{moment.commentsCount || 0}</span>
                      </button>
                   </div>
                   <div className="flex items-center gap-1 opacity-50">
                     <UserIcon size={8} />
                     <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{moment.authorName || moment.user}</span>
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Nested Comments Modal */}
        <AnimatePresence>
          {selectedMomentId && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedMomentId(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative bg-zinc-950 w-full max-w-lg h-[85vh] sm:h-[70vh] rounded-t-[3rem] sm:rounded-[3rem] border-t sm:border border-white/10 flex flex-col shadow-2xl overflow-hidden"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500">
                      <MessageCircle size={20} />
                    </div>
                    <div>
                      <h3 className="font-serif italic text-lg text-white">Moments Archive</h3>
                      <p className="text-[8px] uppercase tracking-widest font-bold text-gray-500">Discussion Protocol Active</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedMomentId(null)}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all hover:rotate-90"
                  >
                    <Close size={20} />
                  </button>
                </div>

                {/* Comment List */}
                <div className="flex-1 overflow-y-scroll p-6 space-y-6 no-scrollbar relative">
                  {(comments[selectedMomentId] || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-4">
                      <MessageCircle size={48} strokeWidth={1} />
                      <p className="text-xs uppercase tracking-widest font-bold">No data in transmission</p>
                    </div>
                  ) : (
                    (comments[selectedMomentId] || []).map((comment) => (
                      <div key={comment.id} className="space-y-3">
                        <div className="flex gap-2 items-start">
                          {/* User Avatar */}
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold border border-white/5 flex-shrink-0 mt-1">
                            {comment.authorName?.[0]?.toUpperCase() || 'L'}
                          </div>
                          
                          {/* Comment Content Bubble */}
                          <div className="flex-1 space-y-1">
                            <div className="relative inline-block bg-zinc-900 border border-white/5 rounded-[1.25rem] px-4 py-2 w-fit max-w-[95%] shadow-sm pr-12">
                              <p className="text-[12px] font-bold text-gray-100 mb-0.5">@{comment.authorName}</p>
                              <p className="text-sm text-gray-300 leading-tight font-normal">{comment.text}</p>
                              
                              {/* Facebook-style reaction overlay on comment bubble */}
                              {comment.likesCount > 0 && (
                                <div className="absolute -bottom-1.5 right-2 bg-zinc-800 border border-cyan-500/30 rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-md text-[9px] font-bold text-cyan-400">
                                  <span className="text-[10px]">👍</span>
                                  <span>{comment.likesCount}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Inline Actions */}
                            <div className="flex items-center gap-4 px-3">
                              <button 
                                onClick={() => handleCommentLike(comment.id)}
                                className={cn(
                                  "text-[11px] font-bold transition-colors",
                                  userCommentLikes.has(comment.id) ? "text-cyan-400 font-extrabold" : "text-gray-500 hover:text-white"
                                )}
                              >
                                {userCommentLikes.has(comment.id) ? 'Liked' : 'Like'}
                              </button>
                              <button 
                                onClick={() => setReplyTo({ id: comment.id, user: comment.authorName })}
                                className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors"
                              >
                                Reply
                              </button>
                              <span className="text-[11px] text-gray-600 font-medium">Just now</span>
                            </div>
                          </div>
                        </div>

                        {/* Nested Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-10 space-y-3 border-l border-white/5 pl-2">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-2">
                                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold border border-white/5 flex-shrink-0 mt-1">
                                  {reply.authorName?.[0]?.toUpperCase() || 'L'}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="bg-zinc-900/50 border border-white/5 rounded-[1rem] px-3 py-1.5 w-fit max-w-[95%] shadow-sm relative pr-10">
                                    <p className="text-[11px] font-bold text-gray-200 mb-0.5">@{reply.authorName}</p>
                                    <p className="text-xs text-gray-400 leading-tight">{reply.text}</p>
                                    
                                    {/* Facebook-style reaction overlay on reply bubble */}
                                    {reply.likesCount > 0 && (
                                      <div className="absolute -bottom-1.5 right-1 bg-zinc-850 border border-cyan-500/30 rounded-full px-1 py-0.5 flex items-center gap-1 shadow-md text-[8px] font-bold text-cyan-400">
                                        <span className="text-[9px]">👍</span>
                                        <span>{reply.likesCount}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 px-2">
                                    <button 
                                      onClick={() => handleCommentLike(reply.id)}
                                      className={cn(
                                        "text-[10px] font-bold transition-colors",
                                        userCommentLikes.has(reply.id) ? "text-cyan-400 font-extrabold" : "text-gray-600 hover:text-white"
                                      )}
                                    >
                                      {userCommentLikes.has(reply.id) ? 'Liked' : 'Like'}
                                    </button>
                                    <button 
                                      onClick={() => setReplyTo({ id: comment.id, user: reply.authorName })}
                                      className="text-[10px] font-bold text-gray-600 hover:text-white transition-colors"
                                    >
                                      Reply
                                    </button>
                                    <span className="text-[10px] text-gray-700 font-medium">Just now</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-zinc-950 border-t border-white/5 pb-10 sm:pb-6">
                  {replyTo && (
                    <div className="flex items-center justify-between mb-2 px-4 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Replying to @{replyTo.user}</p>
                      <button onClick={() => setReplyTo(null)}><Close size={12} className="text-rose-500" /></button>
                    </div>
                  )}
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleAddComment(selectedMomentId); }}
                    className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl focus-within:border-cyan-500/50 transition-all shadow-lg"
                  >
                    <input 
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={replyTo ? "Broadcast reply..." : "Broadcast thought..."}
                      className="flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none"
                    />
                    <button 
                      type="submit"
                      disabled={!newComment.trim()}
                      className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {filteredMoments.length === 0 && (
          <div className="text-center py-20 opacity-20 italic">
            {ui.noItemsFound.replace('found', activeTab === 'video' ? 'videos found' : 'pictures found')}
          </div>
        )}

        <div className="text-center pt-8">
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.4em] font-medium italic">{ui.endOfArchive}</p>
        </div>
      </div>
    </div>
  );
}
