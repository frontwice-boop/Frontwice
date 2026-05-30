import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Calendar, Users, Sparkles, Send, CheckCircle2, Clock, Globe, Camera, Video, X, Upload, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { generateAdCampaign } from '../../services/ai';
import { generateAdKeywords } from '../../services/geminiService';

const DURATIONS = [
  { value: 7, label: '7 Days', desc: 'Short Burst' },
  { value: 30, label: '30 Days', desc: 'Standard Growth' },
  { value: 60, label: '60 Days', desc: 'Extended Reach' },
  { value: 90, label: '90 Days', desc: 'Maximum Impact' }
];

import { translateUI } from '../../services/translationService';

const DEFAULT_LABELS = {
  langLabel: 'Campaign Language',
  headlineLabel: 'Ad Headline',
  headlinePlaceholder: 'Unlock the Hidden Chapters of History...',
  audienceLabel: 'Target Audience',
  audiencePlaceholder: 'Historical fiction enthusiasts, students aged 18-35...',
  durationLabel: 'Campaign Duration',
  mediaLabel: 'Promotional Media',
  mediaHint: 'Upload video or high-res cover art',
  generateBtn: 'AI Ad Generation',
  launchBtn: 'Launch Campaign',
  launchingBtn: 'Launching Campaign...',
  launchedTitle: 'Campaign Launched!',
  launchedDesc: 'Your advertisement is now live and reaching new audiences.',
  expiresLabel: 'Expires In',
  daysRemaining: 'Days Remaining',
  aiSyncing: 'AI Localizing Ad Suite...',
  launchWithDuration: 'Launch Campaign for',
  campaignFooter: 'Campaigns are uniquely optimized for the Legacy platform feed. Results and reach may vary based on genre selection.'
};

const AD_LANGUAGES = [
  'English', 'French', 'Spanish', 'German', 'Italian', 
  'Portuguese', 'Dutch', 'Russian', 'Chinese (Mandarin)', 'Chinese (Cantonese)',
  'Japanese', 'Korean', 'Arabic', 'Hindi', 'Bengali', 
  'Punjabi', 'Tamil', 'Telugu', 'Turkish', 'Vietnamese',
  'Thai', 'Greek', 'Hebrew', 'Swahili', 'Amharic',
  'Yoruba', 'Hausa', 'Indonesian', 'Polish', 'Ukrainian',
  'Romanian', 'Hungarian', 'Czech', 'Swedish', 'Norwegian',
  'Danish', 'Finnish', 'Slovak', 'Bulgarian', 'Serbian',
  'Croatian', 'Slovenian', 'Lithuanian', 'Latvian', 'Estonian',
  'Icelandic', 'Persian', 'Urdu', 'Marathi', 'Gujarati',
  'Malayalam', 'Kannada', 'Burmese', 'Khmer', 'Lao',
  'Malay', 'Tagalog', 'Zulu', 'Xhosa', 'Afrikaans',
  'Nepali', 'Sinhalese', 'Mongolian', 'Kazakh', 'Uzbek',
  'Azerbaijani', 'Georgian', 'Armenian', 'Pashto', 'Kurdish'
];

import { useToast } from '../../context/ToastContext';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';
import { useUser } from '../../context/UserContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AdCampaignManager({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  const { showToast } = useToast();
  const { user, profile } = useUser();
  const [adTitle, setAdTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [duration, setDuration] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [adCopy, setAdCopy] = useState('');
  const [keywords, setKeywords] = useState<{ keywords: string[], hashtags: string[] } | null>(null);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [mediaItems, setMediaItems] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const applyTranslation = async () => {
      if (lang !== 'English' && AD_LANGUAGES.includes(lang)) {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaItems(prev => [...prev, { url: reader.result as string, type }]);
        };
        reader.readAsDataURL(file);
      });
      // Reset input value so selecting the same file again triggers change event
      e.target.value = '';
    }
  };

  const removeMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const moveMedia = (index: number, direction: 'up' | 'down') => {
    const newItems = [...mediaItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newItems.length) {
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      setMediaItems(newItems);
    }
  };

  const handleGenerateAd = async () => {
    if (!adTitle) return showToast('Enter an Ad headline first', 'warning');
    setIsGenerating(true);
    try {
      const generatedCopy = await generateAdCampaign({
        title: adTitle,
        audience: targetAudience,
        language: lang
      });
      setAdCopy(generatedCopy);
      
      // Auto-generate keywords too for "Maximum Impact"
      handleGenerateKeywords();
      
      showToast('Ad copy generated!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to generate ad copy', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateKeywords = async () => {
    if (!adTitle) return;
    setIsGeneratingKeywords(true);
    try {
      const result = await generateAdKeywords(adTitle, targetAudience);
      setKeywords(result);
    } catch (error) {
       console.error(error);
    } finally {
      setIsGeneratingKeywords(false);
    }
  };

  const handleLaunch = async () => {
    if (!user) {
      showToast('You must be logged in to launch a campaign.', 'error');
      return;
    }

    setIsLaunching(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: profile?.displayName || 'Legacy Builder',
        desc: adTitle,
        fullWork: adCopy || 'Ad campaign launched successfully.',
        tags: '#campaign #ad',
        genre: 'Ad Campaign',
        music: 'Professional Ambience',
        likesCount: 0,
        commentsCount: 0,
        color: 'from-purple-600 to-indigo-600',
        coverImage: mediaItems[0]?.url || null,
        mediaItems: mediaItems,
        duration: duration,
        createdAt: serverTimestamp()
      });

      setIsLaunched(true);
      showToast('Campaign launched successfully!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setIsLaunching(false);
    }
  };

  if (isLaunched) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-green-500/10 border border-green-500/20 rounded-[2rem] p-10 text-center space-y-6"
      >
        <div className="w-20 h-20 bg-green-500 rounded-full mx-auto flex items-center justify-center text-white shadow-lg shadow-green-500/20">
          <CheckCircle2 size={40} />
        </div>
        <div>
          <h2 className="text-2xl font-serif italic text-white">{labels.launchedTitle}</h2>
          <p className="text-gray-400 mt-2">{labels.launchedDesc}</p>
        </div>
        <div className="flex items-center justify-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{labels.expiresLabel}</p>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={14} className="text-green-500" />
              {duration} {labels.daysRemaining}
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            setIsLaunched(false);
            setAdCopy('');
            setMediaItems([]);
            setAdTitle('');
          }}
          className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
        >
          Create Another Campaign
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
        <label className="block">
          <div className="flex items-center gap-2 mb-2 ml-1">
            <Globe size={14} className="text-rose-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{labels.langLabel}</span>
          </div>
          <select 
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/50 appearance-none uppercase tracking-widest font-bold"
          >
            {AD_LANGUAGES.map(lang => (
              <option key={lang} value={lang} className="bg-zinc-900">{lang}</option>
            ))}
          </select>
        </label>
        <p className="text-[10px] text-gray-600 italic px-2 leading-relaxed">
          AI will generate your ad copy in the selected language to better reach local readers.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block group">
          <div className="flex items-center gap-2 mb-2 ml-1">
            <Megaphone size={14} className="text-rose-500" />
            <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">{labels.headlineLabel}</span>
          </div>
          <input 
            type="text"
            value={adTitle}
            onChange={(e) => setAdTitle(e.target.value)}
            placeholder="The Legend of the Silent Mountain..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-serif italic text-lg text-rose-400 placeholder:text-gray-700"
          />
        </label>

        <label className="block">
           <div className="flex items-center gap-2 mb-2 ml-1">
            <Users size={14} className="text-cyan-500" />
            <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">{labels.audienceLabel}</span>
          </div>
          <input 
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="Fantasy lovers, Young Adults, Mystery seekers..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-sm"
          />
        </label>
      </div>

      {/* Media Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between ml-1">
          <div className="flex items-center gap-2">
            <Video size={14} className="text-emerald-500" />
            <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">{labels.mediaLabel}</span>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:text-emerald-400 flex items-center gap-1.5"
          >
            <Upload size={12} />
            Add Pictures/Videos
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {mediaItems.map((item, index) => (
              <motion.div 
                key={index}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="relative bg-white/5 rounded-3xl border border-white/10 overflow-hidden group flex gap-4 p-3"
              >
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-black/40 flex-shrink-0">
                  {item.type === 'image' ? (
                    <img src={item.url} className="w-full h-full object-cover" alt={`Media ${index}`} />
                  ) : (
                    <video src={item.url} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Order: {index + 1}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 capitalize">{item.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => moveMedia(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 bg-white/5 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                      <Plus size={14} className="rotate-180" />
                    </button>
                    <button 
                      onClick={() => moveMedia(index, 'down')}
                      disabled={index === mediaItems.length - 1}
                      className="p-1.5 bg-white/5 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => removeMedia(index)}
                  className="p-2 text-gray-500 hover:text-rose-500 transition-colors self-center mr-2"
                >
                  <X size={18} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {mediaItems.length === 0 && (
            <div 
              className="aspect-video bg-white/5 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-gray-600 group hover:border-emerald-500/30 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex gap-2">
                <Camera size={24} />
                <Video size={24} />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold">Upload Campaign Media (Pictures/Videos)</p>
            </div>
          )}
        </div>
        <input 
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*"
          multiple
          onChange={handleFileUpload}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between ml-1">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-yellow-500" />
            <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Ad Copy (Text)</span>
          </div>
          <button 
            onClick={handleGenerateAd}
            disabled={isGenerating || !adTitle}
            className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:text-rose-400 disabled:opacity-30 flex items-center gap-1.5"
          >
            {isGenerating ? '...' : labels.generateBtn}
          </button>
        </div>
        <div className="relative group">
          <textarea 
            value={adCopy}
            onChange={(e) => setAdCopy(e.target.value)}
            placeholder="AI will craft the perfect reach-optimized story hooks here..."
            className="w-full h-40 bg-zinc-900/50 border border-white/10 rounded-3xl p-6 text-sm leading-relaxed text-gray-300 focus:outline-none focus:ring-1 focus:ring-rose-500/30 italic font-light"
          />
        </div>

        {keywords && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-cyan-500/5 border border-cyan-500/10 p-5 rounded-2xl space-y-3"
          >
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-cyan-500 mb-2">Optimized Keywords</p>
              <div className="flex flex-wrap gap-2">
                {keywords.keywords.map((k, i) => (
                  <span key={i} className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded-full border border-cyan-500/20">
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-2">Trending Hashtags</p>
              <div className="flex flex-wrap gap-2">
                {keywords.hashtags.map((h, i) => (
                  <span key={i} className="text-[10px] bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20 font-bold">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 ml-1">
          <Calendar size={14} className="text-purple-500" />
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">{labels.durationLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDuration(d.value)}
              className={cn(
                "p-4 rounded-2xl border transition-all text-left relative overflow-hidden group",
                duration === d.value 
                  ? "bg-purple-500/10 border-purple-500/50" 
                  : "bg-white/5 border-white/10 hover:border-purple-500/30"
              )}
            >
              <p className={cn(
                "text-sm font-bold",
                duration === d.value ? "text-white" : "text-gray-400"
              )}>{d.label}</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">{d.desc}</p>
              
              {duration === d.value && (
                <motion.div 
                  layoutId="duration-check"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 size={16} className="text-purple-500" />
                </motion.div>
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleLaunch}
        disabled={isLaunching || (!adCopy && mediaItems.length === 0) || !adTitle}
        className={cn(
          "w-full py-6 bg-white text-black rounded-[2rem] font-bold text-lg flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mt-8",
          (isLaunching || (!adCopy && mediaItems.length === 0) || !adTitle) && "opacity-50 grayscale"
        )}
      >
        {isLaunching ? (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <Send size={20} className="text-rose-500" />
          </motion.div>
        ) : (
          <>
            <Send size={20} className="text-rose-500" />
            {labels.launchWithDuration} {duration} Days
          </>
        )}
      </button>

      <p className="text-[10px] text-gray-600 text-center font-bold uppercase tracking-[0.2em] px-10 leading-relaxed">
        {labels.campaignFooter}
      </p>
    </div>
  );
}
