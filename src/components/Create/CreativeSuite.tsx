import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trash2, Plus, Check, ChevronDown, X, Info, Camera, UserCircle, Globe } from 'lucide-react';
import { PROSE_GENRES, DRAMA_GENRES, POETRY_GENRES, LITERARY_DEVICES } from '../../constants';
import { cn } from '../../lib/utils';
import { generateCreativeWork } from '../../services/ai';
import { translateCreativeSuite } from '../../services/translationService';

const CREATIVE_LANGUAGES = [
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

type Tab = 'Prose' | 'Drama' | 'Poetry';

const DEFAULT_LABELS = {
  titleLabel: 'Title',
  genreLabel: 'Genre',
  devicesLabel: 'Literary Devices',
  promptLabel: 'AI Prompt / Setting',
  generateBtn: 'Generate Work',
  languageLabel: 'Work Language',
  placeholderTitle: 'Enter a captivating title...',
  placeholderPrompt: 'Give the AI more context or specific instructions...',
  dossiersLabel: 'Extracted Character Dossiers',
  publishBtn: 'Publish to Feed',
  langDesc: 'AI will generate your creative work and character dossiers in the chosen language.',
  genrePlaceholder: 'Choose a genre...',
  aiSynced: 'AI SYNCED',
  addPicture: 'Add Picture',
  publishedFeed: 'PUBLISHED TO YOUR FEED'
};

import { useToast } from '../../context/ToastContext';

import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';

export default function CreativeSuite({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  const { user, profile } = useUser();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('Prose');
  const [title, setTitle] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isGenreMenuOpen, setIsGenreMenuOpen] = useState(false);
  const [characterImages, setCharacterImages] = useState<Record<number, string>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeCharIdx, setActiveCharIdx] = useState<number | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const applyTranslation = async () => {
      if (lang !== 'English') {
        setIsTranslating(true);
        const translated = await translateCreativeSuite(DEFAULT_LABELS, lang);
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

  const genres = activeTab === 'Prose' ? PROSE_GENRES : activeTab === 'Drama' ? DRAMA_GENRES : POETRY_GENRES;

  const selectGenre = (genre: string) => {
    setSelectedGenre(genre === selectedGenre ? null : genre);
    setIsGenreMenuOpen(false);
  };

  const toggleDevice = (device: string) => {
    setSelectedDevices(prev => 
      prev.includes(device) ? prev.filter(d => d !== device) : [...prev, device]
    );
  };

  const handleGenerate = async () => {
    if (!title) return showToast('Please enter a title', 'error');
    setIsLoading(true);
    try {
      const data = await generateCreativeWork({
        type: activeTab,
        title,
        genres: selectedGenre ? [selectedGenre] : [],
        devices: selectedDevices,
        prompt,
        language: lang
      });
      setResult(data);
      showToast('Creative work generated successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to generate work. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCharPicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeCharIdx !== null) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCharacterImages(prev => ({ ...prev, [activeCharIdx]: reader.result as string }));
        setActiveCharIdx(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
    if (!result || !user) return;
    setIsPublishing(true);
    
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: profile?.displayName || 'Legacy Builder',
        desc: title,
        fullWork: result.content,
        tags: selectedDevices.map(d => `#${d.toLowerCase().replace(/\s+/g, '')}`).join(' ') + (selectedGenre ? ` #${selectedGenre.toLowerCase()}` : ''),
        genre: selectedGenre || 'All',
        music: 'Original Sound - AI',
        likesCount: 0,
        commentsCount: 0,
        color: activeTab === 'Prose' ? 'from-purple-600 to-blue-500' : activeTab === 'Drama' ? 'from-orange-500 to-rose-600' : 'from-emerald-500 to-cyan-600',
        createdAt: serverTimestamp()
      });

      setIsPublished(true);
      showToast('Published to your feed successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to publish. Check signal.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {isTranslating && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 z-[200] bg-black/60 backdrop-blur-xl px-4 py-1.5 rounded-full border border-cyan-500/30 flex items-center gap-2 shadow-2xl"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
              <Sparkles size={12} className="text-cyan-500" />
            </motion.div>
            <span className="text-[8px] uppercase font-bold tracking-[0.2em] text-white whitespace-nowrap">AI Localizing Writing Suite...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
        <label className="block">
          <div className="flex items-center gap-2 mb-1.5 ml-1">
            <Globe size={14} className="text-rose-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{labels.languageLabel}</span>
          </div>
          <select 
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/50 appearance-none font-bold uppercase tracking-widest text-white"
          >
            {CREATIVE_LANGUAGES.map(l => (
              <option key={l} value={l} className="bg-zinc-900">{l}</option>
            ))}
          </select>
        </label>
        <p className="text-[10px] text-gray-600 italic px-1 leading-relaxed">
          {labels.langDesc}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-white/5 p-1 rounded-xl">
        {(['Prose', 'Drama', 'Poetry'] as Tab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => {
            setActiveTab(tab);
            setSelectedGenre(null);
          }}
          className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-all relative",
              activeTab === tab ? "text-white" : "text-gray-400 hover:text-white"
            )}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white/10 rounded-lg shadow-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{tab}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold ml-1">{labels.titleLabel}</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={labels.placeholderTitle}
            className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-serif italic text-lg"
          />
        </label>

        <div>
          <div className="flex justify-between items-center mb-1.5 px-1">
            <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">{labels.genreLabel}</span>
            {selectedGenre && <span className="text-[10px] text-rose-500 font-bold uppercase">Selected</span>}
          </div>
          
          <div className="relative">
            <button
              onClick={() => setIsGenreMenuOpen(!isGenreMenuOpen)}
              className={cn(
                "w-full flex items-center justify-between bg-white/5 border rounded-xl px-4 py-3 transition-all group",
                isGenreMenuOpen ? "border-rose-500/50 ring-1 ring-rose-500/30" : "border-white/10 hover:bg-white/10"
              )}
            >
              <div className="flex items-center gap-2">
                {selectedGenre ? (
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    {selectedGenre}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500 italic">{labels.genrePlaceholder}</span>
                )}
              </div>
              <ChevronDown 
                size={18} 
                className={cn(
                  "text-gray-500 transition-transform duration-300",
                  isGenreMenuOpen && "rotate-180 text-rose-500"
                )} 
              />
            </button>

            {/* Microsoft-style Dropdown Menu */}
            <AnimatePresence>
              {isGenreMenuOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsGenreMenuOpen(false)}
                    className="fixed inset-0 z-[100]"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[110] overflow-hidden py-2"
                  >
                    <div className="max-h-[240px] overflow-y-auto no-scrollbar px-2 space-y-1">
                      {genres.map((genre) => (
                        <button
                          key={genre}
                          onClick={() => selectGenre(genre)}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all group/item",
                            selectedGenre === genre 
                              ? "bg-rose-500 text-white" 
                              : "text-gray-400 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {genre.toUpperCase()}
                          {selectedGenre === genre ? (
                            <Check size={14} />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-white/10 group-hover/item:border-white/30 transition-colors" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div>
           <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold ml-1">{labels.devicesLabel}</span>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto no-scrollbar p-1">
             {LITERARY_DEVICES.map((device) => (
               <button
                 key={device}
                 onClick={() => toggleDevice(device)}
                 className={cn(
                   "flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all border text-left",
                   selectedDevices.includes(device)
                     ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                     : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                 )}
               >
                 <div className={cn(
                   "w-4 h-4 rounded border flex items-center justify-center transition-all",
                   selectedDevices.includes(device) ? "bg-cyan-500 border-cyan-500" : "border-white/20"
                 )}>
                   {selectedDevices.includes(device) && <Check size={12} className="text-black" />}
                 </div>
                 {device}
               </button>
             ))}
           </div>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold ml-1">{labels.promptLabel}</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={labels.placeholderPrompt}
            className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all min-h-[100px] text-sm"
          />
        </label>

        <button
          onClick={handleGenerate}
          disabled={isLoading || !title}
          className={cn(
            "w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all",
            isLoading ? "bg-gray-800 text-gray-500" : "bg-gradient-to-r from-rose-500 via-purple-600 to-cyan-500 text-white hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Sparkles size={20} />
            </motion.div>
          ) : (
            <>
              <Sparkles size={20} />
              {labels.generateBtn}
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 space-y-6"
          >
             <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
               <h3 className="text-2xl font-serif italic mb-4 text-rose-400">{title}</h3>
               <div className="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300 leading-relaxed">
                 {result.content}
               </div>
             </div>

             <div className="pt-8 border-t border-white/5">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <UserCircle size={16} className="text-rose-500" />
                    <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold">{labels.dossiersLabel}</h4>
                  </div>
                  <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-bold tracking-tighter shadow-sm">{labels.aiSynced}</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {result.characterCards.map((char: any, i: number) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.05 }}
                      className="min-w-[200px] bg-gradient-to-br from-white/10 to-transparent p-4 rounded-xl border border-white/20"
                    >
                      <button 
                        onClick={() => {
                          setActiveCharIdx(i);
                          fileInputRef.current?.click();
                        }}
                        className="w-full aspect-square bg-white/5 rounded-lg mb-3 flex items-center justify-center border border-dashed border-white/20 overflow-hidden relative group/char"
                      >
                        {characterImages[i] ? (
                          <img src={characterImages[i]} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <>
                            <Plus size={24} className="text-white/20 group-hover/char:text-rose-500 transition-colors" />
                            <span className="text-[10px] absolute mt-12 text-white/40 group-hover/char:text-rose-400 transition-colors font-bold uppercase tracking-tighter">{labels.addPicture}</span>
                          </>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/char:opacity-100 flex items-center justify-center transition-opacity">
                           <Camera size={20} className="text-white" />
                        </div>
                      </button>
                      <h5 className="font-bold text-cyan-400 text-sm">{char.name}</h5>
                      <p className="text-[10px] text-rose-400 uppercase font-bold tracking-wider mb-2">{char.role}</p>
                      <p className="text-xs text-gray-400 leading-snug line-clamp-3">{char.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleCharPicUpload}
              />

             {isPublished ? (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="w-full py-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl font-bold text-center flex items-center justify-center gap-2"
               >
                 <Check size={20} />
                 {labels.publishedFeed}
               </motion.div>
             ) : (
               <button 
                className={cn(
                  "w-full py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2",
                  isPublishing && "opacity-50 cursor-not-allowed"
                )}
                onClick={handlePublish}
                disabled={isPublishing}
               >
                 {isPublishing ? (
                   <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                     <Sparkles size={20} className="text-rose-500" />
                   </motion.div>
                 ) : (
                   <>{labels.publishBtn}</>
                 )}
               </button>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
