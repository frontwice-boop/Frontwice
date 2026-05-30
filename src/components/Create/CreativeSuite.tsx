import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trash2, Plus, Check, ChevronDown, X, Info, Camera, UserCircle, Globe, BookOpen, FileText, Upload } from 'lucide-react';
import { PROSE_GENRES, DRAMA_GENRES, POETRY_GENRES, LITERARY_DEVICES, RESEARCH_STRUCTURE, REFERENCE_STYLES } from '../../constants';
import { cn } from '../../lib/utils';
import { generateCreativeWork, generateResearchChapter } from '../../services/ai';
import { translateCreativeSuite } from '../../services/translationService';
import ReactMarkdown from 'react-markdown';

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

const RESEARCH_GENRES = [
  "Literature Review", "Empirical Study", "Case Study", "Theoretical Paper", 
  "Historical Analysis", "Scientific Report", "Interdisciplinary Analysis", 
  "Methodological Paper", "Systematic Review", "Meta-Analysis"
];

const RESEARCH_DEVICES = [
  "Qualitative Method", "Quantitative Method", "Mixed Methods", "Action Research",
  "Phenomenology", "Grounded Theory", "Case Study Design", "Hypothesis Testing",
  "Statistical Inference", "Thematic Analysis", "Discourse Analysis", "Empirical Evidence"
];

type Tab = 'Prose' | 'Drama' | 'Poetry' | 'Research';

const DEFAULT_LABELS = {
  titleLabel: 'Title',
  genreLabel: 'Genre',
  devicesLabel: 'Literary Devices',
  promptLabel: 'AI Prompt / Setting',
  generateBtn: 'Generate Work',
  languageLabel: 'Work Language',
  placeholderTitle: 'Enter a captivating title...',
  placeholderPrompt: 'Give the AI more context or specific instructions...',
  dossiersLabel: 'Character Cards',
  publishBtn: 'Publish to Feed',
  langDesc: 'AI will generate your story and character cards in the chosen language.',
  genrePlaceholder: 'Choose a genre...',
  aiSynced: 'AI SYNCED',
  addPicture: 'Add Picture',
  publishedFeed: 'PUBLISHED TO YOUR FEED'
};

import { useToast } from '../../context/ToastContext';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';

import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, increment, doc, setDoc } from 'firebase/firestore';
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

  const [selectedChapter, setSelectedChapter] = useState(RESEARCH_STRUCTURE[1].chapter);
  const [selectedSection, setSelectedSection] = useState(RESEARCH_STRUCTURE[1].sections[0]);
  const [selectedRefStyle, setSelectedRefStyle] = useState(REFERENCE_STYLES[0]);
  const [previousContext, setPreviousContext] = useState('');
  const [researchNotes, setResearchNotes] = useState('');

  useEffect(() => {
    if (activeTab === 'Research') {
      const chapterObj = RESEARCH_STRUCTURE.find(item => item.chapter === selectedChapter);
      if (chapterObj && chapterObj.sections.length > 0) {
        setSelectedSection(chapterObj.sections[0]);
      }
    }
  }, [selectedChapter, activeTab]);

  useEffect(() => {
    const applyTranslation = async () => {
      // Reset to English immediately
      if (lang === 'English') {
        setLabels(DEFAULT_LABELS);
        return;
      }

      setIsTranslating(true);
      try {
        const translated = await translateCreativeSuite(DEFAULT_LABELS, lang);
        if (translated) {
          setLabels(translated);
        } else {
          setLabels(DEFAULT_LABELS);
        }
      } catch (err) {
        console.error("Translation error in CreativeSuite:", err);
        setLabels(DEFAULT_LABELS);
      } finally {
        setIsTranslating(false);
      }
    };
    applyTranslation();
  }, [lang]);

  const genres = activeTab === 'Prose' 
    ? PROSE_GENRES 
    : activeTab === 'Drama' 
      ? DRAMA_GENRES 
      : activeTab === 'Poetry' 
        ? POETRY_GENRES 
        : RESEARCH_GENRES;

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
    setResult(null); // Clear previous result
    setIsPublished(false);
    try {
      if (activeTab === 'Research') {
        const data = await generateResearchChapter(
          {
            title,
            chapter: selectedChapter,
            section: selectedSection,
            style: selectedRefStyle,
            previousContext,
            notes: researchNotes,
            language: lang
          },
          (partial) => {
            if (typeof partial === 'object' && partial !== null) {
              setResult((prev: any) => ({
                ...(prev || { citations: [] }),
                ...(partial as any),
              }));
            } else {
              setResult((prev: any) => ({
                ...(prev || { citations: [] }),
                content: partial
              }));
            }
          }
        );
        setResult(data);
        showToast('Academic research section generated successfully!', 'success');
      } else {
        const data = await generateCreativeWork(
          {
            type: activeTab,
            title,
            genres: selectedGenre ? [selectedGenre] : [],
            devices: selectedDevices,
            prompt,
            language: lang
          },
          (partial) => {
            // Update the UI with partial content as it streams
            if (typeof partial === 'object' && partial !== null) {
              setResult((prev: any) => ({
                ...(prev || { characterCards: [] }),
                ...partial,
                content: partial.content || prev?.content,
                characterCards: partial.characterCards && partial.characterCards.length > 0 ? partial.characterCards : (prev?.characterCards || [])
              }));
            } else {
              setResult((prev: any) => ({
                ...(prev || { characterCards: [] }),
                content: partial
              }));
            }
          }
        );
        setResult(data);
        showToast('Creative work generated successfully!', 'success');
      }
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : String(error);
      showToast('Failed: ' + msg, 'error');
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
      e.target.value = '';
    }
  };

  const handlePublish = async () => {
    if (!result || !user) return;
    setIsPublishing(true);
    
    try {
      let postData: any;
      if (activeTab === 'Research') {
        const citationsText = result.citations && result.citations.length > 0
          ? '\n\n### References & Citations\n' + result.citations.map((c: string, idx: number) => `[${idx + 1}] ${c}`).join('\n\n')
          : '';

        postData = {
          authorId: user.uid,
          authorName: profile?.displayName || 'Legacy Builder',
          desc: `${title} - Section: ${selectedSection}`,
          fullWork: result.content + citationsText,
          tags: `#research #academic #${selectedRefStyle.toLowerCase()}`,
          genre: 'Academic',
          music: 'Scientific Focus',
          likesCount: 1,
          commentsCount: 0,
          reactionCounts: { like: 1 },
          color: 'from-indigo-600 to-slate-800',
          citations: result.citations || [],
          createdAt: serverTimestamp()
        };
      } else {
        // Attach the local character images to the cards before saving
        const cardsWithImages = (result.characterCards || []).map((char: any, i: number) => ({
          ...char,
          image: characterImages[i] || null
        }));

        postData = {
          authorId: user.uid,
          authorName: profile?.displayName || 'Legacy Builder',
          desc: title,
          fullWork: result.content,
          tags: selectedDevices.map(d => `#${d.toLowerCase().replace(/\s+/g, '')}`).join(' ') + (selectedGenre ? ` #${selectedGenre.toLowerCase()}` : ''),
          genre: selectedGenre || 'All',
          music: 'Original Sound - AI',
          likesCount: 1,
          commentsCount: 0,
          reactionCounts: { like: 1 },
          color: activeTab === 'Prose' ? 'from-purple-600 to-blue-500' : activeTab === 'Drama' ? 'from-orange-500 to-rose-600' : activeTab === 'Poetry' ? 'from-emerald-500 to-cyan-600' : 'from-indigo-600 to-slate-800',
          characterCards: cardsWithImages, // Save dossiers
          createdAt: serverTimestamp()
        };
      }

      const docRef = await addDoc(collection(db, 'posts'), postData);

      // Add the author's own reaction record so they see they've already "Liked" it (auto-like)
      await setDoc(doc(db, `posts/${docRef.id}/reactions/${user.uid}`), {
        userId: user.uid,
        type: 'like',
        createdAt: serverTimestamp()
      });

      // Increment works count in profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { worksCount: increment(1) });

      setIsPublished(true);
      showToast('Published to your feed successfully!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
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
            <span className="text-[8px] uppercase font-bold tracking-[0.2em] text-white whitespace-nowrap">Archive Synchronized</span>
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
      <div className="flex bg-white/5 p-1 rounded-xl overflow-x-auto no-scrollbar">
        {(['Prose', 'Drama', 'Poetry', 'Research'] as Tab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => {
            setActiveTab(tab);
            setSelectedGenre(null);
          }}
          className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-all relative whitespace-nowrap px-3",
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
            <span className="relative z-10">{tab === 'Research' ? 'Creative Research' : tab}</span>
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

        {activeTab !== 'Research' ? (
          <>
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
              <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold ml-1">
                {labels.devicesLabel}
              </span>
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
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold ml-1">Academic Style Citation</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                {REFERENCE_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setSelectedRefStyle(style)}
                    className={cn(
                      "py-2.5 rounded-xl text-xs font-bold transition-all border",
                      selectedRefStyle === style
                        ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                    )}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold ml-1">Research Chapter</span>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="w-full mt-1.5 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 appearance-none font-sans font-semibold text-white"
                >
                  {RESEARCH_STRUCTURE.map((item) => (
                    <option key={item.chapter} value={item.chapter} className="bg-zinc-900">
                      {item.chapter}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold ml-1">Research Section</span>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full mt-1.5 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 appearance-none font-sans font-semibold text-white"
                >
                  {(RESEARCH_STRUCTURE.find(item => item.chapter === selectedChapter)?.sections || []).map((sec) => (
                    <option key={sec} value={sec} className="bg-zinc-900">
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold ml-1">Previous Context / Literature Review Background (Optional)</span>
              <textarea
                value={previousContext}
                onChange={(e) => setPreviousContext(e.target.value)}
                placeholder="Paste/type context or abstract from prior chapters to guide continuity..."
                className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all min-h-[80px] text-sm"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Research Hypotheses & Specific Focus Notes (Optional)</span>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.txt,.md';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          setResearchNotes(prev => prev + (prev ? '\n\n' : '') + `--- [Imported from ${file.name}] ---\n` + content);
                          showToast(`Imported text from ${file.name}`, 'success');
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                  className="flex items-center gap-1.5 text-cyan-500 hover:text-cyan-400 text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  <Upload size={12} />
                  Import Notes (.txt/.md)
                </button>
              </div>
              <textarea
                value={researchNotes}
                onChange={(e) => setResearchNotes(e.target.value)}
                placeholder="Outline core data, observations, arguments, variables, or specific instructions for this section..."
                className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all min-h-[80px] text-sm"
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !title}
            className={cn(
              "w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all",
              isLoading 
                ? "bg-gray-800 text-gray-500" 
                : (isLoading || !title)
                  ? "bg-white/5 text-gray-500 border border-white/10"
                  : "bg-gradient-to-r from-rose-500 via-purple-600 to-cyan-500 text-white hover:scale-[1.02] active:scale-[0.98]"
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
          {!title && (
            <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest text-center animate-pulse">
              A title is required to transmit this creation
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 space-y-6"
          >
              {result.content && (
                <div className="space-y-6">
                  {result.mainObjective && (
                    <div className="bg-cyan-500/10 border border-cyan-500/20 p-6 rounded-3xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={16} className="text-cyan-500" />
                        <h4 className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">Main Research Objective</h4>
                      </div>
                      <p className="text-lg font-serif italic text-white leading-relaxed">{result.mainObjective}</p>
                    </div>
                  )}

                  {result.specificObjectives && result.specificObjectives.length > 0 && (
                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                      <div className="flex items-center gap-2 mb-4">
                        <Info size={16} className="text-purple-500" />
                        <h4 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Specific Objectives</h4>
                      </div>
                      <ul className="space-y-3">
                        {result.specificObjectives.map((obj: string, idx: number) => (
                          <li key={idx} className="flex gap-3 text-sm text-gray-300 items-start">
                            <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0 mt-0.5">{idx + 1}</span>
                            <p>{obj}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/10 shadow-xl overflow-y-auto max-h-[600px] no-scrollbar">
                    <div className="markdown-body prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed font-serif">
                      {typeof result.content === 'string' ? (
                        <ReactMarkdown>{result.content}</ReactMarkdown>
                      ) : (
                        <pre className="whitespace-pre-wrap font-mono text-[10px] text-gray-500">
                          {JSON.stringify(result.content, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {result.characterCards && result.characterCards.length > 0 && (
                <div className="pt-8 border-t border-white/5">
                <div className="flex items-center justify-between mb-6 px-1">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-cyan-500" />
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">{activeTab === 'Research' ? 'Key Concepts / Core Researchers' : 'Character Dossiers'}</h4>
                  </div>
                  <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-bold tracking-widest shadow-sm">{labels.aiSynced}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {result.characterCards.map((char: any, i: number) => (
                    <motion.div
                      key={i}
                      whileHover={{ y: -5 }}
                      className="bg-zinc-900/50 p-4 rounded-3xl border border-white/10 hover:border-cyan-500/30 transition-all shadow-xl"
                    >
                      <button 
                        onClick={() => {
                          setActiveCharIdx(i);
                          fileInputRef.current?.click();
                        }}
                        className="w-full aspect-square bg-black/40 rounded-2xl mb-4 flex items-center justify-center border border-white/5 overflow-hidden relative group/char"
                      >
                        {characterImages[i] ? (
                          <img src={characterImages[i]} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <>
                            <UserCircle size={32} className="text-white/10 group-hover/char:text-cyan-500 transition-colors" />
                            <div className="absolute inset-x-0 bottom-4 flex flex-col items-center">
                              <span className="text-[9px] text-white/30 group-hover/char:text-cyan-400 transition-colors font-black uppercase tracking-widest">{labels.addPicture}</span>
                            </div>
                          </>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/char:opacity-100 flex items-center justify-center transition-opacity">
                           <Camera size={20} className="text-cyan-400" />
                        </div>
                      </button>
                      <h5 className="font-serif italic text-white text-base mb-0.5">{char.name}</h5>
                      <p className="text-[9px] text-cyan-500 uppercase font-black tracking-widest mb-3">{char.role}</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">{char.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              )}

              {result.citations && result.citations.length > 0 && (
                <div className="pt-8 border-t border-white/5">
                   <div className="flex items-center justify-between mb-4 px-1">
                     <div className="flex items-center gap-2">
                       <BookOpen size={16} className="text-cyan-500" />
                       <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold">Scientific Citations & Bibliography</h4>
                     </div>
                     <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-bold tracking-tighter shadow-sm">{selectedRefStyle} FORMAT</span>
                   </div>
                   <div className="space-y-3 pb-4">
                     {result.citations.map((cite: string, i: number) => (
                       <div key={i} className="flex gap-3 bg-white/5 p-4 rounded-xl border border-white/10 text-left">
                         <span className="text-cyan-400 font-bold font-mono text-xs">[{i + 1}]</span>
                         <p className="text-xs text-gray-300 font-serif leading-relaxed italic">{cite}</p>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleCharPicUpload}
              />

             {isPublished ? (
               <div className="flex flex-col gap-3">
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="w-full py-5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-3xl font-black uppercase tracking-widest text-center flex items-center justify-center gap-3 shadow-xl"
                 >
                   <Check size={20} />
                   {labels.publishedFeed}
                 </motion.div>
                 <button
                   onClick={() => {
                     setIsPublished(false);
                     setResult(null);
                     setTitle('');
                     setPrompt('');
                     setSelectedGenre(null);
                     setSelectedDevices([]);
                     setCharacterImages({});
                   }}
                   className="w-full py-4 bg-white/5 border border-white/10 text-gray-400 rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all active:scale-95"
                 >
                   New Creation
                 </button>
               </div>
             ) : (
               <button 
                className={cn(
                  "w-full py-5 bg-cyan-500 text-black rounded-3xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3",
                  isPublishing && "opacity-50 cursor-not-allowed"
                )}
                onClick={handlePublish}
                disabled={isPublishing}
               >
                 {isPublishing ? (
                   <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                     <Sparkles size={20} />
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
