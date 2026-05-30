import React, { useState, useEffect } from 'react';
import { Search, Filter, Upload, BookOpen, GraduationCap, Calendar, Building, PlusCircle, X, ChevronDown, User, Sparkles, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { translateLibrary, translateUI, hasCache } from '../services/translationService';
import { LANGUAGES } from '../constants';

const TRANSLATION_LANGUAGES = LANGUAGES.map(l => l.name);

const DEFAULT_UI = {
  title: 'Research Library',
  catalogingLabel: 'Processing Upload...',
  newEntryLabel: 'New Research Entry',
  placeholderTitle: 'Research Title...',
  manuscriptLabel: 'Select Manuscript (PDF/DOCX)',
  researcherLabel: 'RESEARCHER',
  yearLabel: 'YEAR',
  institutionLabel: 'INSTITUTION',
  departmentLabel: 'DEPARTMENT',
  publishBtn: 'Publish Research',
  searchPlaceholder: 'Search by title, researcher, institution...',
  allYears: 'All Years',
  institutionFilter: 'Institution',
  dbError: 'Database signal disrupted. Please check your connection or retry.'
};

import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, doc, updateDoc, increment, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import ReactMarkdown from 'react-markdown';

import { MessageCircle, ThumbsUp, X as Close, Send, Sparkles as SparklesIcon, Trash2 } from 'lucide-react';
import { PostSkeleton, CommentSkeleton } from '../components/ui/Skeleton';

const REACTIONS = [
  { type: 'like', icon: '👍', label: 'Like', color: 'text-blue-500' },
  { type: 'love', icon: '❤️', label: 'Love', color: 'text-red-500' },
  { type: 'care', icon: '🥰', label: 'Care', color: 'text-yellow-500' },
  { type: 'haha', icon: '😆', label: 'Haha', color: 'text-yellow-500' },
  { type: 'wow', icon: '😮', label: 'Wow', color: 'text-yellow-500' },
  { type: 'sad', icon: '😢', label: 'Sad', color: 'text-yellow-500' },
  { type: 'anger', icon: '😡', label: 'Angry', color: 'text-orange-600' },
];

export default function Library({ lang }: { lang: string }) {
  const { showToast } = useToast();
  const { user, profile } = useUser();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [works, setWorks] = useState<any[]>([]);
  const [ui, setUi] = useState(DEFAULT_UI);

  // New states for functionality
  const [newWork, setNewWork] = useState({ title: '', authors: '', year: '', dept: '', uni: '' });
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedInst, setSelectedInst] = useState('All');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [manuscriptURL, setManuscriptURL] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Interaction States
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, user: string } | null>(null);
  const [userCommentLikes, setUserCommentLikes] = useState<Set<string>>(new Set());

  // New states for reading works
  const [isFullWorkOpen, setIsFullWorkOpen] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    if (!isFullWorkOpen && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsReading(false);
    }
  }, [isFullWorkOpen]);

  const handleReadAloud = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Strip markdown before reading
    const cleanText = text.replace(/[*#_`~]/g, '');

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'English' ? 'en-US' : 'en-US';
    
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = lang === 'English' ? 'en' : lang === 'Spanish' ? 'es' : lang === 'French' ? 'fr' : 'en';
    const voice = voices.find(v => v.lang.startsWith(langPrefix));
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => setIsReading(false);
    
    setIsReading(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!user) return;

    const applyTranslation = async (postsData: any[]) => {
      if (lang !== 'English' && TRANSLATION_LANGUAGES.includes(lang)) {
        setIsTranslating(true);
        setWorks([]); // Reset to avoid language flash

        const translated = await translateLibrary(postsData, lang);
        setWorks(translated);
        
        const translatedUI = await translateUI(DEFAULT_UI, lang);
        if (translatedUI) setUi(translatedUI);
        
        setIsTranslating(false);
      } else {
        setWorks(postsData);
        setUi(DEFAULT_UI);
      }
    };

    const q = query(collection(db, 'posts'), where('genre', '==', 'Academic'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        let yearMatch = data.fullWork?.match(/Year:\s*([^\n]+)/);
        let deptMatch = data.fullWork?.match(/Department:\s*([^\n]+)/);
        let uniMatch = data.fullWork?.match(/Institution:\s*([^\n]+)/);
        let authMatch = data.fullWork?.match(/Authors:\s*([^\n]+)/);
        let titleMatch = data.fullWork?.match(/Title:\s*([^\n]+)/);

        return {
          id: doc.id,
          authorId: data.authorId || data.userId || data.user || null,
          title: titleMatch ? titleMatch[1].trim() : (data.desc.replace('Research: ', '') || 'Untitled'),
          auth: authMatch ? authMatch[1].trim() : data.authorName,
          year: yearMatch ? yearMatch[1].trim() : new Date(data.createdAt?.toDate?.() || Date.now()).getFullYear().toString(),
          dept: deptMatch ? deptMatch[1].trim() : 'Independent',
          uni: uniMatch ? uniMatch[1].trim() : 'Independent',
          manuscriptURL: data.manuscriptURL || null,
          likesCount: data.likesCount || 0,
          reactionCounts: data.reactionCounts || {},
          commentsCount: data.commentsCount || 0,
        };
      });
      applyTranslation(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'posts (Academic)');
    });

    return () => unsubscribe();
  }, [lang, user]);

  // Real-time reactions listener for the current user
  useEffect(() => {
    if (!user || works.length === 0) return;
    const unsubscribeFns = works.map(work => {
      const path = `posts/${work.id}/reactions/${user.uid}`;
      return onSnapshot(doc(db, path), (doc) => {
        if (doc.exists()) {
          setUserReactions(prev => ({ ...prev, [work.id]: doc.data().type }));
        } else {
          setUserReactions(prev => {
            const next = { ...prev };
            delete next[work.id];
            return next;
          });
        }
      });
    });
    return () => unsubscribeFns.forEach(fn => fn());
  }, [user, works.length]);

  // Real-time comments listener for the selected work
  useEffect(() => {
    if (!selectedWorkId) {
      setComments({});
      return;
    }
    setIsCommentsLoading(true);
    const q = query(collection(db, `posts/${selectedWorkId}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const topLevel = commentsData.filter(c => !c.parentCommentId);
      const withReplies = topLevel.map(c => ({
        ...c,
        replies: commentsData.filter(r => r.parentCommentId === c.id)
      }));
      setComments(prev => ({ ...prev, [selectedWorkId]: withReplies }));
      setIsCommentsLoading(false);
    }, (error) => {
      console.error(error);
      setIsCommentsLoading(false);
    });
    return () => unsubscribe();
  }, [selectedWorkId]);

  const handleReaction = async (postId: string, type: string) => {
    if (!user) return;
    const reactionDoc = doc(db, `posts/${postId}/reactions/${user.uid}`);
    const postRef = doc(db, 'posts', postId);
    
    const oldType = userReactions[postId];

    try {
      if (oldType === type) {
        await deleteDoc(reactionDoc);
        await updateDoc(postRef, { 
          likesCount: increment(-1),
          [`reactionCounts.${type}`]: increment(-1)
        });
      } else if (oldType) {
        await setDoc(reactionDoc, { userId: user.uid, type, createdAt: serverTimestamp() });
        await updateDoc(postRef, {
          [`reactionCounts.${oldType}`]: increment(-1),
          [`reactionCounts.${type}`]: increment(1)
        });
      } else {
        await setDoc(reactionDoc, { userId: user.uid, type, createdAt: serverTimestamp() });
        await updateDoc(postRef, { 
          likesCount: increment(1),
          [`reactionCounts.${type}`]: increment(1)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${postId}/reactions/${user.uid}`);
    }
    setActiveReactionMenu(null);
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim() || !user) return;
    
    const commentData: any = {
      authorId: user.uid,
      authorName: profile?.displayName || 'Legacy Researcher',
      text: newComment,
      createdAt: serverTimestamp(),
      parentCommentId: replyTo?.id || null,
      replyToUser: replyTo?.user || null,
      likesCount: 0
    };

    const path = `posts/${postId}/comments`;
    try {
      await addDoc(collection(db, path), commentData);
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, { commentsCount: increment(1) });
      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleCommentLike = async (postId: string, commentId: string) => {
    if (!user) return;
    const likeRef = doc(db, `posts/${postId}/comments/${commentId}/likes/${user.uid}`);
    const commentRef = doc(db, `posts/${postId}/comments`, commentId);
    
    const isLiked = userCommentLikes.has(commentId);
    try {
      if (isLiked) {
         await deleteDoc(likeRef);
         await updateDoc(commentRef, { likesCount: increment(-1) });
         setUserCommentLikes(prev => {
            const next = new Set(prev);
            next.delete(commentId);
            return next;
         });
      } else {
         await setDoc(likeRef, { createdAt: serverTimestamp() });
         await updateDoc(commentRef, { likesCount: increment(1) });
         setUserCommentLikes(prev => {
            const next = new Set(prev);
            next.add(commentId);
            return next;
         });
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `posts/${postId}/comments/${commentId}/likes/${user.uid}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const storageRef = ref(storage, `manuscripts/${user.uid}/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload error:", error);
        showToast('Upload failed. Check connection.', 'error');
        setUploadProgress(null);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setManuscriptURL(downloadURL);
        // We set to null after a small delay to avoid "stutter"
        setTimeout(() => setUploadProgress(null), 500);
        showToast('File uploaded successfully.', 'success');

        // USE FILENAME IF NO TITLE
        if (!newWork.title) {
          setNewWork(prev => ({
            ...prev,
            title: file.name
          }));
        }
      }
    );
  };

  const handlePublish = async () => {
    
    if (!newWork.title || !newWork.authors || !newWork.year) {
      showToast('Please fill in required fields: Title, Authors, and Year.', 'error');
      return;
    }

    if (!user) {
      showToast('You must be logged in to publish.', 'error');
      return;
    }

    try {
      const fullWork = `Title: ${newWork.title}\nAuthors: ${newWork.authors}\nYear: ${newWork.year}\nInstitution: ${newWork.uni || 'Independent'}\nDepartment: ${newWork.dept || 'None'}${manuscriptURL ? `\nManuscript: ${manuscriptURL}` : ''}`;

      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: profile?.displayName || 'Legacy Builder',
        desc: `Research: ${newWork.title}`,
        fullWork: fullWork,
        tags: '#research #academia',
        genre: 'Academic',
        music: 'Ambient Study',
        likesCount: 0,
        commentsCount: 0,
        color: 'from-blue-600 to-indigo-500',
        manuscriptURL: manuscriptURL || null,
        createdAt: serverTimestamp()
      });

      // Increment works count in profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { worksCount: increment(1) });

      showToast('Research published successfully!', 'success');
      setIsFormOpen(false);
      setNewWork({ title: '', authors: '', year: '', dept: '', uni: '' });
      setManuscriptURL(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'posts');
    }
  };

  const canDeleteWork = (work: any) => {
    if (!user) return false;
    
    // 1. Direct UID match (Primary)
    if (work.authorId && work.authorId === user.uid) return true;
    
    // 2. Display Name match (Case-insensitive fallback)
    const normalizedAuth = work.auth?.toLowerCase() || '';
    const userDisplayName = (profile?.displayName || user?.displayName || '').toLowerCase();
    const userEmail = (user?.email || '').toLowerCase();
    
    if (userDisplayName && normalizedAuth.includes(userDisplayName)) return true;
    if (userEmail && normalizedAuth.includes(userEmail.split('@')[0])) return true;
    
    // 3. Document has user-matching field
    if (work.authorName && work.authorName.toLowerCase() === userDisplayName) return true;

    // 4. Developer / Sandbox Fallback: If author is placeholder or authorId is missing/invalid, allow easy library cleanup
    if (!work.authorId || work.authorId === 'null' || work.authorId === 'undefined' || work.authorId.length < 10 || work.authorId.includes(' ') || work.auth === 'Researcher Anonymous' || work.auth === 'Legacy Builder' || work.auth === 'Legacy Researcher') {
      return true;
    }

    return false;
  };

  const handleDeleteWork = async (workId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this research work? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'posts', workId));
      
      // Decrement user's worksCount if user exists
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { worksCount: increment(-1) });
        } catch (err) {
          console.warn("Could not decrement worksCount:", err);
        }
      }
      
      showToast('Research work deleted successfully.', 'success');
      if (isFullWorkOpen === workId) {
        setIsFullWorkOpen(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${workId}`);
    }
  };

  const filteredWorks = works.filter(w => {
    const matchesSearch = w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.auth.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.uni.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesYear = selectedYear === 'All' || w.year === selectedYear;
    const matchesInst = selectedInst === 'All' || w.uni.toLowerCase().includes(selectedInst.toLowerCase());
    
    return matchesSearch && matchesYear && matchesInst;
  });

  const years = Array.from(new Set(works.map(w => w.year))).sort((a, b) => (b as string).localeCompare(a as string));
  const institutions = Array.from(new Set(works.map(w => w.uni))).sort();

  return (
    <div className="p-4 pt-10 pb-24 h-full overflow-y-auto no-scrollbar relative">
      {/* AI Translating Indicator */}
      <AnimatePresence>
        {isTranslating && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-xl px-6 py-2 rounded-full border border-cyan-500/30 flex items-center gap-3 shadow-2xl"
          >
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
              <Sparkles size={16} className="text-cyan-500" />
            </motion.div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white">{ui.catalogingLabel}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8 px-2">
        <h1 className="text-3xl font-serif italic">{ui.title}</h1>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className={cn(
            "p-2 rounded-full transition-all shadow-lg",
            isFormOpen ? "bg-white text-black rotate-45" : "bg-cyan-500 text-black hover:scale-110"
          )}
        >
          <PlusCircle size={24} />
        </button>
      </div>

      <div className="space-y-8">
        {/* Simple Sheet Research Form */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0, y: -20 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -20 }}
              className="overflow-hidden"
            >
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 mb-8 shadow-2xl backdrop-blur-md space-y-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                      <Upload size={18} />
                    </div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {ui.newEntryLabel}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="relative group">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    </div>
                    <input 
                      type="text" 
                      value={newWork.title}
                      onChange={(e) => setNewWork(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={ui.placeholderTitle} 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-6 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-serif italic text-white"
                    />
                  </div>

                  <div 
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.pdf') || file.name.endsWith('.docx')) {
                          handleFileChange({ target: { files: [file] } } as any);
                        } else {
                          showToast('Only PDF or DOCX files are allowed.', 'error');
                        }
                      }
                    }}
                    onClick={() => !uploadProgress && fileInputRef.current?.click()}
                    className={cn(
                      "h-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer bg-black/20 relative overflow-hidden",
                      manuscriptURL ? "border-cyan-500/50 bg-cyan-500/5" : "border-white/5 hover:border-cyan-500/20 text-gray-600",
                      uploadProgress && "cursor-wait opacity-80"
                    )}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileChange}
                      disabled={uploadProgress !== null}
                    />
                    {uploadProgress !== null ? (
                      <div className="flex flex-col items-center gap-2">
                        <motion.div 
                          className="absolute inset-0 bg-cyan-500/10"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                        />
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        >
                          <Upload size={24} className="text-cyan-500" />
                        </motion.div>
                        <span className="text-[10px] uppercase tracking-widest font-black text-cyan-500 z-10">
                          {uploadProgress >= 100 ? 'Finalizing...' : 'Uploading...'}
                        </span>
                      </div>
                    ) : manuscriptURL ? (
                      <div className="flex flex-col items-center gap-2">
                         <BookOpen size={24} className="text-cyan-500" />
                         <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-500">File Uploaded</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="opacity-20" />
                        <span className="text-[10px] uppercase tracking-widest font-bold">{ui.manuscriptLabel}</span>
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" />
                      <input 
                        type="text" 
                        value={newWork.authors}
                        onChange={(e) => setNewWork(prev => ({ ...prev, authors: e.target.value }))}
                        placeholder="Authors (Comma separated)" 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-cyan-500/30" 
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" />
                    <input 
                      type="number" 
                      value={newWork.year}
                      onChange={(e) => setNewWork(prev => ({ ...prev, year: e.target.value }))}
                      placeholder={ui.yearLabel} 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-cyan-500/30" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div className="relative">
                      <Building size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" />
                      <input 
                        type="text" 
                        value={newWork.uni}
                        onChange={(e) => setNewWork(prev => ({ ...prev, uni: e.target.value }))}
                        placeholder={ui.institutionLabel} 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-cyan-500/30" 
                      />
                    </div>
                    <div className="relative">
                      <GraduationCap size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" />
                      <input 
                        type="text" 
                        value={newWork.dept}
                        onChange={(e) => setNewWork(prev => ({ ...prev, dept: e.target.value }))}
                        placeholder={ui.departmentLabel} 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-cyan-500/30" 
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handlePublish}
                    className="w-full py-4 bg-cyan-500 text-black font-bold rounded-2xl text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-2"
                  >
                    Publish Research Work
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing Browse Experience */}
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ui.searchPlaceholder}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-xl"
            />
            <button 
              onClick={() => { setIsFormOpen(true); setTimeout(() => fileInputRef.current?.click(), 100); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-cyan-500/10 text-cyan-500 rounded-xl hover:bg-cyan-500/20 transition-all active:scale-95 z-10"
              title="Quick Manuscript Upload"
            >
              <Upload size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors appearance-none focus:outline-none"
              >
                <option value="All">{ui.allYears}</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" />
            </div>
            
            <div className="relative">
              <select 
                value={selectedInst}
                onChange={(e) => setSelectedInst(e.target.value)}
                className="w-full flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors appearance-none focus:outline-none"
              >
                <option value="All">{ui.institutionFilter}</option>
                {institutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" />
            </div>
          </div>

          <div className="space-y-4">
             {filteredWorks.map((work, i) => (
               <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                onClick={() => setIsFullWorkOpen(work.id)}
                className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-4 hover:bg-white/10 transition-all cursor-pointer shadow-lg group"
               >
                 <div className="flex items-start justify-between">
                   <div className="space-y-2">
                     <h3 className="font-serif italic text-xl text-white group-hover:text-cyan-400 transition-colors leading-tight">{work.title}</h3>
                     <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{work.auth} <span className="text-cyan-500/40 mx-2">•</span> {work.year}</p>
                   </div>
                   <div className="flex items-center gap-2">
                     {canDeleteWork(work) && (
                       <button
                         onClick={(e) => handleDeleteWork(work.id, e)}
                         className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-90"
                         title="Delete Research"
                       >
                         <Trash2 size={16} />
                       </button>
                     )}
                     <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                      <BookOpen size={20} />
                     </div>
                   </div>
                 </div>
                 <div className="flex flex-wrap gap-4 text-[9px] text-gray-600 font-bold uppercase tracking-widest border-t border-white/5 pt-4">
                   <span className="flex items-center gap-1.5"><GraduationCap size={12} className="text-rose-500" /> {work.dept}</span>
                   <span className="flex items-center gap-1.5"><Building size={12} className="text-rose-500" /> {work.uni}</span>
                   
                   <div className="flex items-center gap-4 ml-auto">
                     <div className="relative" onMouseLeave={() => setActiveReactionMenu(null)}>
                        <AnimatePresence>
                          {activeReactionMenu === work.id && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.5 }}
                              animate={{ opacity: 1, y: -45, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              className="absolute bottom-full left-0 bg-zinc-900 border border-white/10 rounded-full p-1.5 flex gap-1 z-50 shadow-2xl backdrop-blur-xl"
                            >
                              {REACTIONS.map((reac) => (
                                <motion.button
                                  key={reac.type}
                                  whileHover={{ scale: 1.4, y: -5 }}
                                  onClick={(e) => { e.stopPropagation(); handleReaction(work.id, reac.type); }}
                                  className="w-8 h-8 flex items-center justify-center text-xl"
                                >
                                  {reac.icon}
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveReactionMenu(activeReactionMenu === work.id ? null : work.id); }}
                          onMouseEnter={() => setActiveReactionMenu(work.id)}
                          className="flex items-center gap-1.5 group transition-colors hover:text-white"
                        >
                          {userReactions[work.id] ? (
                            <span className="text-sm">{REACTIONS.find(r => r.type === userReactions[work.id])?.icon}</span>
                          ) : (
                            <ThumbsUp size={12} className="text-rose-500" />
                          )}
                          <span>{work.likesCount || 0}</span>
                          
                          {/* Top reactions icons */}
                          {work.likesCount > 0 && work.reactionCounts && (
                            <div className="flex -space-x-1 ml-1">
                              {Object.entries(work.reactionCounts)
                                .filter(([_, count]: any) => count > 0)
                                .sort(([_, a]: any, [__, b]: any) => b - a)
                                .slice(0, 2)
                                .map(([type]) => (
                                  <span key={type} className="text-[10px]">{REACTIONS.find(r => r.type === type)?.icon}</span>
                                ))
                              }
                            </div>
                          )}
                        </button>
                     </div>

                     <button 
                       onClick={(e) => { e.stopPropagation(); setSelectedWorkId(work.id); }}
                       className="flex items-center gap-1.5 hover:text-white transition-colors"
                     >
                       <MessageCircle size={12} className="text-cyan-500" /> 
                       <span>{work.commentsCount || 0}</span>
                     </button>
                   </div>

                   {work.manuscriptURL && (
                     <a 
                       href={work.manuscriptURL} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="flex items-center gap-1.5 text-cyan-500 hover:text-white transition-colors"
                       onClick={(e) => e.stopPropagation()}
                     >
                       <BookOpen size={12} />
                       View Manuscript
                     </a>
                   )}
                 </div>
               </motion.div>
             ))}
          </div>
        </div>
      </div>
      {/* Full Work Modal */}
      <AnimatePresence>
        {isFullWorkOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFullWorkOpen(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-zinc-900 border border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-2xl no-scrollbar"
            >
              <button 
                onClick={() => setIsFullWorkOpen(null)}
                className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all hover:rotate-90 text-white"
              >
                <Close size={20} />
              </button>
              
              {(() => {
                const work = works.find(w => w.id === isFullWorkOpen);
                if (!work) return null;
                return (
                  <div className="space-y-8">
                    <div className="space-y-4 border-b border-white/5 pb-8">
                      <h2 className="text-3xl sm:text-4xl font-serif italic text-white flex gap-2">
                        {work.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-widest text-cyan-500">
                        <span>{work.auth}</span>
                        <span className="text-white/20">•</span>
                        <span>{work.year}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <p className="text-white uppercase tracking-[0.3em] text-[10px] font-black">{work.genre || 'Research Work'}</p>
                        <button
                         onClick={() => handleReadAloud(work.fullWork || '')}
                         className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 rounded-full transition-colors active:scale-95 border border-cyan-500/20 shadow-md"
                         title="Read aloud"
                        >
                         {isReading ? <Close size={14} className="fill-current" /> : <BookOpen size={14} />}
                         <span className="text-[10px] font-bold uppercase tracking-wider">
                           {isReading ? 'Stop Reading' : 'Listen Extract'}
                         </span>
                        </button>
                        {canDeleteWork(work) && (
                          <button
                           onClick={(e) => handleDeleteWork(work.id, e)}
                           className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all active:scale-95 border border-red-500/20 shadow-md"
                           title="Delete Research"
                          >
                           <Trash2 size={14} />
                           <span className="text-[10px] font-bold uppercase tracking-wider">
                             Delete Work
                           </span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="prose prose-invert max-w-none text-gray-300">
                      <ReactMarkdown>
                        {work.fullWork || 'No manuscript text available.'}
                      </ReactMarkdown>
                    </div>

                    <div className="pt-8 flex flex-wrap gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest border-t border-white/5">
                      <span className="flex items-center gap-1.5"><GraduationCap size={12} className="text-rose-500" /> {work.dept}</span>
                      <span className="flex items-center gap-1.5"><Building size={12} className="text-rose-500" /> {work.uni}</span>
                    </div>

                    {work.manuscriptURL && (
                      <div className="pt-8">
                        <a 
                          href={work.manuscriptURL} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-4 bg-cyan-500 text-black font-bold uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                        >
                          <BookOpen size={16} />
                          Download Full Manuscript
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      <AnimatePresence>
        {selectedWorkId && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWorkId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative bg-zinc-950 w-full max-w-lg h-[80vh] rounded-t-[3rem] sm:rounded-[3rem] border-t sm:border border-white/10 flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h3 className="text-xl font-serif italic">Discussion</h3>
                <button onClick={() => setSelectedWorkId(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full">
                  <Close size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {isCommentsLoading ? (
                  <CommentSkeleton />
                ) : (comments[selectedWorkId] || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20">
                    <MessageCircle size={48} />
                    <p className="mt-4 text-xs uppercase tracking-widest font-black">No discussion yet</p>
                  </div>
                ) : (
                  (comments[selectedWorkId] || []).map((comment) => (
                    <div key={comment.id} className="space-y-2">
                       <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-xs font-bold text-cyan-500">
                             {comment.authorName?.[0]}
                          </div>
                          <div className="flex-1">
                             <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                <p className="text-[11px] font-bold text-gray-400 mb-1">@{comment.authorName}</p>
                                <p className="text-sm text-gray-200">{comment.text}</p>
                             </div>
                             <div className="flex items-center gap-4 mt-2 px-2">
                                <button 
                                  onClick={() => handleCommentLike(selectedWorkId, comment.id)}
                                  className="text-[10px] font-bold text-gray-500 hover:text-white"
                                >
                                  Like {comment.likesCount ? `(${comment.likesCount})` : ''}
                                </button>
                                <button className="text-[10px] font-bold text-gray-500 hover:text-white">Reply</button>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-zinc-950 border-t border-white/5">
                 <form 
                   onSubmit={(e) => { e.preventDefault(); handleAddComment(selectedWorkId); }}
                   className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl"
                 >
                   <input 
                     type="text" 
                     value={newComment}
                     onChange={(e) => setNewComment(e.target.value)}
                     placeholder="Add to the research discussion..." 
                     className="flex-1 bg-transparent px-4 py-2 text-sm text-white focus:outline-none"
                   />
                   <button type="submit" className="p-2 bg-cyan-500 rounded-xl text-black">
                     <Send size={18} />
                   </button>
                 </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
