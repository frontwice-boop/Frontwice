import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Share2, Music2, ChevronDown, Check, X, Sparkles, ThumbsUp, Heart as HeartIcon, Smile, Frown, MessageSquareIcon, Send, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { translateFeed, translateUI, hasCache } from '../services/translationService';
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
  { type: 'love', icon: '❤️', label: 'Love', color: 'text-rose-500' },
  { type: 'care', icon: '🤗', label: 'Care', color: 'text-yellow-400' },
  { type: 'haha', icon: '😆', label: 'Haha', color: 'text-yellow-400' },
  { type: 'wow', icon: '😮', label: 'Wow', color: 'text-yellow-400' },
  { type: 'sad', icon: '😢', label: 'Sad', color: 'text-yellow-400' },
  { type: 'anger', icon: '😡', label: 'Anger', color: 'text-orange-600' },
];

const GENRES = [
  'Poetry', 'Sci-Fi', 'Prose', 'Historical', 'Mystery', 
  'Romance', 'Thriller', 'Academic', 'Biography', 'Drama'
];

// Top 70 languages for automatic feed translation
const TRANSLATION_LANGUAGES = LANGUAGES.map(l => l.name);

// Dummy data for visual representation of TikTok feed
const DUMMY_POSTS = [
  {
    id: '1',
    user: '@starlight_writer',
    desc: 'The mountains echoed with whispers of the past...',
    fullWork: 'In the silence of the dawn, the peaks spoke in a tongue long forgotten. They told of giants who once walked these valleys, their steps carving the rivers and their breath forming the clouds. Every stone holds a secret, and every echo is a memory trying to find its way home. I write these words so they are not lost to the wind, captured in the ink of an ancient heart.',
    tags: '#poetry #scifi #original',
    music: 'Original Sound - frontwice',
    likes: '245K',
    comments: '1.2K',
    color: 'from-purple-600 to-blue-500'
  },
  {
    id: '2',
    user: '@history_buff',
    desc: 'New research paper on the Silk Road available in the library!',
    fullWork: 'Abstract: This study explores the socio-economic impact of the Silk Road on nomadic tribes in Central Asia during the 3rd century. By analyzing recent archaeological findings near the Oxus river, we demonstrate a complex network of trade that extended far beyond luxury goods, influencing spiritual practices and artistic expressions across continents. The integration of local artisans into the global trade route was a primary driver of cultural hybridization.',
    tags: '#history #research #academic',
    music: 'Ancient Echoes - Library Ambiance',
    likes: '12K',
    comments: '430',
    color: 'from-orange-500 to-rose-600'
  }
];

const DEFAULT_UI = {
  genresLabel: 'Genres',
  selectGenreTitle: 'Select Genre',
  allLabel: 'ALL',
  filteringLabel: 'Filtering the feed based on choice',
  translatingLabel: 'AI Translating to',
  commentsTitle: 'Discussion',
  commentPlaceholder: 'Type a comment...',
  sendLabel: 'Send',
  fullWorkTitle: 'Full Work',
  tapToRead: 'Tap to read full work',
  searchPlaceholder: 'Search by author, title, or year...'
};

import { useToast } from '../context/ToastContext';

import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, deleteDoc, getDocs, updateDoc, increment, getDoc, where } from 'firebase/firestore';
import { useUser } from '../context/UserContext';

export default function Home({ lang }: { lang: string }) {
  const { showToast } = useToast();
  const { user, profile } = useUser();
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [translatedPosts, setTranslatedPosts] = useState<any[]>([]);
  const [ui, setUi] = useState(DEFAULT_UI);
  
  // New States for Functionality
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isFullWorkOpen, setIsFullWorkOpen] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, user: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  // Real-time posts listener
  useEffect(() => {
    let q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    
    // If genre selected, filter (Note: might need composite index for desc + genre)
    if (selectedGenre !== 'All') {
       q = query(collection(db, 'posts'), where('genre', '==', selectedGenre), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
    });
    return () => unsubscribe();
  }, [selectedGenre]);

  // Real-time reactions listener for the current user
  useEffect(() => {
    if (!user) return;
    const unsubscribeFns = posts.map(post => {
      return onSnapshot(doc(db, `posts/${post.id}/reactions/${user.uid}`), (doc) => {
        if (doc.exists()) {
          setUserReactions(prev => ({ ...prev, [post.id]: doc.data().type }));
        } else {
          setUserReactions(prev => {
            const next = { ...prev };
            delete next[post.id];
            return next;
          });
        }
      });
    });
    return () => unsubscribeFns.forEach(fn => fn());
  }, [user, posts.length]);

  // Real-time comments listener for the selected post
  useEffect(() => {
    if (!selectedPostId) return;
    const q = query(collection(db, `posts/${selectedPostId}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Nest replies
      const topLevel = commentsData.filter(c => !c.parentCommentId);
      const withReplies = topLevel.map(c => ({
        ...c,
        replies: commentsData.filter(r => r.parentCommentId === c.id)
      }));
      
      setComments(prev => ({ ...prev, [selectedPostId]: withReplies }));
    });
    return () => unsubscribe();
  }, [selectedPostId]);

  // UI Translation
  useEffect(() => {
    const applyUiTranslation = async () => {
      if (TRANSLATION_LANGUAGES.includes(lang) && lang !== 'English') {
        const translatedUI = await translateUI(DEFAULT_UI, lang);
        if (translatedUI) setUi(translatedUI);
      } else {
        setUi(DEFAULT_UI);
      }
    };
    applyUiTranslation();
  }, [lang]);

  // Feed Translation & Search
  useEffect(() => {
    const applyFeedTranslation = async () => {
      let filteredPosts = [...posts];

      // Local filtering based on search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filteredPosts = posts.filter(post => {
          const authorMatch = post.authorName?.toLowerCase().includes(q) || post.user?.toLowerCase().includes(q);
          const descMatch = post.desc?.toLowerCase().includes(q);
          const fullWorkMatch = post.fullWork?.toLowerCase().includes(q);
          
          // Year of publication check
          let yearMatch = false;
          if (post.createdAt) {
            const date = post.createdAt.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
            const year = date.getFullYear().toString();
            yearMatch = year.includes(q);
          }
          
          return authorMatch || descMatch || fullWorkMatch || yearMatch;
        });
      }

      if (filteredPosts.length === 0) {
        setTranslatedPosts([]);
        return;
      }

      if (TRANSLATION_LANGUAGES.includes(lang) && lang !== 'English') {
        setIsTranslating(true);
        const translated = await translateFeed(filteredPosts, lang);
        setTranslatedPosts(translated);
        setIsTranslating(false);
      } else {
        setTranslatedPosts(filteredPosts);
      }
    };
    applyFeedTranslation();
  }, [lang, posts, searchQuery]);

  const handleReaction = async (postId: string, type: string) => {
    if (!user) return;
    const reactionDoc = doc(db, `posts/${postId}/reactions/${user.uid}`);
    
    if (userReactions[postId] === type) {
      await deleteDoc(reactionDoc);
    } else {
      await setDoc(reactionDoc, {
        userId: user.uid,
        type,
        createdAt: serverTimestamp()
      });
    }
    setActiveReactionMenu(null);
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim() || !user) return;
    
    try {
      await addDoc(collection(db, `posts/${postId}/comments`), {
        authorId: user.uid,
        authorName: profile?.displayName || 'Legacy Reader',
        text: newComment,
        createdAt: serverTimestamp(),
        parentCommentId: replyTo?.id || null
      });

      setNewComment('');
      setReplyTo(null);
    } catch (error) {
       console.error(error);
       showToast('Discussion signal lost.', 'error');
    }
  };

  const handleShare = (post: any) => {
    if (navigator.share) {
      navigator.share({
        title: `Work by ${post.user}`,
        text: post.desc,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Functional fallback
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  const handleFollow = (authorId: string, authorName: string) => {
    if (!user) {
      showToast('Login to follow authors', 'info');
      return;
    }
    setFollowing(prev => {
      const next = new Set(prev);
      if (next.has(authorId)) {
        next.delete(authorId);
        showToast(`Unfollowed @${authorName}`, 'info');
      } else {
        next.add(authorId);
        showToast(`Following @${authorName}`, 'success');
      }
      return next;
    });
  };

  const handleCommentLike = (commentId: string) => {
    showToast('Discussion signal boosted!', 'success');
  };

  return (
    <div className="h-screen w-full snap-y-mandatory overflow-y-scroll no-scrollbar relative bg-black">
      {/* Featured Experts Row */}
      <div className="fixed top-24 left-0 right-0 z-40 px-4 pointer-events-none md:hidden">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 pointer-events-auto">
          {['Dr. Elena', 'Marcus T.', 'Sarah J.', 'Victor H.', 'Maya A.'].map((expert, i) => (
            <motion.button
              key={expert}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-1.5 min-w-[60px]"
              onClick={() => showToast(`Opening @${expert}'s Portfolio...`, 'info')}
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-cyan-500/20 p-[1.5px]">
                <div className="w-full h-full rounded-[14px] bg-zinc-900 border border-white/5 flex items-center justify-center overflow-hidden">
                   <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${expert}${i}`} 
                    alt={expert} 
                    className="w-8 h-8 opacity-80"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter truncate w-full text-center">{expert}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Header with Genre Tab & Search */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 px-6">
        <div className="max-w-lg mx-auto relative flex items-center justify-between h-10">
          {/* Genre Selector (Centered) */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <button 
              onClick={() => setIsGenreOpen(true)}
              className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 hover:border-white/30 transition-all active:scale-95 whitespace-nowrap"
            >
              <span className="text-xs uppercase tracking-[0.2em] font-bold">
                {selectedGenre === 'All' ? ui.genresLabel : selectedGenre}
              </span>
              <ChevronDown size={14} className={cn("transition-transform duration-300", isGenreOpen && "rotate-180")} />
            </button>
          </div>

          {/* Search Bar (Right Aligned) */}
          <div className="ml-auto flex items-center gap-2 z-10">
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '160px', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="relative overflow-hidden"
                >
                  <input 
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={ui.searchPlaceholder}
                    className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) setSearchQuery('');
              }}
              className={cn(
                "p-2 rounded-full backdrop-blur-md border transition-all active:scale-95",
                isSearchOpen ? "bg-rose-500 border-rose-500 text-white" : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
              )}
            >
              <Search size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Genre Popup Modal */}
      <AnimatePresence>
        {isGenreOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGenreOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-sm bg-zinc-900 border border-white/10 rounded-[32px] p-6 z-[70] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-serif italic">{ui.selectGenreTitle}</h3>
                <button 
                  onClick={() => setIsGenreOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => { setSelectedGenre('All'); setIsGenreOpen(false); }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border text-sm font-bold transition-all",
                    selectedGenre === 'All' 
                      ? "bg-white text-black border-white" 
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  {ui.allLabel}
                  {selectedGenre === 'All' && <Check size={16} />}
                </button>
                {GENRES.map((genre) => (
                  <button 
                    key={genre}
                    onClick={() => { setSelectedGenre(genre); setIsGenreOpen(false); }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border text-sm font-bold transition-all",
                      selectedGenre === genre 
                        ? "bg-rose-500 text-white border-rose-500" 
                        : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-400"
                    )}
                  >
                    {genre.toUpperCase()}
                    {selectedGenre === genre && <Check size={16} />}
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-gray-500 text-center mt-6 uppercase tracking-widest font-bold">
                {ui.filteringLabel}
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Translation Loading Overlay */}
      <AnimatePresence>
        {isTranslating && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/80 backdrop-blur-lg px-4 py-2 rounded-full border border-rose-500/30 flex items-center gap-2 shadow-lg"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
              <Sparkles size={14} className="text-rose-500" />
            </motion.div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">{ui.translatingLabel} {lang}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {translatedPosts.map((post) => (
        <div 
          key={post.id} 
          className="h-screen w-full snap-start relative flex flex-col items-center justify-center bg-gradient-to-br transition-all duration-700"
        >
          <div className={cn("absolute inset-0 bg-gradient-to-b opacity-40", post.color)} />
          
          {/* Interaction Bar */}
          <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10" onMouseLeave={() => setActiveReactionMenu(null)}>
            <div className="relative">
              <AnimatePresence>
                {activeReactionMenu === post.id && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                    animate={{ opacity: 1, x: -70, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.8 }}
                    className="absolute bottom-0 right-full mr-4 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-full p-1.5 flex gap-1 shadow-2xl z-[100]"
                  >
                    {REACTIONS.map((reac) => (
                      <motion.button
                        key={reac.type}
                        whileHover={{ scale: 1.3, y: -5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReaction(post.id, reac.type)}
                        className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-white/10 rounded-full transition-colors relative group/emoji"
                      >
                        {reac.icon}
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover/emoji:opacity-100 transition-opacity pointer-events-none border border-white/10 whitespace-nowrap">
                          {reac.label}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onMouseEnter={() => setActiveReactionMenu(post.id)}
                onClick={() => {
                  if (!userReactions[post.id]) handleReaction(post.id, 'like');
                  else handleReaction(post.id, userReactions[post.id]); // Toggle off
                }}
                className="flex flex-col items-center gap-1 group focus:outline-none"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300",
                  userReactions[post.id] 
                    ? "bg-white/10 border-white/40 ring-4 ring-white/5 scale-110" 
                    : "bg-gray-800/80 border-white/20 group-hover:scale-110 group-hover:border-white/40"
                )}>
                  {userReactions[post.id] ? (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-2xl"
                    >
                      {REACTIONS.find(r => r.type === userReactions[post.id])?.icon}
                    </motion.span>
                  ) : (
                    <Heart 
                      size={28} 
                      className="text-white fill-white/10 group-hover:fill-rose-500 group-hover:text-rose-500 transition-all duration-300" 
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-colors duration-300",
                  userReactions[post.id] 
                    ? REACTIONS.find(r => r.type === userReactions[post.id])?.color 
                    : "text-white"
                )}>
                  {userReactions[post.id] ? REACTIONS.find(r => r.type === userReactions[post.id])?.label : post.likes}
                </span>
              </button>
            </div>
            
            <button 
              onClick={() => setSelectedPostId(post.id)}
              className="flex flex-col items-center gap-1 group focus:outline-none"
            >
              <div className="w-12 h-12 bg-gray-800/80 rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform hover:bg-white/10">
                <MessageCircle size={28} className="text-white fill-white/10 group-hover:fill-white/20" />
              </div>
              <span className="text-xs font-bold">{post.comments}</span>
            </button>

            <button 
              onClick={() => handleShare(post)}
              className="flex flex-col items-center gap-1 group focus:outline-none"
            >
              <div className="w-12 h-12 bg-gray-800/80 rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform hover:bg-white/10">
                <Share2 size={24} className="text-white group-hover:text-cyan-400" />
              </div>
              <span className="text-xs font-bold">Share</span>
            </button>
          </div>

          {/* Content Info */}
          <div className="absolute left-4 bottom-20 right-20 z-10 space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg">{post.user}</h3>
              <button 
                onClick={() => handleFollow(post.authorId || post.user, post.user)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                  following.has(post.authorId || post.user) 
                    ? "bg-white/10 text-white border border-white/20" 
                    : "bg-rose-600 text-white shadow-lg shadow-rose-600/20 active:scale-95"
                )}
              >
                {following.has(post.authorId || post.user) ? 'Following' : 'Follow'}
              </button>
            </div>
            <p className="text-sm line-clamp-2 leading-relaxed">{post.desc}</p>
            <p className="text-sm font-bold text-cyan-400">{post.tags}</p>
            <div className="flex items-center gap-2 text-xs text-gray-300 bg-black/40 px-3 py-1 rounded-full w-fit">
              <Music2 size={12} className="animate-spin-slow" />
              <span>{post.music}</span>
            </div>
          </div>

          {/* The Content Stage */}
          <div 
            onClick={() => setIsFullWorkOpen(post.id)}
            className="w-full max-w-[85%] aspect-[9/16] bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden relative group cursor-pointer"
          >
             <div className="text-center p-8">
                <div className="w-20 h-1 bg-white/20 mx-auto mb-6 rounded-full" />
                <h4 className="text-4xl font-serif italic mb-4 opacity-40 group-hover:opacity-100 transition-opacity">Creative<br/>Masterpiece</h4>
                <p className="text-white/20 uppercase tracking-[0.2em] text-xs">{ui.tapToRead}</p>
             </div>
          </div>
        </div>
      ))}

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
                className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all hover:rotate-90"
              >
                <X size={20} />
              </button>
              
              {(() => {
                const post = posts.find(p => p.id === isFullWorkOpen);
                if (!post) return null;
                return (
                  <div className="space-y-8">
                    <div className="space-y-2 border-b border-white/5 pb-8">
                      <h2 className="text-4xl font-serif italic text-white">{post.authorName || 'Writer Anonymous'}'s Work</h2>
                      <p className="text-rose-500 uppercase tracking-[0.3em] text-[10px] font-black">{ui.fullWorkTitle}</p>
                    </div>
                    
                    <div className="prose prose-invert max-w-none">
                      <p className="text-xl text-gray-300 leading-relaxed font-light italic">
                        {post.fullWork}
                      </p>
                    </div>
                    
                    <div className="pt-8 flex flex-wrap gap-2">
                      {post.tags?.split(' ').map((tag: string) => (
                        <span key={tag} className="px-4 py-1 bg-white/5 rounded-full text-xs font-bold text-cyan-400 border border-white/5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      <AnimatePresence>
        {selectedPostId && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPostId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-zinc-950 w-full max-w-lg h-[80vh] rounded-t-[3rem] sm:rounded-[3rem] border-t sm:border border-white/10 flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h3 className="text-xl font-serif italic">{ui.commentsTitle}</h3>
                <button 
                  onClick={() => setSelectedPostId(null)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {(comments[selectedPostId] || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20">
                    <MessageSquareIcon size={48} />
                    <p className="mt-4 text-xs uppercase tracking-widest font-black">No discussion yet</p>
                  </div>
                ) : (
                  (comments[selectedPostId] || []).map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex gap-2 items-start">
                        {/* User Avatar */}
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold border border-white/5 flex-shrink-0 mt-1 shadow-inner">
                          {comment.authorName?.[0]?.toUpperCase() || 'L'}
                        </div>
                        
                        {/* Comment Content Bubble */}
                        <div className="flex-1 space-y-1">
                          <div className="bg-zinc-900 border border-white/5 rounded-[1.25rem] px-4 py-2 w-fit max-w-[95%] shadow-sm">
                            <p className="text-[12px] font-bold text-gray-100 mb-0.5">@{comment.authorName}</p>
                            <p className="text-sm text-gray-300 leading-tight font-normal">{comment.text}</p>
                          </div>
                          
                          {/* Inline Actions */}
                          <div className="flex items-center gap-4 px-3">
                            <button 
                              onClick={() => handleCommentLike(comment.id)}
                              className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors"
                            >
                              Like
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
                                <div className="bg-zinc-900/50 border border-white/5 rounded-[1rem] px-3 py-1.5 w-fit max-w-[95%] shadow-sm">
                                  <p className="text-[11px] font-bold text-gray-200 mb-0.5">@{reply.authorName}</p>
                                  <p className="text-xs text-gray-400 leading-tight">{reply.text}</p>
                                </div>
                                <div className="flex items-center gap-4 px-2">
                                  <button 
                                    onClick={() => handleCommentLike(reply.id)}
                                    className="text-[10px] font-bold text-gray-600 hover:text-white transition-colors"
                                  >
                                    Like
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

              <div className="p-6 bg-zinc-950 border-t border-white/5 pb-10 sm:pb-6">
                {replyTo && (
                  <div className="flex items-center justify-between mb-3 px-4 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Replying to @{replyTo.user}</p>
                    <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-rose-500/10 rounded-full transition-colors"><X size={12} className="text-rose-500" /></button>
                  </div>
                )}
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleAddComment(selectedPostId); }}
                  className="flex items-center gap-3"
                >
                  <input 
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyTo ? "Type a reply..." : ui.commentPlaceholder}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button 
                    type="submit"
                    disabled={!newComment.trim()}
                    className="p-4 bg-cyan-500 rounded-2xl text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
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
