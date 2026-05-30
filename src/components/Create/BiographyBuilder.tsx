import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit3, Sparkles, BookOpen, Image as ImageIcon, Camera, Upload, ChevronRight, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';
import { generateBiographyChapter, generateBiographyTribute } from '../../services/ai';
import { generateBiographyDraft } from '../../services/geminiService';
import { translateUI, translateBiography } from '../../services/translationService';

interface Chapter {
  title: string;
  content: string;
}

interface Contributor {
  name: string;
  image: string | null;
}

interface Tribute {
  title: string;
  content: string;
  contributors: Contributor[];
}

const BIOGRAPHY_LANGUAGES = [
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

const DEFAULT_LABELS = {
  langLabel: 'Biography Language',
  langDesc: 'AI will generate all chapter content and tribute expansions in your selected language.',
  coverLabel: 'App Cover Page',
  changeCover: 'Change Cover',
  uploadCover: 'Import Cover Photo',
  coverDesc: 'Portrait or Landscape',
  chaptersTitle: 'Biography Chapters',
  chapterPlaceholder: 'Chapter Title...',
  chapterContentPlaceholder: 'Tell this part of your story...',
  biographyTitlePlaceholder: 'Enter Biography Title (e.g. The Untold Story of...)',
  addChapter: 'Add More Chapters',
  picturesTitle: 'Memorable Pictures',
  addPictures: 'Add Pictures',
  picturesDesc: 'Life Moments',
  visualTitle: 'Visual Storytelling',
  visualDesc: 'Our AI uses your chapter notes to suggest perfect captions or music for these memories.',
  tributesTitle: 'Tributes & Messages',
  tributePlaceholder: 'Short Heading (e.g. A Friend\'s Voice)',
  tributeContentPlaceholder: 'Write the tribute message here...',
  contributorsLabel: 'Message Contributors',
  contributorNamePlaceholder: 'Name',
  addTributes: 'Add Final Tributes',
  publishBtn: 'Publish to Main Feed',
  publishAlertText: 'Biography published! Your content is perfectly sequence-locked in the order you arranged.',
  aiSyncing: 'Archive Synchronized'
};

import { useToast } from '../../context/ToastContext';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';
import { useUser } from '../../context/UserContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';

export default function BiographyBuilder({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  const { showToast } = useToast();
  const { user, profile } = useUser();
  const [biographyTitle, setBiographyTitle] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([
    { title: 'Early Life', content: '' }
  ]);
  const [memorableImages, setMemorableImages] = useState<string[]>([]);
  const [tributes, setTributes] = useState<Tribute[]>([
    { title: 'A Short Memory', content: '', contributors: [{ name: 'Friend', image: null }] }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [aiDraftPrompt, setAiDraftPrompt] = useState('');
  const [labels, setLabels] = useState(DEFAULT_LABELS);

  const INITIAL_CHAPTERS = [{ title: 'Early Life', content: '' }];
  const INITIAL_TRIBUTES = [{ title: 'A Short Memory', content: '', contributors: [{ name: 'Friend', image: null }] }];

  React.useEffect(() => {
    const applyTranslation = async () => {
      if (lang !== 'English' && BIOGRAPHY_LANGUAGES.includes(lang)) {
        setIsTranslating(true);
        
        // Translate labels
        const translatedUI = await translateUI(DEFAULT_LABELS, lang);
        if (translatedUI) setLabels(translatedUI);

        // Translate current content to follow global language change
        const translatedData = await translateBiography({ chapters, tributes }, lang);
        if (translatedData) {
          setChapters(translatedData.chapters);
          setTributes(translatedData.tributes);
        }

        setIsTranslating(false);
      } else {
        setLabels(DEFAULT_LABELS);
      }
    };
    applyTranslation();
  }, [lang]);
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const contributorInputRef = useRef<{ tributeIndex: number; contributorIndex: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: any) => void, mode: 'single' | 'multiple') => {
    const files = e.target.files;
    if (files) {
      if (mode === 'single') {
        const reader = new FileReader();
        reader.onloadend = () => setter(reader.result as string);
        reader.readAsDataURL(files[0]);
      } else {
        (Array.from(files) as File[]).forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => setter((prev: string[]) => [...prev, reader.result as string]);
          reader.readAsDataURL(file);
        });
      }
      // Reset input value so selecting the same files again triggers change event
      e.target.value = '';
    }
  };

  const addChapter = () => {
    setChapters([...chapters, { title: `Chapter ${chapters.length + 1}`, content: '' }]);
  };

  const updateChapter = (index: number, field: keyof Chapter, value: string) => {
    const newChapters = [...chapters];
    newChapters[index][field] = value;
    setChapters(newChapters);
  };

  const removeChapter = (index: number) => {
    if (chapters.length > 1) {
      setChapters(chapters.filter((_, i) => i !== index));
    }
  };

  const moveChapter = (index: number, direction: 'up' | 'down') => {
    const newChapters = [...chapters];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < chapters.length) {
      [newChapters[index], newChapters[targetIndex]] = [newChapters[targetIndex], newChapters[index]];
      setChapters(newChapters);
    }
  };

  const addTribute = () => {
    setTributes([...tributes, { title: '', content: '', contributors: [] }]);
  };

  const updateTribute = (index: number, field: keyof Tribute, value: any) => {
    const newTributes = [...tributes];
    (newTributes[index] as any)[field] = value;
    setTributes(newTributes);
  };

  const removeTribute = (index: number) => {
    if (tributes.length > 1) {
      setTributes(tributes.filter((_, i) => i !== index));
    }
  };

  const moveTribute = (index: number, direction: 'up' | 'down') => {
    const newTributes = [...tributes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < tributes.length) {
      [newTributes[index], newTributes[targetIndex]] = [newTributes[targetIndex], newTributes[index]];
      setTributes(newTributes);
    }
  };

  const addContributor = (tributeIndex: number) => {
    const newTributes = [...tributes];
    newTributes[tributeIndex].contributors.push({ name: '', image: null });
    setTributes(newTributes);
  };

  const updateContributor = (tributeIndex: number, contributorIndex: number, field: keyof Contributor, value: string | null) => {
    const newTributes = [...tributes];
    (newTributes[tributeIndex].contributors[contributorIndex] as any)[field] = value;
    setTributes(newTributes);
  };

  const removeContributor = (tributeIndex: number, contributorIndex: number) => {
    const newTributes = [...tributes];
    newTributes[tributeIndex].contributors = newTributes[tributeIndex].contributors.filter((_, i) => i !== contributorIndex);
    setTributes(newTributes);
  };

  const handleContributorPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && contributorInputRef.current) {
      const reader = new FileReader();
      const { tributeIndex, contributorIndex } = contributorInputRef.current;
      reader.onloadend = () => {
        updateContributor(tributeIndex, contributorIndex, 'image', reader.result as string);
      };
      reader.readAsDataURL(file);
      // Reset input value so selecting the same file again triggers change event
      e.target.value = '';
    }
  };

  const generateChapterExpansion = async (index: number) => {
    if (!chapters[index].title) return showToast('Please enter a chapter title first.', 'warning');
    setIsLoading(true);
    let cumulativeContent = '';
    try {
      await generateBiographyChapter({
        title: chapters[index].title,
        content: chapters[index].content,
        language: lang
      }, (chunk) => {
        // chunk is the full text so far from processable in ai.ts
        updateChapter(index, 'content', chunk);
      });
      showToast('Chapter expanded successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to expand chapter.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const generateTributeExpansion = async (index: number) => {
    if (!tributes[index].title && !tributes[index].content) {
      return showToast('Please enter a tribute title or some notes first.', 'warning');
    }
    setIsLoading(true);
    let cumulativeContent = '';
    try {
      await generateBiographyTribute({
        title: tributes[index].title,
        content: tributes[index].content,
        language: lang
      }, (chunk) => {
        // chunk is the full text so far from processable in ai.ts
        updateTribute(index, 'content', chunk);
      });
      showToast('Tribute expanded successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to expand tribute.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const generateDraft = async () => {
    if (!aiDraftPrompt.trim()) return showToast('Please enter some life facts first.', 'warning');
    setIsGeneratingDraft(true);
    try {
      const draft = await generateBiographyDraft(profile?.displayName || 'Legacy Builder', aiDraftPrompt, lang);
      if (draft.chapters && draft.chapters.length > 0) {
        setBiographyTitle(draft.biographyTitle || '');
        setChapters(draft.chapters);
        showToast('AI Draft generated successfully!', 'success');
      }
    } catch (error) {
      console.error(error);
      showToast('Preparation in progress. You can continue writing manually.', 'info');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!user) {
      showToast('You must be logged in to publish.', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      const titleToUse = biographyTitle.trim() || `The Biography of ${profile?.displayName || 'Legacy Builder'}`;
      const fullWork = `## ${titleToUse}\n\nChapters:\n\n${chapters.map(c => `### ${c.title}\n${c.content}`).join('\n\n')}\n\nTributes:\n\n${tributes.map(t => `### ${t.title}\n${t.content}`).join('\n\n')}`;

      const docRef = await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || 'Legacy Builder',
        authorPhotoURL: profile?.photoURL || user.photoURL || '',
        desc: titleToUse,
        fullWork: fullWork,
        tags: '#biography #legacy',
        genre: 'Biography',
        music: 'Original Sound - AI',
        likesCount: 1,
        commentsCount: 0,
        reactionCounts: { like: 1 },
        color: 'from-amber-600 to-amber-900',
        coverImage: coverImage,
        profilePicture: coverImage,
        images: memorableImages,
        tributes: tributes,
        chapters: chapters,
        createdAt: serverTimestamp()
      });

      // Auto-like by author
      await setDoc(doc(db, `posts/${docRef.id}/Reaction/${user.uid}`), {
        userId: user.uid,
        type: 'like',
        createdAt: serverTimestamp()
      });

      showToast(labels.publishAlertText, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 text-gray-200">
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
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white">{labels.aiSyncing}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-cyan-500/20 space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles size={120} className="text-cyan-500" />
          </div>
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-2 text-cyan-500">
               <Sparkles size={20} />
               <h3 className="text-xs font-black uppercase tracking-[0.3em]">AI Biography Architect</h3>
             </div>
             <p className="text-sm text-gray-400 font-light italic leading-relaxed">
               Share 3 key milestones or life facts, and I'll architect a soulful narrative draft for you to refine.
             </p>
             <textarea 
               value={aiDraftPrompt}
               onChange={(e) => setAiDraftPrompt(e.target.value)}
               placeholder="Example: Born in Paris 1985, studied architecture in Tokyo, moved to NY to start a sustainable design firm..."
               className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-4 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 min-h-[100px] transition-all"
             />
             <button 
               onClick={generateDraft}
               disabled={isGeneratingDraft}
               className="w-full py-4 bg-cyan-500 text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
             >
               {isGeneratingDraft ? (
                 <>
                   <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                     <Sparkles size={16} />
                   </motion.div>
                   Manifesting Story...
                 </>
               ) : (
                 <>
                   <Sparkles size={16} />
                   Architect Smart Biography
                 </>
               )}
             </button>
          </div>
        </div>

        <div className="bg-white/5 border-b border-white/10 pb-6 mb-8">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Biography Title</label>
          <input
            type="text"
            value={biographyTitle}
            onChange={(e) => setBiographyTitle(e.target.value)}
            placeholder={labels.biographyTitlePlaceholder}
            className="w-full bg-transparent border-none text-3xl font-serif italic text-white focus:outline-none placeholder:text-gray-700"
          />
        </div>

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
            {BIOGRAPHY_LANGUAGES.map(option => (
              <option key={option} value={option} className="bg-zinc-900">{option}</option>
            ))}
          </select>
        </label>
        <p className="text-[10px] text-gray-600 italic px-2 leading-relaxed">
          {labels.langDesc}
        </p>
      </div>

      {/* Cover Page Section */}
      <section className="space-y-3">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">{labels.coverLabel}</label>
        <div 
          onClick={() => coverInputRef.current?.click()}
          className={cn(
            "relative w-full aspect-[16/9] rounded-3xl overflow-hidden cursor-pointer group transition-all duration-500",
            !coverImage ? "bg-white/5 border-2 border-dashed border-white/10 hover:border-rose-500/50 flex flex-col items-center justify-center gap-3" : "border border-white/10"
          )}
        >
          {coverImage ? (
            <>
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                <div className="bg-white/10 p-3 rounded-full border border-white/20"><Camera size={20} /></div>
                <span className="font-bold text-sm">{labels.changeCover}</span>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500 group-hover:text-rose-500 group-hover:scale-110 transition-all duration-300">
                <Upload size={24} />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">{labels.uploadCover}</p>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">{labels.coverDesc}</p>
              </div>
            </>
          )}
        </div>
        <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setCoverImage, 'single')} />
    </section>

    <div className="space-y-12">
      {/* Chapters Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="h-px flex-1 bg-white/10" />
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] whitespace-nowrap">{labels.chaptersTitle}</h3>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-6">
          {chapters.map((chapter, index) => (
            <motion.div
              key={index}
              layout
              className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 group relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 font-serif italic text-sm">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={chapter.title}
                    onChange={(e) => updateChapter(index, 'title', e.target.value)}
                    placeholder={labels.chapterPlaceholder}
                    className="bg-transparent border-none text-xl font-serif italic focus:outline-none placeholder:text-gray-700 w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1 mr-2 border-r border-white/5 pr-2">
                    <button 
                      onClick={() => moveChapter(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-white/10 rounded-md disabled:opacity-20"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button 
                      onClick={() => moveChapter(index, 'down')}
                      disabled={index === chapters.length - 1}
                      className="p-1 hover:bg-white/10 rounded-md disabled:opacity-20"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => generateChapterExpansion(index)}
                    disabled={isLoading}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-rose-500 transition-colors border border-white/5 group-hover:border-rose-500/30"
                    title="AI Expand"
                  >
                    <Sparkles size={16} />
                  </button>
                  {chapters.length > 1 && (
                    <button
                      onClick={() => removeChapter(index)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-red-500 transition-colors border border-white/5"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              <textarea
                value={chapter.content}
                onChange={(e) => updateChapter(index, 'content', e.target.value)}
                placeholder={labels.chapterContentPlaceholder}
                className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-sm leading-relaxed text-gray-400 focus:outline-none focus:ring-1 focus:ring-rose-500/30 transition-all min-h-[120px]"
              />
            </motion.div>
          ))}
        </div>

        <button
          onClick={addChapter}
          className="w-full flex items-center justify-center gap-3 py-5 bg-white/5 border border-dashed border-white/10 rounded-3xl text-sm font-bold hover:bg-white/10 hover:border-white/20 transition-all group"
        >
          <Plus size={20} className="group-hover:text-rose-500 transition-colors" />
          {labels.addChapter}
        </button>
      </div>

      {/* Memorable Pictures Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="h-px flex-1 bg-white/10" />
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] whitespace-nowrap">{labels.picturesTitle}</h3>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {memorableImages.map((img, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-[4/5] rounded-2xl overflow-hidden relative group border border-white/10 shadow-lg"
            >
              <img src={img} alt="Memory" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setMemorableImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="p-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
          
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="aspect-[4/5] rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center gap-3 group hover:border-rose-500/50 hover:bg-white/10 transition-all"
          >
            <div className="p-4 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform duration-500">
              <Plus size={28} className="text-gray-500 group-hover:text-rose-500" />
            </div>
            <div className="text-center px-2">
              <p className="text-sm font-bold">{labels.addPictures}</p>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-1">{labels.picturesDesc}</p>
            </div>
          </button>
        </div>
        
        <input 
          type="file" 
          ref={galleryInputRef} 
          multiple 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleImageUpload(e, setMemorableImages, 'multiple')} 
        />

        <div className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 flex-shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <h4 className="font-bold text-sm">{labels.visualTitle}</h4>
            <p className="text-xs text-gray-500 leading-relaxed mt-1">{labels.visualDesc}</p>
          </div>
        </div>
      </div>

      {/* Tributes Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="h-px flex-1 bg-white/10" />
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] whitespace-nowrap">{labels.tributesTitle}</h3>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-6">
          {tributes.map((tribute, tIndex) => (
            <motion.div
              key={tIndex}
              layout
              className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 group relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col gap-1 mr-2">
                    <button 
                      onClick={() => moveTribute(tIndex, 'up')}
                      disabled={tIndex === 0}
                      className="p-1 hover:bg-white/10 rounded-md disabled:opacity-20"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button 
                      onClick={() => moveTribute(tIndex, 'down')}
                      disabled={tIndex === tributes.length - 1}
                      className="p-1 hover:bg-white/10 rounded-md disabled:opacity-20"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={tribute.title}
                    onChange={(e) => updateTribute(tIndex, 'title', e.target.value)}
                    placeholder={labels.tributePlaceholder}
                    className="bg-transparent border-none text-xl font-serif italic text-rose-500/80 focus:outline-none placeholder:text-gray-700 w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateTributeExpansion(tIndex)}
                    disabled={isLoading}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-rose-500 transition-colors border border-white/5 group-hover:border-rose-500/30"
                    title="AI Expand Tribute"
                  >
                    <Sparkles size={16} />
                  </button>
                  <button
                    onClick={() => removeTribute(tIndex)}
                    className="p-2 text-gray-600 hover:text-red-500 transition-colors bg-white/5 rounded-xl border border-white/5"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <textarea
                value={tribute.content}
                onChange={(e) => updateTribute(tIndex, 'content', e.target.value)}
                placeholder={labels.tributeContentPlaceholder}
                className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-sm leading-relaxed text-gray-400 focus:outline-none min-h-[100px]"
              />

              {/* Multi-Contributor Section */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{labels.contributorsLabel}</span>
                </div>
                
                <div className="flex flex-wrap gap-6">
                  {tribute.contributors.map((contrib, cIndex) => (
                    <div key={cIndex} className="flex flex-col items-center gap-2 w-20 relative group/contrib">
                      <div 
                        onClick={() => {
                          contributorInputRef.current = { tributeIndex: tIndex, contributorIndex: cIndex };
                          fileInputRef.current?.click();
                        }}
                        className="w-16 h-16 rounded-full bg-white/5 border border-white/10 overflow-hidden cursor-pointer hover:border-rose-500/50 transition-all flex-shrink-0 relative group/photo"
                      >
                        {contrib.image ? (
                          <img src={contrib.image} alt={contrib.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Camera size={20} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                          <Plus size={14} />
                        </div>
                      </div>
                      
                      <input
                        type="text"
                        value={contrib.name}
                        onChange={(e) => updateContributor(tIndex, cIndex, 'name', e.target.value)}
                        placeholder={labels.contributorNamePlaceholder}
                        className="bg-transparent border-none text-[10px] text-center w-full focus:outline-none placeholder:text-gray-800"
                      />

                      {tribute.contributors.length > 1 && (
                        <button
                          onClick={() => removeContributor(tIndex, cIndex)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/contrib:opacity-100 transition-opacity"
                        >
                          <Trash2 size={8} />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => addContributor(tIndex)}
                    className="w-16 h-16 rounded-full border border-dashed border-white/10 flex items-center justify-center text-gray-600 hover:border-rose-500/50 hover:text-rose-500 transition-all"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <button
          onClick={addTribute}
          className="w-full flex items-center justify-center gap-3 py-5 bg-rose-500/5 border border-dashed border-rose-500/10 rounded-3xl text-sm font-bold text-rose-500/80 hover:bg-rose-500/10 transition-all group"
        >
          <Plus size={20} />
          {labels.addTributes}
        </button>

        <button 
          onClick={handlePublish}
          className="w-full py-5 bg-gradient-to-r from-rose-600 to-purple-600 rounded-3xl font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-8"
        >
          {labels.publishBtn}
        </button>
      </div>
    </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleContributorPhoto} 
      />
    </div>
  </div>
  );
}
