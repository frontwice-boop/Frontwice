import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Heart, MessageCircle, Share2, Music2, ChevronDown, Check, X, Sparkles, ThumbsUp, Heart as HeartIcon, Smile, Frown, MessageSquareIcon, Send, Search, Volume2, Square, Trash2, BookOpen, Paperclip, UserPlus, UserCheck, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { translateFeed, translateUI, hasCache } from '../services/translationService';
import { LANGUAGES } from '../constants';
import ReactMarkdown from 'react-markdown';

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

const GENRES = [
  'Poetry', 'Sci-Fi', 'Prose', 'Historical', 'Mystery', 
  'Romance', 'Thriller', 'Academic', 'Biography', 'Autobiography', 'Drama'
];

// Top 70 languages for automatic feed translation
const TRANSLATION_LANGUAGES = LANGUAGES.map(l => l.name);

const DEFAULT_UI = {
  genresLabel: 'Genres',
  selectGenreTitle: 'Select Genre',
  allLabel: 'ALL',
  filteringLabel: 'Updating feed...',
  translatingLabel: 'Translating to',
  commentsTitle: 'Discussion',
  commentPlaceholder: 'Type a comment...',
  sendLabel: 'Send',
  fullWorkTitle: 'Full Work',
  tapToRead: 'Tap to read full work',
  searchPlaceholder: 'Search research works...',
  justNow: 'Just now',
  minsAgo: 'm ago',
  hoursAgo: 'h ago',
  daysAgo: 'd ago',
  noDataTransmission: 'Nothing here yet',
  noMatchingTransmission: 'No results found',
  unfollowedMsg: 'Unfollowed',
  followingMsg: 'Following',
  followLabel: 'Follow',
  followingActive: 'Following',
  repliedTo: 'Replying to',
  shareLabel: 'Share',
  noDiscussion: 'No discussion yet',
  likeLabel: 'Like',
  replyLabel: 'Reply',
  dbError: 'Unable to connect. Please try again later.'
};

import { useToast } from '../context/ToastContext';

import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, deleteDoc, getDocs, updateDoc, increment, getDoc, where, collectionGroup } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import { PostSkeleton, CommentSkeleton } from '../components/ui/Skeleton';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export default function Home({ lang }: { lang: string }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, profile } = useUser();
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('cached_home_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to read cached posts:", e);
    }
    return [];
  });
  const [translatedPosts, setTranslatedPosts] = useState<any[]>([]);
  const [ui, setUi] = useState(DEFAULT_UI);
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const saved = localStorage.getItem('cached_home_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return false;
        }
      }
    } catch {
      // default loading is true
    }
    return true;
  });
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [userCommentLikes, setUserCommentLikes] = useState<Set<string>>(new Set());
  
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Helper to format timestamps
  const formatTime = (timestamp: any) => {
    if (!timestamp) return ui.justNow;
    let date: Date;
    if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp && typeof timestamp.seconds === 'number') {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return ui.justNow;
    if (mins < 60) return `${mins}${ui.minsAgo}`;
    if (hours < 24) return `${hours}${ui.hoursAgo}`;
    if (days < 7) return `${days}${ui.daysAgo}`;
    return date.toLocaleDateString();
  };
  
  // New States for Functionality
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isFullWorkOpen, setIsFullWorkOpen] = useState<string | null>(null);

  const canDeletePost = (post: any) => {
    if (!user) return false;
    
    // If Admin (frontwice@gmail.com), allow deleting ANY work
    if (user.email && user.email.toLowerCase() === 'frontwice@gmail.com') {
      return true;
    }
    
    // 1. Direct UID match
    if (post.authorId && post.authorId === user.uid) return true;
    
    // 2. Fallbacks for displayName / user name matching
    const userDisplayName = (profile?.displayName || user?.displayName || '').toLowerCase();
    const postUser = (post.user || '').toLowerCase();
    
    if (userDisplayName && postUser.includes(userDisplayName)) return true;
    if (post.authorName && post.authorName.toLowerCase() === userDisplayName) return true;

    // 3. Sandbox helper: allow delete if it is a default/placeholder name and the user is logged in
    const defaultAuthors = ['writer anonymous', 'legacy builder', 'researcher anonymous', 'legacy researcher'];
    if (!post.authorId || post.authorId === 'null' || post.authorId === 'undefined' || defaultAuthors.includes(postUser)) {
      return true;
    }
    
    return false;
  };

  const handleDeletePost = async (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this work? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'posts', postId));
      
      // Decrement worksCount in user's profile if possible
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { worksCount: increment(-1) });
        } catch (err) {
          console.warn("Could not decrement worksCount:", err);
        }
      }
      
      showToast('Work deleted successfully.', 'success');
      if (isFullWorkOpen === postId) {
        setIsFullWorkOpen(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

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
    utterance.lang = lang === 'English' ? 'en-US' : 'en-US'; // could be configured better but fine for now
    
    // Attempt to match voice language with app language if possible
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
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, user: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  // Facebook-style real-time reactions & reactors list helpers
  const [showReactorsModal, setShowReactorsModal] = useState<string | null>(null);
  const [activeReactors, setActiveReactors] = useState<any[]>([]);

  const userReactionsListenersRef = useRef<Record<string, () => void>>({});

  useEffect(() => {
    return () => {
      // Clean up active user snapshot listeners on unmount
      Object.values(userReactionsListenersRef.current).forEach(unsub => unsub());
    };
  }, []);

  // Set up real-time on-snapshot listener ONLY for the active pop-up modal
  useEffect(() => {
    if (!showReactorsModal) {
      setActiveReactors([]);
      return;
    }
    const reactionsRef = collection(db, `posts/${showReactorsModal}/Reaction`);
    const unsubscribe = onSnapshot(reactionsRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveReactors(list);
    }, (error) => {
      console.warn("Active reactors listener failed:", error);
    });
    return () => unsubscribe();
  }, [showReactorsModal]);

  const getReactionsSummaryText = (post: any) => {
    const totalCount = post.likesCount || 0;
    if (totalCount === 0) return '';
    
    const myReaction = userReactions[post.id];
    if (myReaction) {
      if (totalCount === 1) {
        return 'You';
      } else if (totalCount === 2) {
        return 'You and 1 other';
      } else {
        return `You and ${totalCount - 1} others`;
      }
    } else {
      if (totalCount === 1) {
        return '1 response';
      } else {
        return `${totalCount} responses`;
      }
    }
  };

  const getReactionEmojis = (post: any) => {
    if (!post.reactionCounts) return [];
    const activeTypes = Object.entries(post.reactionCounts)
      .filter(([_, count]) => typeof count === 'number' && count > 0)
      .map(([type]) => type);
    return activeTypes.slice(0, 3).map(type => {
      return REACTIONS.find(r => r.type === type)?.icon || '👍';
    });
  };

  // Real-time posts listener
  useEffect(() => {
    if (!user) return;
    
    let q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    
    // If genre selected, filter (Note: might need composite index for desc + genre)
    if (selectedGenre !== 'All') {
       q = query(collection(db, 'posts'), where('genre', '==', selectedGenre), orderBy('createdAt', 'desc'));
    }

    const serializePost = (doc: any) => {
      const data = doc.data();
      const serializableData = { ...data };
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        serializableData.createdAt = {
          seconds: data.createdAt.seconds,
          nanoseconds: data.createdAt.nanoseconds
        };
      }
      return { 
        id: doc.id, 
        user: data.authorName || 'Writer Anonymous',
        ...serializableData 
      };
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(serializePost);
      setPosts(postsData);
      try {
        localStorage.setItem('cached_home_posts', JSON.stringify(postsData));
      } catch (e) {
        console.warn("Error caching posts:", e);
      }
      setIsLoading(false);
    }, (error) => {
      // Check if it's a missing index error or actual permission error
      if (error instanceof Error && error.message.includes('requires an index')) {
        console.warn("Firestore index required for this query:", error.message);
        // Fallback to non-filtered query
        const fallbackQ = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        onSnapshot(fallbackQ, (s) => {
           const fallbackData = s.docs.map(serializePost);
           setPosts(fallbackData);
           try {
             localStorage.setItem('cached_home_posts', JSON.stringify(fallbackData));
           } catch (e) {
             console.warn("Error caching fallback posts:", e);
           }
           setIsLoading(false);
        });
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'posts');
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [selectedGenre, user]);

  useEffect(() => {
    if (!user) {
      setUserCommentLikes(new Set());
      return;
    }
    
    // Listen to all likes by the current user across all comments
    const q = query(collectionGroup(db, 'likes'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const likedCommentIds = new Set<string>();
      snapshot.docs.forEach(doc => {
        // structural path: posts/{postId}/comments/{commentId}/likes/{userId}
        // doc.ref.parent.parent is the comment doc
        const commentId = doc.ref.parent.parent?.id;
        if (commentId) likedCommentIds.add(commentId);
      });
      setUserCommentLikes(likedCommentIds);
    }, (error) => {
      console.warn("Collection group likes error:", error);
      // We might need to handle index building URL if it fails
    });
    
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setFollowing(new Set());
      return;
    }
    
    // Listen to all users I follow
    const q = query(collection(db, `users/${user.uid}/following`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const followedIds = new Set<string>();
      snapshot.docs.forEach(doc => {
        followedIds.add(doc.id);
      });
      setFollowing(followedIds);
    }, (error) => {
      console.warn("Following error:", error);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Real-time reactions listener for the current user
  useEffect(() => {
    if (!user || posts.length === 0) {
      Object.values(userReactionsListenersRef.current).forEach(unsub => unsub());
      userReactionsListenersRef.current = {};
      setUserReactions({});
      return;
    }

    const activeIds = new Set(posts.map(p => p.id));
    
    // 1. Clean up stale user reaction listeners
    Object.keys(userReactionsListenersRef.current).forEach(id => {
      if (!activeIds.has(id)) {
        userReactionsListenersRef.current[id]();
        delete userReactionsListenersRef.current[id];
      }
    });

    // 2. Set up new user reactions listeners only
    posts.forEach(post => {
      if (!userReactionsListenersRef.current[post.id]) {
        const path = `posts/${post.id}/Reaction/${user.uid}`;
        userReactionsListenersRef.current[post.id] = onSnapshot(doc(db, path), (doc) => {
          if (doc.exists()) {
            setUserReactions(prev => ({ ...prev, [post.id]: doc.data().type }));
          } else {
            setUserReactions(prev => {
              const next = { ...prev };
              delete next[post.id];
              return next;
            });
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, path);
        });
      }
    });
  }, [posts, user]);

  // Real-time comments listener for the selected post
  useEffect(() => {
    if (!selectedPostId) {
      setComments({}); // Clear comments when modal closes to prevent flash
      return;
    }
    setIsCommentsLoading(true);
    const q = query(collection(db, `posts/${selectedPostId}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Nest replies: Group everything under its root parent
      const topLevel = commentsData.filter(c => !c.parentCommentId);
      const withReplies = topLevel.map(c => {
        // Find all replies that belong to this thread (recursive or direct)
        // For simplicity in this UI, we'll collect all descendants or just direct/indirect ones
        // that share the root. But since we don't store rootId, we can do a simple multi-level check 
        // or just flatten them under the top parent if they are descendants.
        
        // Let's refine the schema: if we want true nesting we need more logic.
        // For now, let's at least make sure even nested replies are shown.
        const replies = commentsData.filter(r => {
          if (r.parentCommentId === c.id) return true;
          // Check if the parent of this reply has c.id as its parent
          const parent = commentsData.find(p => p.id === r.parentCommentId);
          return parent && parent.parentCommentId === c.id;
        });

        return {
          ...c,
          replies: replies
        };
      });
      
      setComments(prev => ({ ...prev, [selectedPostId]: withReplies }));
      setIsCommentsLoading(false);
    }, (error) => {
      console.error(error);
      setIsCommentsLoading(false);
    });
    return () => unsubscribe();
  }, [selectedPostId]);

  useEffect(() => {
    if (lang === 'English') {
      setUi(DEFAULT_UI);
    } else {
      translateUI(DEFAULT_UI, lang).then(setUi);
    }
    // Set translated posts to our current posts to avoid any blank/loading flash!
    setTranslatedPosts(posts);
  }, [lang]);

  // Feed & Search
  useEffect(() => {
    const processPosts = async () => {
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
            let date: Date;
            if (typeof post.createdAt.toDate === 'function') {
              date = post.createdAt.toDate();
            } else if (typeof post.createdAt.seconds === 'number') {
              date = new Date(post.createdAt.seconds * 1000);
            } else {
              date = new Date(post.createdAt);
            }
            const year = date.getFullYear().toString();
            yearMatch = year.includes(q);
          }
          
          return authorMatch || descMatch || fullWorkMatch || yearMatch;
        });
      }

      if (lang !== 'English' && filteredPosts.length > 0) {
        // Check if we have an instant translation cache for this exact count of feeds
        const cacheKey = `feed_${lang}_${filteredPosts.length}`;
        try {
          const cached = localStorage.getItem(`trans_cache_${cacheKey}`);
          if (cached) {
            setTranslatedPosts(JSON.parse(cached));
            return;
          }
        } catch (e) {
          console.warn("Cached translation parse error:", e);
        }

        // Show unfiltered / original fallback posts immediately so there is 0ms waiting
        setTranslatedPosts(filteredPosts);

        try {
          const translated = await translateFeed(filteredPosts, lang);
          setTranslatedPosts(translated);
        } catch (error) {
          console.error("Async translation failed, keeping untranslated posts:", error);
          setTranslatedPosts(filteredPosts);
        }
      } else {
        setTranslatedPosts(filteredPosts);
      }
    };

    processPosts();
  }, [posts, searchQuery, lang]);

  const handleReaction = async (postId: string, type: string) => {
    if (!user) return;
    const reactionDoc = doc(db, `posts/${postId}/Reaction/${user.uid}`);
    const postRef = doc(db, 'posts', postId);
    
    const oldType = userReactions[postId];

    const reactionData = {
      userId: user.uid,
      userName: profile?.displayName || user.displayName || 'Legacy Reader',
      userPhotoURL: profile?.photoURL || user.photoURL || '',
      type,
      createdAt: serverTimestamp()
    };

    try {
      if (oldType === type) {
        // Remove reaction
        await deleteDoc(reactionDoc);
        await updateDoc(postRef, { 
          likesCount: increment(-1),
          [`reactionCounts.${type}`]: increment(-1)
        });
      } else if (oldType) {
        // Change reaction
        await setDoc(reactionDoc, reactionData);
        await updateDoc(postRef, {
          [`reactionCounts.${oldType}`]: increment(-1),
          [`reactionCounts.${type}`]: increment(1)
        });
      } else {
        // New reaction
        await setDoc(reactionDoc, reactionData);
        await updateDoc(postRef, { 
          likesCount: increment(1),
          [`reactionCounts.${type}`]: increment(1)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${postId}/Reaction/${user.uid}`);
    }
    setActiveReactionMenu(null);
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
         showToast('Signal boost removed.', 'info');
      } else {
         await setDoc(likeRef, { createdAt: serverTimestamp() });
         await updateDoc(commentRef, { likesCount: increment(1) });
         setUserCommentLikes(prev => {
            const next = new Set(prev);
            next.add(commentId);
            return next;
         });
         showToast('Discussion signal boosted!', 'success');
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `posts/${postId}/comments/${commentId}/likes/${user.uid}`);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim() || !user) return;
    
    const commentData: any = {
      authorId: user.uid,
      authorName: profile?.displayName || 'Legacy Reader',
      text: newComment,
      createdAt: serverTimestamp(),
      parentCommentId: replyTo?.id || null,
      replyToUser: replyTo?.user || null,
      likesCount: 0
    };

    const path = `posts/${postId}/comments`;
    try {
      await addDoc(collection(db, path), commentData);

      // Update the comments count on the post
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentsCount: increment(1)
      });

      // If it's a reply, update the parent comment's commentsCount
      if (replyTo) {
        const parentCommentRef = doc(db, `posts/${postId}/comments`, replyTo.id);
        await updateDoc(parentCommentRef, {
          commentsCount: increment(1)
        });
      }

      setNewComment('');
      setReplyTo(null);
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, path);
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

  const handleFollow = async (authorId: string, authorName: string) => {
    if (!user) {
      showToast('Login to follow authors', 'info');
      return;
    }

    const followRef = doc(db, `users/${user.uid}/following`, authorId);
    const followerRef = doc(db, `users/${authorId}/followers`, user.uid);
    const userRef = doc(db, 'users', user.uid);
    const authorRef = doc(db, 'users', authorId);

    const isFollowing = following.has(authorId);

    try {
      if (isFollowing) {
        // Unfollow
        await deleteDoc(followRef);
        await deleteDoc(followerRef);
        
        // Update counts on both documents
        await updateDoc(userRef, { followingCount: increment(-1) });
        await updateDoc(authorRef, { followersCount: increment(-1) });
        
        setFollowing(prev => {
          const next = new Set(prev);
          next.delete(authorId);
          return next;
        });
        showToast(`${ui.unfollowedMsg} @${authorName}`, 'info');
      } else {
        // Double check author exists and get their fresh name if possible
        const authorSnap = await getDoc(authorRef);
        if (!authorSnap.exists()) {
          showToast('This profile is no longer active.', 'error');
          return;
        }

        // Follow
        const followData = {
          followerId: user.uid,
          followedId: authorId,
          createdAt: serverTimestamp(),
          followerName: profile?.displayName || user.displayName || 'Legacy Friend',
          followedName: authorName
        };
        await setDoc(followRef, followData);
        await setDoc(followerRef, followData);
        
        // Update counts on both documents
        await updateDoc(userRef, { followingCount: increment(1) });
        await updateDoc(authorRef, { followersCount: increment(1) });
        
        setFollowing(prev => {
          const next = new Set(prev);
          next.add(authorId);
          return next;
        });
        showToast(`${ui.followingMsg} @${authorName}`, 'success');
      }
    } catch (error: any) {
      console.error("Follow error:", error);
      if (error.code === 'unavailable' || error.code === 'network-request-failed') {
        showToast(ui.dbError, 'error');
      } else {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/following`);
      }
    }
  };

  return (
    <div className="h-full w-full snap-y-mandatory overflow-y-scroll no-scrollbar relative bg-black">
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
      {/* Overlay removed, isTranslating state deleted. */}


      {isLoading ? (
        <>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </>
      ) : translatedPosts.length === 0 ? (
        <div className="h-full w-full flex flex-col items-center justify-center space-y-4 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 opacity-20">
            <Sparkles size={32} />
          </div>
          <h3 className="text-xl font-serif italic text-white/40">{ui.noDataTransmission}</h3>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-600">{ui.noMatchingTransmission}</p>
        </div>
      ) : (
        translatedPosts.map((post) => (
        <div 
          key={post.id} 
          className="h-full w-full snap-start relative flex flex-col items-center justify-center bg-gradient-to-br transition-all duration-700"
        >
          <div className={cn("absolute inset-0 bg-gradient-to-b opacity-40", post.color)} />
          
          {/* Interaction Bar */}
          <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10" onMouseLeave={() => setActiveReactionMenu(null)}>
            <div className="relative">
              <AnimatePresence>
                {activeReactionMenu === post.id && (
                    <motion.div 
                    initial={{ opacity: 0, x: 20, scale: 0.5, originX: 1, originY: 1 }}
                    animate={{ opacity: 1, x: -70, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.5 }}
                    className="absolute bottom-0 right-full mr-4 bg-zinc-900 border border-white/10 rounded-full p-2 flex gap-1 shadow-[0_10px_40px_-15px_rgba(0,0,0,1)] z-[100]"
                  >
                    {REACTIONS.map((reac, idx) => (
                      <motion.button
                        key={reac.type}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.4, y: -8 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReaction(post.id, reac.type)}
                        className="w-10 h-10 flex items-center justify-center text-3xl transition-transform relative group/emoji"
                      >
                        <span className="drop-shadow-md">{reac.icon}</span>
                        <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full opacity-0 group-hover/emoji:opacity-100 transition-all duration-200 pointer-events-none border border-white/10 whitespace-nowrap font-bold shadow-xl">
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
                  "w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 relative",
                  userReactions[post.id] 
                    ? "bg-white/10 border-white/40 ring-4 ring-white/5 scale-110" 
                    : "bg-gray-800/80 border-white/20 group-hover:scale-110 group-hover:border-white/40"
                )}>
                  {userReactions[post.id] ? (
                    <motion.span 
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="text-2xl"
                    >
                      {REACTIONS.find(r => r.type === userReactions[post.id])?.icon}
                    </motion.span>
                  ) : (
                    <ThumbsUp 
                      size={24} 
                      className="text-white fill-current opacity-60 group-hover:opacity-100 group-hover:text-blue-500 transition-all duration-300" 
                    />
                  )}

                  {/* Facebook-style reaction summary overlay */}
                  {post.likesCount > 0 && post.reactionCounts && (
                    <div className="absolute -top-1 -right-1 flex -space-x-1">
                      {Object.entries(post.reactionCounts)
                        .filter(([_, count]: any) => count > 0)
                        .sort(([_, a]: any, [__, b]: any) => b - a)
                        .slice(0, 3)
                        .map(([type], idx) => (
                          <div 
                            key={type} 
                            className="w-5 h-5 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-[10px] shadow-lg"
                            style={{ zIndex: 10 - idx }}
                          >
                            {REACTIONS.find(r => r.type === type)?.icon}
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-colors duration-300",
                  userReactions[post.id] 
                    ? REACTIONS.find(r => r.type === userReactions[post.id])?.color 
                    : "text-white"
                )}>
                  {userReactions[post.id] ? REACTIONS.find(r => r.type === userReactions[post.id])?.label : ui.likeLabel} {post.likesCount || 0}
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
              <span className="text-xs font-bold">{post.commentsCount || 0}</span>
            </button>

            <button 
              onClick={() => handleShare(post)}
              className="flex flex-col items-center gap-1 group focus:outline-none"
            >
              <div className="w-12 h-12 bg-gray-800/80 rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform hover:bg-white/10">
                <Share2 size={24} className="text-white group-hover:text-cyan-400" />
              </div>
              <span className="text-xs font-bold">{ui.shareLabel}</span>
            </button>
            <button 
              onClick={() => handleReadAloud(post.fullWork || post.desc || '')}
              className="flex flex-col items-center gap-1 group focus:outline-none"
            >
              <div className="w-12 h-12 bg-gray-800/80 rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform hover:bg-white/10">
                {isReading ? <Square size={20} className="text-white fill-white" /> : <Volume2 size={20} className="text-white" />}
              </div>
              <span className="text-xs font-bold">{isReading ? 'Stop' : 'Listen'}</span>
            </button>

            {canDeletePost(post) && (
              <button 
                onClick={(e) => handleDeletePost(post.id, e)}
                className="flex flex-col items-center gap-1 group focus:outline-none"
                title="Delete work"
              >
                <div className="w-12 h-12 bg-red-950/80 rounded-full flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform hover:bg-rose-500 hover:text-white text-rose-500 transition-all">
                  <Trash2 size={20} />
                </div>
                <span className="text-xs font-bold text-red-400">Delete</span>
              </button>
            )}
          </div>

          {/* Content Info */}
          <div className="absolute left-4 bottom-20 right-20 z-10 space-y-3">
            <div className="flex items-center gap-3">
              <h3 
                className="font-bold text-lg cursor-pointer hover:text-rose-500 transition-colors"
                onClick={() => navigate(`/profile/${post.authorId || post.user}`)}
              >
                {post.user}
              </h3>
              <button 
                onClick={() => handleFollow(post.authorId || post.user, post.user)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] transition-all duration-300",
                  following.has(post.authorId || post.user) 
                    ? "bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-md" 
                    : "bg-rose-600 text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500 active:scale-95 border border-rose-400/20"
                )}
              >
                {following.has(post.authorId || post.user) ? (
                  <>
                    <UserCheck size={12} className="text-rose-400" />
                    {ui.followingActive}
                  </>
                ) : (
                  <>
                    <UserPlus size={12} />
                    {ui.followLabel}
                  </>
                )}
              </button>
            </div>
            <p className="text-sm font-bold text-cyan-400">{post.tags}</p>
            
            {/* Facebook-style Reactor Summary Bar */}
            {post.likesCount > 0 && (
              <div 
                onClick={(e) => { e.stopPropagation(); setShowReactorsModal(post.id); }}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full w-fit cursor-pointer transition-all border border-white/5 shadow-sm active:scale-95 duration-200"
              >
                <div className="flex -space-x-1 hover:space-x-1 transition-all">
                  {getReactionEmojis(post).map((emoji, idx) => (
                    <span key={idx} className="text-xs transition-transform hover:scale-125" style={{ zIndex: 10 - idx }}>{emoji}</span>
                  ))}
                </div>
                <span className="text-[11px] font-bold text-gray-300">
                  {getReactionsSummaryText(post)}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-xs text-gray-300 bg-black/40 px-3 py-1 rounded-full w-fit">
              <Music2 size={12} className="animate-pulse" />
              <span>{post.music}</span>
            </div>
          </div>

          {/* The Content Stage */}
          <div 
            onClick={() => setIsFullWorkOpen(post.id)}
            className="w-full max-w-[85%] bg-white/5 rounded-[2.5rem] border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden relative group cursor-pointer"
          >
             {post.genre === 'Moment' && (post.images?.length > 0 || post.coverImage) ? (
               <div 
                 className={cn(
                   "grid gap-1 w-full h-full aspect-[9/16]",
                   post.images?.length === 1 ? "grid-cols-1" :
                   post.images?.length === 2 ? "grid-cols-2" :
                   "grid-cols-2 grid-rows-2"
                 )}
               >
                 {(post.images || [post.coverImage]).slice(0, 4).map((img: string, idx: number) => (
                   <div key={idx} className="relative overflow-hidden w-full h-full">
                     <img 
                       src={img} 
                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" 
                       alt="Moment" 
                       referrerPolicy="no-referrer"
                     />
                     {idx === 3 && post.images.length > 4 && (
                       <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center text-white">
                         <span className="text-xs font-bold">+{post.images.length - 3}</span>
                       </div>
                     )}
                   </div>
                 ))}
                 <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
               </div>
             ) : post.genre === 'Biography' && post.coverImage ? (
               <div className="relative w-full h-full aspect-[9/16] overflow-hidden">
                 <img 
                   src={post.coverImage} 
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" 
                   alt="Biography Cover" 
                   referrerPolicy="no-referrer"
                 />
                 <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
               </div>
             ) : post.genre === 'Ad Campaign' && (post.mediaItems?.length > 0 || post.coverImage) ? (
               <div className="relative w-full h-full aspect-[9/16] overflow-hidden">
                 {post.mediaItems?.[0]?.type === 'video' ? (
                   <video 
                     src={post.mediaItems[0].url} 
                     className="w-full h-full object-cover" 
                     autoPlay loop muted 
                   />
                 ) : (
                   <img 
                     src={post.mediaItems?.[0]?.url || post.coverImage} 
                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" 
                     alt="Campaign Cover" 
                     referrerPolicy="no-referrer"
                   />
                 )}
                 <div className="absolute top-4 right-4 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg border border-white/20">
                   AD {post.mediaItems?.length > 1 ? `(${post.mediaItems.length})` : ''}
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center p-8 aspect-[9/16] w-full text-center space-y-6">
                  <div className="w-16 h-1 bg-white/20 rounded-full" />
                  <div className="space-y-4">
                    <h4 className="text-4xl font-serif italic opacity-40 group-hover:opacity-100 transition-opacity whitespace-pre-wrap px-4">
                      {post.desc || 'Creative Masterpiece'}
                    </h4>
                    <p className="text-[10px] font-bold text-cyan-500/50 uppercase tracking-[0.3em]">{post.genre || 'Prose'}</p>
                  </div>
               </div>
             )}
          </div>
        </div>
      ))
    )}

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
                    <div className="space-y-4 border-b border-white/5 pb-8">
                      <h2 className="text-4xl font-serif italic text-white">
                        {post.desc || `${post.authorName || 'Writer Anonymous'}'s Work`}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4">
                        <p className="text-rose-500 uppercase tracking-[0.3em] text-[10px] font-black">{ui.fullWorkTitle}</p>
                        <button
                          onClick={() => handleReadAloud(post.fullWork || '')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-full transition-colors active:scale-95 border border-rose-500/20"
                          title="Read aloud"
                        >
                          {isReading ? <Square size={14} className="fill-current" /> : <Volume2 size={14} />}
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {isReading ? 'Stop' : 'Listen'}
                          </span>
                        </button>

                        {canDeletePost(post) && (
                          <button
                            onClick={(e) => handleDeletePost(post.id, e)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all active:scale-95 border border-red-500/20 shadow-md"
                            title="Delete Work"
                          >
                            <Trash2 size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              Delete Work
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {post.genre === 'Biography' && post.coverImage && (
                      <div className="w-full h-64 rounded-3xl overflow-hidden border border-white/10 relative group/cover">
                        <img 
                          src={post.coverImage} 
                          alt="Biography Cover" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 flex flex-col justify-end">
                          <span className="text-[10px] uppercase font-black tracking-[0.25em] text-amber-400">Published Biography Portrait</span>
                          <h3 className="text-2xl font-serif italic text-white mt-1">{post.desc}</h3>
                        </div>
                      </div>
                    )}
                    
                    {post.genre === 'Ad Campaign' && post.mediaItems && post.mediaItems.length > 0 && (
                      <div className="space-y-6 pt-6 border-t border-white/5">
                        <h4 className="text-xs font-bold text-gray-550 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Megaphone size={14} className="text-purple-500" />
                          Campaign Media Sequence
                        </h4>
                        <div className="space-y-6">
                          {post.mediaItems.map((item: any, i: number) => (
                            <motion.div 
                              key={i}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative bg-black/20"
                            >
                              {item.type === 'image' ? (
                                <img 
                                  src={item.url} 
                                  alt={`Campaign Image ${i + 1}`} 
                                  className="w-full h-auto max-h-[600px] object-contain" 
                                  referrerPolicy="no-referrer" 
                                />
                              ) : (
                                <video 
                                  src={item.url} 
                                  controls 
                                  className="w-full h-auto max-h-[600px]" 
                                />
                              )}
                              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white border border-white/10 uppercase tracking-widest">
                                Step {i + 1}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Academic Research Assets Gallery */}
                    {post.genre === 'Academic' && post.researchAssets && post.researchAssets.length > 0 && (
                      <div className="space-y-4 pt-6 border-t border-white/5">
                        <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] flex items-center gap-2">
                          <Paperclip size={14} />
                          Research Media & Support Assets
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {post.researchAssets.map((asset: any, i: number) => (
                            <motion.div 
                              key={i}
                              whileHover={{ scale: 1.02 }}
                              className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black/40 relative group/asset"
                            >
                              {asset.type === 'image' ? (
                                <img 
                                  src={asset.url} 
                                  alt={asset.name} 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover/asset:scale-110" 
                                  referrerPolicy="no-referrer" 
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center gap-2">
                                  <div className="p-3 bg-cyan-500/10 rounded-full">
                                    <BookOpen size={20} className="text-cyan-400" />
                                  </div>
                                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter line-clamp-2 break-all">{asset.name}</span>
                                </div>
                              )}
                              <a 
                                href={asset.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover/asset:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]"
                              >
                                <span className="bg-white/10 border border-white/20 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                                  Open {asset.type === 'image' ? 'Image' : 'File'}
                                </span>
                              </a>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dedicated Objectives Display for Academic Posts */}
                    {post.genre === 'Academic' && post.mainObjective && (
                      <div className="space-y-6 pt-6 border-t border-white/5">
                         <div className="bg-cyan-500/10 border border-cyan-500/20 p-6 rounded-[2rem] space-y-3">
                            <h4 className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.3em] flex items-center gap-2">
                               <Sparkles size={12} />
                               Main Research Objective
                            </h4>
                            <p className="text-xl font-serif italic text-white leading-relaxed">{post.mainObjective}</p>
                         </div>

                         {post.specificObjectives && post.specificObjectives.length > 0 && (
                            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-4">
                               <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                  <Info size={12} />
                                  Specific Objectives
                               </h4>
                               <div className="grid grid-cols-1 gap-3">
                                  {post.specificObjectives.map((obj: string, idx: number) => (
                                     <div key={idx} className="flex gap-4 items-start bg-black/20 p-3 rounded-2xl border border-white/5">
                                        <span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">{idx + 1}</span>
                                        <p className="text-xs text-gray-300 leading-relaxed font-serif italic">{obj}</p>
                                     </div>
                                  ))}
                               </div>
                            </div>
                         )}
                      </div>
                    )}

                    <div className="prose prose-invert max-w-none text-gray-300">
                      <ReactMarkdown>
                        {post.fullWork}
                      </ReactMarkdown>
                    </div>

                    {post.manuscriptURL && (
                      <div className="mt-6 p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-3xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-cyan-500/10 text-cyan-400 p-2.5 rounded-xl">
                            <BookOpen size={18} />
                          </div>
                          <div className="text-left">
                            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Scientific Manuscript File</h5>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">Download preprint or publish attachment</p>
                          </div>
                        </div>
                        <a 
                          href={post.manuscriptURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
                        >
                          <Paperclip size={12} />
                          Download
                        </a>
                      </div>
                    )}

                    {post.genre === 'Biography' && post.images && post.images.length > 0 && (
                      <div className="space-y-4 pt-6 border-t border-white/5">
                        <h4 className="text-xs font-bold text-gray-550 uppercase tracking-[0.2em]">Memorable Life Moments</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {post.images.map((img: string, i: number) => (
                            <motion.div 
                              key={i}
                              whileHover={{ scale: 1.02 }}
                              className="aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 shadow-xl"
                            >
                              <img src={img} alt={`Memory ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {post.genre === 'Biography' && post.tributes && post.tributes.length > 0 && (
                      <div className="space-y-6 pt-6 border-t border-white/5">
                        <h4 className="text-xs font-bold text-gray-550 uppercase tracking-[0.2em]">Biography Voices & Tributes</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {post.tributes.map((tribute: any, tIdx: number) => (
                            <div key={tIdx} className="bg-white/5 p-5 rounded-3xl border border-white/10 flex flex-col justify-between space-y-4">
                              <div className="space-y-2">
                                <h5 className="font-serif italic text-amber-500 text-base">{tribute.title || 'A Friend\'s Voice'}</h5>
                                <p className="text-xs text-gray-300 leading-relaxed italic">{tribute.content}</p>
                              </div>
                              {tribute.contributors && tribute.contributors.length > 0 && (
                                <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2">
                                  {tribute.contributors.map((contrib: any, cIdx: number) => (
                                    <div key={cIdx} className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-white/5">
                                      {contrib.image ? (
                                        <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                                          <img src={contrib.image} alt={contrib.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        </div>
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                                          {contrib.name?.[0]?.toUpperCase() || 'C'}
                                        </div>
                                      )}
                                      <span className="text-[10px] text-gray-400 font-bold">{contrib.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {post.genre === 'Moment' && post.images && post.images.length > 0 && (
                      <div className="space-y-4 pt-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Capture Gallery</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {post.images.map((img: string, i: number) => (
                            <motion.div 
                              key={i}
                              whileHover={{ scale: 1.02 }}
                              className="rounded-2xl overflow-hidden border border-white/10 shadow-xl"
                            >
                              <img src={img} alt={`Moment ${i}`} className="w-full h-auto" referrerPolicy="no-referrer" />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {post.characterCards && post.characterCards.length > 0 && (
                      <div className="space-y-6 pt-8 border-t border-white/5">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Character Dossiers</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {post.characterCards.map((char: any, i: number) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex gap-4">
                              {char.image && (
                                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                                  <img src={char.image} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h5 className="font-bold text-cyan-400 text-sm">{char.name}</h5>
                                <p className="text-[9px] text-rose-400 uppercase font-bold tracking-wider mb-1">{char.role}</p>
                                <p className="text-[11px] text-gray-400 leading-tight">{char.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
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
                {isCommentsLoading ? (
                  <CommentSkeleton />
                ) : (comments[selectedPostId] || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20">
                    <MessageSquareIcon size={48} />
                    <p className="mt-4 text-xs uppercase tracking-widest font-black">{ui.noDiscussion}</p>
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
                              onClick={() => handleCommentLike(selectedPostId!, comment.id)}
                              className={cn("text-[11px] font-bold transition-colors", userCommentLikes.has(comment.id) ? "text-cyan-400 font-extrabold" : "text-gray-500 hover:text-white")}
                            >
                              {userCommentLikes.has(comment.id) ? 'Liked' : ui.likeLabel}
                            </button>
                            <button 
                              onClick={() => setReplyTo({ id: comment.id, user: comment.authorName })}
                              className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors"
                            >
                              {ui.replyLabel} {comment.commentsCount ? `(${comment.commentsCount})` : ''}
                            </button>
                            <span className="text-[11px] text-gray-600 font-medium">{formatTime(comment.createdAt)}</span>
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
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <p className="text-[11px] font-bold text-gray-200">@{reply.authorName}</p>
                                    {reply.replyToUser && (
                                      <>
                                        <span className="text-[9px] text-gray-500 uppercase tracking-tighter">rep to</span>
                                        <span className="text-[10px] font-bold text-rose-400">@{reply.replyToUser}</span>
                                      </>
                                    )}
                                  </div>
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
                                    onClick={() => handleCommentLike(selectedPostId!, reply.id)}
                                    className={cn("text-[10px] font-bold transition-colors", userCommentLikes.has(reply.id) ? "text-cyan-400 font-extrabold" : "text-gray-600 hover:text-white")}
                                  >
                                    {userCommentLikes.has(reply.id) ? 'Liked' : 'Like'}
                                  </button>
                                  <button 
                                    onClick={() => setReplyTo({ id: reply.id, user: reply.authorName })}
                                    className="text-[10px] font-bold text-gray-600 hover:text-white transition-colors"
                                  >
                                    Reply {reply.commentsCount ? `(${reply.commentsCount})` : ''}
                                  </button>
                                  <span className="text-[10px] text-gray-700 font-medium">{formatTime(reply.createdAt)}</span>
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
                         <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{ui.repliedTo} @{replyTo.user}</p>
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

      {/* Facebook-style Reactors list Modal */}
      <AnimatePresence>
        {showReactorsModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReactorsModal(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-sm overflow-hidden p-6 shadow-2xl z-[170]"
            >
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👍</span>
                  <h3 className="text-base font-bold uppercase tracking-wider text-white font-serif italic">Reactions</h3>
                </div>
                <button 
                  onClick={() => setShowReactorsModal(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="max-h-64 overflow-y-auto no-scrollbar space-y-2">
                {activeReactors.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-6 uppercase tracking-wider font-bold">No reactions recorded</p>
                ) : (
                  activeReactors.map((reactor, idx) => {
                    const reacObj = REACTIONS.find(r => r.type === reactor.type);
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <img 
                            src={reactor.userPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reactor.userName || 'user'}`}
                            alt={reactor.userName}
                            className="w-8 h-8 rounded-full border border-white/10 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-sm font-bold text-gray-200">@{reactor.userName || 'legacy_user'}</span>
                        </div>
                        <span className="text-2xl" title={reacObj?.label}>{reacObj?.icon || '👍'}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
