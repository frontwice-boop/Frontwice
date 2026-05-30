import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowLeft, Share2, BookOpen, UserCircle, Calendar, Type } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';

export default function PostView({ lang }: { lang: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');

  const fontSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'posts', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() });
        } else {
          showToast('Work not found', 'error');
          navigate('/');
        }
      } catch (err) {
        console.error("Error fetching post:", err);
        showToast('Failed to load transmission', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, navigate, showToast]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: post?.title || post?.desc || 'Creative Work',
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    let date: Date;
    if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp && typeof timestamp.seconds === 'number') {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Sparkles size={32} className="text-rose-500" />
        </motion.div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-[#030305] text-white selection:bg-rose-500 pb-24 overflow-y-auto no-scrollbar">
      {/* Background Ambience */}
      <div className={cn("fixed inset-0 bg-gradient-to-b opacity-20 pointer-events-none", post.color || 'from-zinc-900 to-black')} />
      
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white shrink-0"
        >
          <ArrowLeft size={20} />
        </button>

        <span className="hidden md:block text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 truncate px-2">
          Transmission Archive
        </span>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Font Size Toggle */}
          <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
            <Type size={14} className="text-gray-500 ml-2 mr-1 hidden xs:block" />
            <div className="flex gap-1">
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={cn(
                    "px-2 sm:px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                    fontSize === size ? "bg-rose-500 text-white" : "text-gray-500 hover:text-white"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleShare}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-rose-500 shrink-0"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8 relative z-10">
        {/* Title & Author Info */}
        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-serif italic text-white leading-tight"
          >
            {post.desc || post.title || 'Untitled Work'}
          </motion.h1>
          
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <div className="flex items-center gap-2">
              <UserCircle size={14} className="text-rose-500" />
              <span>{post.authorName || 'Legacy Builder'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-cyan-500" />
              <span>{formatDate(post.createdAt)}</span>
            </div>
            {post.genre && (
              <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {post.genre}
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {post.tags && (
          <div className="flex flex-wrap gap-2">
            {post.tags.split(' ').map((tag: string) => (
              <span key={tag} className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-400/5 px-3 py-1 rounded-lg border border-cyan-400/10">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative group"
        >
          <div className="absolute top-4 right-6 scale-75 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen size={48} className="text-white" />
          </div>

          <div className={cn(
            "markdown-body prose prose-invert prose-rose max-w-none prose-p:leading-relaxed prose-p:text-gray-300 prose-headings:font-serif prose-headings:italic font-serif",
            fontSizeClasses[fontSize]
          )}>
            <ReactMarkdown>{post.fullWork || ''}</ReactMarkdown>
          </div>
        </motion.div>

        {/* Character Dossiers / Research Concepts */}
        {(post.characterCards || post.researchConcepts) && (
          <div className="space-y-6 pt-8 border-t border-white/5">
            <div className="flex items-center gap-2 px-1">
              <Sparkles size={16} className="text-cyan-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                {post.genre === 'Academic' ? 'Research Concepts' : 'Character Dossiers'}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(post.characterCards || post.researchConcepts || []).map((char: any, i: number) => (
                <div key={i} className="bg-zinc-900/60 p-6 rounded-3xl border border-white/5 border-l-rose-500/40 border-l-2">
                  <h3 className="font-serif italic text-white text-xl mb-1">{char.name}</h3>
                  <p className="text-[9px] text-cyan-500 font-black uppercase tracking-widest mb-3">{char.role}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{char.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Citations for Academic */}
        {post.citations && post.citations.length > 0 && (
          <div className="space-y-4 pt-8 border-t border-white/5">
            <div className="flex items-center gap-2 px-1">
              <BookOpen size={16} className="text-rose-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Citations & References</h2>
            </div>
            <div className="space-y-3">
              {post.citations.map((cite: string, i: number) => (
                <div key={i} className="flex gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 text-xs italic text-gray-300 font-serif leading-relaxed">
                  <span className="text-rose-500 font-mono font-bold">[{i + 1}]</span>
                  <p>{cite}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Area */}
        <div className="pt-12 text-center pb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-800">Legacy Protocol Transmission</p>
        </div>
      </div>
    </div>
  );
}
