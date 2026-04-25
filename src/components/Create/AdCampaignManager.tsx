import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Calendar, Users, Sparkles, Send, CheckCircle2, Clock, Globe, Camera, Video, X, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';
import { generateAdCampaign } from '../../services/ai';

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

export default function AdCampaignManager({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  const { showToast } = useToast();
  const [adTitle, setAdTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [duration, setDuration] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [adCopy, setAdCopy] = useState('');
  const [media, setMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
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
    const file = e.target.files?.[0];
    if (file) {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const reader = new FileReader();
      reader.onloadend = () => {
        setMedia({ url: reader.result as string, type });
      };
      reader.readAsDataURL(file);
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
      showToast('Ad copy generated!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to generate ad copy', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsLaunching(false);
    setIsLaunched(true);
    showToast('Campaign launched successfully!', 'success');
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
            setMedia(null);
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

      <div className="space-y-4">
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
            Upload Media
          </button>
        </div>

        <div className="relative aspect-video bg-white/5 rounded-3xl border border-dashed border-white/10 flex items-center justify-center overflow-hidden group hover:border-emerald-500/30 transition-colors">
          {media ? (
            <>
              {media.type === 'image' ? (
                <img src={media.url} alt="Ad Visual" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <video src={media.url} className="w-full h-full object-cover" autoPlay loop muted />
              )}
              <button 
                onClick={() => setMedia(null)}
                className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-2 rounded-full text-white hover:bg-rose-500 transition-colors"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <div 
              className="flex flex-col items-center gap-3 text-gray-600 group-hover:text-emerald-500/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex gap-2">
                <Camera size={24} />
                <Video size={24} />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold">Upload Visual Content</p>
            </div>
          )}
        </div>
        <input 
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*"
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

      <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-white/5 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
            <Globe size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold">Reach Potential</h4>
            <p className="text-xs text-gray-500">Estimating reach across feed and library</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-600">
            <span>Minimum Reach</span>
            <span className="text-indigo-400">5,000+ Users</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '65%' }}
              className="h-full bg-indigo-500"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleLaunch}
        disabled={isLaunching || (!adCopy && !media) || !adTitle}
        className={cn(
          "w-full py-6 bg-white text-black rounded-[2rem] font-bold text-lg flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all",
          (isLaunching || (!adCopy && !media) || !adTitle) && "opacity-50 grayscale"
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
