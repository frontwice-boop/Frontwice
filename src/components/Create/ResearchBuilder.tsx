import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Upload, Save, Globe, Trash2, CheckCircle2, 
  Clock, BarChart3, ChevronRight, Check, Eye, BookOpen, 
  Info, Sparkles, RefreshCcw, Paperclip, X, Plus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { REFERENCE_STYLES } from '../../constants';
import { cn } from '../../lib/utils';
import { db, storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  collection, addDoc, serverTimestamp, doc, 
  updateDoc, increment, setDoc 
} from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';

const THEMES = [
  { id: 'slate', label: 'Oxford Slate', color: 'from-slate-900 via-zinc-900 to-slate-950', border: 'border-slate-500/30', bgAccent: 'bg-slate-500/20', textAccent: 'text-slate-400' },
  { id: 'crimson', label: 'Stanford Crimson', color: 'from-rose-950 via-zinc-900 to-rose-950', border: 'border-rose-500/30', bgAccent: 'bg-rose-500/20', textAccent: 'text-rose-400' },
  { id: 'emerald', label: 'Cambridge Ivy', color: 'from-emerald-950 via-neutral-900 to-emerald-950', border: 'border-emerald-500/30', bgAccent: 'bg-emerald-500/20', textAccent: 'text-emerald-400' },
  { id: 'indigo', label: 'MIT Velvet', color: 'from-indigo-950 via-zinc-900 to-indigo-950', border: 'border-indigo-500/30', bgAccent: 'bg-indigo-500/20', textAccent: 'text-indigo-400' },
  { id: 'dark-core', label: 'Dark Core', color: 'from-black via-zinc-900 to-black', border: 'border-white/10', bgAccent: 'bg-white/5', textAccent: 'text-gray-300' }
];

const DEPARTMENTS = [
  'Medicine & Biological Sciences',
  'Computer Science & Engineering',
  'Physics & Mathematics',
  'Environmental & Earth Sciences',
  'Sociology & Humanities',
  'Business, Finance & Economics',
  'Interdisciplinary Studies'
];

export default function ResearchBuilder({ lang, setLang }: { lang?: string; setLang?: (l: string) => void }) {
  const { showToast } = useToast();
  const { user, profile } = useUser();
  
  // Input States
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [style, setStyle] = useState('APA');
  const [language, setLanguage] = useState(lang || 'English');
  const [department, setDepartment] = useState(DEPARTMENTS[1]);
  const [selectedThemeId, setSelectedThemeId] = useState('slate');
  const [manuscript, setManuscript] = useState('');
  const [mainObjective, setMainObjective] = useState('');
  const [specificObjectives, setSpecificObjectives] = useState<string[]>([]);
  const [isGeneratingObjectives, setIsGeneratingObjectives] = useState(false);
  const [isGeneratingInstrument, setIsGeneratingInstrument] = useState(false);
  const [isGeneratingData, setIsGeneratingData] = useState(false);

  // Sync with global language changes if any
  useEffect(() => {
    if (lang) {
      setLanguage(lang);
    }
  }, [lang]);
  
  // Publication states
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // File Upload states
  const [researchAssets, setResearchAssets] = useState<{url: string, name: string, type: string}[]>(() => {
    const saved = localStorage.getItem('academic_draft_assets');
    return saved ? JSON.parse(saved) : [];
  });
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('academic_draft_assets', JSON.stringify(researchAssets));
  }, [researchAssets]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load drafts on mounting
  useEffect(() => {
    const savedTitle = localStorage.getItem('academic_draft_title');
    const savedAbstract = localStorage.getItem('academic_draft_abstract');
    const savedManuscript = localStorage.getItem('academic_draft_manuscript');
    const savedStyle = localStorage.getItem('academic_draft_style');
    const savedLanguage = localStorage.getItem('academic_draft_language');
    const savedDepartment = localStorage.getItem('academic_draft_department');
    const savedTheme = localStorage.getItem('academic_draft_theme');

    if (savedTitle) setTitle(savedTitle);
    if (savedAbstract) setAbstract(savedAbstract);
    if (savedManuscript) setManuscript(savedManuscript);
    if (savedStyle && REFERENCE_STYLES.includes(savedStyle)) setStyle(savedStyle);
    if (savedLanguage) setLanguage(savedLanguage);
    if (savedDepartment && DEPARTMENTS.includes(savedDepartment)) setDepartment(savedDepartment);
    if (savedTheme && THEMES.some(t => t.id === savedTheme)) setSelectedThemeId(savedTheme);
  }, []);

  // Sync draft edits to local storage
  useEffect(() => {
    localStorage.setItem('academic_draft_title', title);
  }, [title]);

  useEffect(() => {
    localStorage.setItem('academic_draft_abstract', abstract);
  }, [abstract]);

  useEffect(() => {
    localStorage.setItem('academic_draft_manuscript', manuscript);
  }, [manuscript]);

  useEffect(() => {
    localStorage.setItem('academic_draft_style', style);
  }, [style]);

  useEffect(() => {
    localStorage.setItem('academic_draft_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('academic_draft_department', department);
  }, [department]);

  useEffect(() => {
    localStorage.setItem('academic_draft_theme', selectedThemeId);
  }, [selectedThemeId]);

  // Analytics helper functions
  const wordCount = manuscript.trim() === '' ? 0 : manuscript.trim().split(/\s+/).filter(Boolean).length;
  const charCount = manuscript.length;
  const paragraphCount = manuscript.trim() === '' ? 0 : manuscript.split(/\n\s*\n/).filter(p => p.trim() !== '').length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 220));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const uploadFile = async (file: File) => {
    if (!user) {
      showToast('You must be logged in to upload files.', 'error');
      return;
    }
    
    // Support pdf, docx, txt, md, images
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    const isDoc = ['.pdf', '.docx', '.txt', '.md'].includes(ext);
    
    if (!isImage && !isDoc) {
      showToast('Unsupported file type. Use images (JPG, PNG) or documents (PDF, DOCX, TXT, MD).', 'warning');
      return;
    }

    try {
      const storageRef = ref(storage, `research_assets/${user.uid}/${Date.now()}-${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload error:", error);
          showToast('Upload failed.', 'error');
          setUploadProgress(null);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const newAsset = {
            url: downloadURL,
            name: file.name,
            type: isImage ? 'image' : 'document'
          };
          setResearchAssets(prev => [...prev, newAsset]);
          setUploadProgress(null);
          showToast(`"${file.name}" attached successfully!`, 'success');
          
          if (!title.trim()) {
            const cleanName = file.name.replace(/\.[^/.]+$/, "");
            setTitle(cleanName);
          }
        }
      );
    } catch (err) {
      console.error(err);
      showToast('Error initializing file upload.', 'error');
    }
  };

  const removeAsset = (index: number) => {
    setResearchAssets(prev => prev.filter((_, i) => i !== index));
    showToast('Asset removed.', 'info');
  };

  const handleFileLoad = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if ((ext === '.txt' || ext === '.md') && !manuscript.trim()) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setManuscript(content);
        uploadFile(file);
      };
      reader.readAsText(file);
    } else {
      uploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      files.forEach(file => handleFileLoad(file));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      files.forEach(file => handleFileLoad(file));
      e.target.value = '';
    }
  };

  const handlePublish = async () => {
    if (!user) {
      showToast('You must be logged in to publish.', 'error');
      return;
    }
    if (!title.trim()) {
      showToast('A distinct working title is required for publication.', 'warning');
      return;
    }
    if (!abstract.trim()) {
      showToast('Please provide an Abstract / Executive Summary.', 'warning');
      return;
    }
    if (!manuscript.trim() && researchAssets.length === 0) {
      showToast('Provide manuscript text or attach research files to publish.', 'warning');
      return;
    }

    setIsPublishing(true);
    try {
      const chosenTheme = THEMES.find(t => t.id === selectedThemeId) || THEMES[0];
      
      // We construct traditional full markdown content for the reader
      const objectivesSection = mainObjective 
        ? `\n\n### Research Objectives\n**Main Objective:** ${mainObjective}\n\n**Specific Objectives:**\n${specificObjectives.map((o, i) => `${i+1}. ${o}`).join('\n')}`
        : '';
      
      const fullWork = `## ${title}\n\n**Academic Discipline:** ${department} \n**Scientific Style:** ${style} \n**Language:** ${language}${objectivesSection}\n\n### Abstract\n${abstract}\n\n---\n\n### Research Manuscript\n${manuscript}`;

      const docRef = await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || 'Researcher Anonymous',
        desc: `[Abstract] ${abstract.substring(0, 240)}${abstract.length > 240 ? '...' : ''}`,
        fullWork,
        tags: `#research #academic #${style.toLowerCase()} #${department.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        genre: 'Academic',
        music: 'Scientific Focus',
        likesCount: 1,
        commentsCount: 0,
        reactionCounts: { like: 1 },
        color: chosenTheme.color,
        researchAssets,
        mainObjective,
        specificObjectives,
        createdAt: serverTimestamp()
      });

      // Auto-like for the publishing author
      await setDoc(doc(db, `posts/${docRef.id}/reactions/${user.uid}`), {
        userId: user.uid,
        type: 'like',
        createdAt: serverTimestamp()
      });

      // Increment works counter on author profile
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { worksCount: increment(1) });
      } catch (profileErr) {
        console.error('Error incrementing user worksCount:', profileErr);
      }

      setIsPublished(true);
      showToast('Academic research uploaded and published successfully!', 'success');
      
      // Clear draft states
      clearDraft();
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    } finally {
      setIsPublishing(false);
    }
  };

  const clearDraft = () => {
    setTitle('');
    setAbstract('');
    setManuscript('');
    setResearchAssets([]);
    setUploadProgress(null);
    localStorage.removeItem('academic_draft_title');
    localStorage.removeItem('academic_draft_abstract');
    localStorage.removeItem('academic_draft_manuscript');
    localStorage.removeItem('academic_draft_assets');
    setShowClearConfirm(false);
  };

  const chosenTheme = THEMES.find(t => t.id === selectedThemeId) || THEMES[0];

  return (
    <div className="space-y-6">
      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto border border-rose-500/20">
                <Trash2 size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold uppercase tracking-widest text-white">Reset Form?</h3>
                <p className="text-xs text-gray-400 leading-relaxed italic">
                  This will securely erase your current title, abstract, and manuscript draft. This action is final and cannot be undone.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={clearDraft}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-rose-600 transition-colors"
                >
                  Clear Draft
                </button>
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="w-full py-4 bg-white/5 text-gray-400 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
            <BookOpen size={20} />
          </div>
          <h2 className="text-xl font-serif italic text-white">Academic Submission Workspace</h2>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
          Publish complete, properly formatted scientific studies, articles, or abstracts to our academic timeline. Type or simple-upload your document manuscript below directly for pristine peer display.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Metadata */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 pb-2 border-b border-white/5">Research Metadata</h3>

                {/* Title Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Research Working Title</label>
                    <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold">REQUIRED</span>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Impact of Quantum Computing on Financial Services..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 text-sm font-serif italic text-white"
                  />
                </div>

                {/* Sub-group Style / Language */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Academic Style</label>
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs text-gray-300 focus:outline-none"
                    >
                      {REFERENCE_STYLES.map(s => (
                        <option key={s} value={s} className="bg-zinc-900">{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Research Language</label>
                    <input
                      type="text"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      placeholder="e.g. English, French"
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Discipline Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs text-gray-300 focus:outline-none"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d} className="bg-zinc-900">{d}</option>
                    ))}
                  </select>
                </div>

                {/* Paper Abstract / Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Abstract / Executive Summary</label>
                    <span className="text-[8px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold">REQUIRED</span>
                  </div>
                  <textarea
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    placeholder="Write a concise abstract outlining the background, methods, key findings, and implications (ideal summary to display)...."
                    className="w-full h-36 bg-black/30 border border-white/10 rounded-xl p-4 text-xs text-gray-300 leading-relaxed focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none font-sans"
                  />
                  <p className="text-[9px] text-gray-500 text-right">Characters: {abstract.length}/500</p>
                </div>

                {/* AI Research Laboratory */}
                <div className="pt-2 space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Sparkles size={14} className="text-cyan-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">AI Research Laboratory</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!title.trim()) return showToast('Please enter a research title first.', 'warning');
                        setIsGeneratingObjectives(true);
                        try {
                          const { generateResearchChapter } = await import('../../services/ai');
                          const data = await generateResearchChapter({
                            title,
                            chapter: 'Chapter 1: Introduction',
                            section: 'Objectives of the Study',
                            style,
                            language
                          });
                          
                          if (data.mainObjective || data.specificObjectives) {
                            setMainObjective(data.mainObjective || '');
                            setSpecificObjectives(data.specificObjectives || []);
                            showToast('Objectives generated!', 'success');
                            if (!manuscript.trim() && data.content) setManuscript(data.content);
                          } else {
                            showToast('Extraction failed.', 'warning');
                          }
                        } catch (err) {
                          console.error(err);
                          showToast('AI failed.', 'error');
                        } finally {
                          setIsGeneratingObjectives(false);
                        }
                      }}
                      disabled={isGeneratingObjectives || isGeneratingInstrument || isGeneratingData}
                      className="py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-cyan-400 flex flex-col items-center justify-center gap-1 hover:bg-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isGeneratingObjectives ? <RefreshCcw size={12} className="animate-spin" /> : <BookOpen size={12} />}
                      Objectives
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!title.trim()) return showToast('Please enter a research title first.', 'warning');
                        setIsGeneratingInstrument(true);
                        try {
                          const { generateResearchChapter } = await import('../../services/ai');
                          const data = await generateResearchChapter({
                            title,
                            chapter: 'Chapter 3: Methodology',
                            section: 'Instrument for Data Collection',
                            style,
                            language
                          });
                          
                          if (data.content) {
                            setManuscript(prev => prev + (prev ? '\n\n' : '') + data.content);
                            showToast('Test / Questionnaire generated and appended!', 'success');
                          }
                        } catch (err) {
                          console.error(err);
                          showToast('AI failed.', 'error');
                        } finally {
                          setIsGeneratingInstrument(false);
                        }
                      }}
                      disabled={isGeneratingObjectives || isGeneratingInstrument || isGeneratingData}
                      className="py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-purple-400 flex flex-col items-center justify-center gap-1 hover:bg-purple-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isGeneratingInstrument ? <RefreshCcw size={12} className="animate-spin" /> : <FileText size={12} />}
                      Test Gen
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!title.trim()) return showToast('Please enter a research title first.', 'warning');
                        setIsGeneratingData(true);
                        try {
                          const { generateResearchDataset } = await import('../../services/ai');
                          const data = await generateResearchDataset({
                            title,
                            objectives: specificObjectives,
                            variables: ['Variable X', 'Variable Y'],
                            language
                          });
                          
                          if (data) {
                            const table = `\n\n### Synthetic Research Dataset\n*${data.description}*\n\n| ${data.headers.join(' | ')} |\n| ${data.headers.map(() => '---').join(' | ')} |\n${data.rows.map(row => `| ${row.join(' | ')} |`).join('\n')}\n\n**Summary Statistics:** ${data.summaryStatistics}`;
                            setManuscript(prev => prev + (prev ? '\n\n' : '') + table);
                            showToast('Synthetic dataset generated and appended!', 'success');
                          }
                        } catch (err) {
                          console.error(err);
                          showToast('AI failed.', 'error');
                        } finally {
                          setIsGeneratingData(false);
                        }
                      }}
                      disabled={isGeneratingObjectives || isGeneratingInstrument || isGeneratingData}
                      className="py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-400 flex flex-col items-center justify-center gap-1 hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isGeneratingData ? <RefreshCcw size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                      Simulator
                    </button>
                  </div>
                  
                  {mainObjective && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-cyan-500">Main Research Objective</span>
                        <button onClick={() => setMainObjective('')} className="text-gray-600 hover:text-white"><X size={10} /></button>
                      </div>
                      <p className="text-[11px] text-white font-serif italic italic">{mainObjective}</p>
                      
                      {specificObjectives.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-white/5">
                          <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Specific Objectives</span>
                          <ul className="space-y-1.5">
                            {specificObjectives.map((obj, i) => (
                              <li key={i} className="text-[10px] text-gray-300 flex gap-2">
                                <span className="text-cyan-500 font-bold">{i+1}.</span>
                                {obj}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Theme Selector */}
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 block">Aesthetic Card Theme on Feed</label>
                  <div className="grid grid-cols-2 gap-2">
                    {THEMES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedThemeId(t.id)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left",
                          selectedThemeId === t.id
                            ? "border-cyan-500 bg-white/5 shadow-inner"
                            : "border-white/5 hover:border-white/10 bg-black/30"
                        )}
                      >
                        <div className={cn("w-3.5 h-3.5 rounded-full bg-gradient-to-r shadow-sm", t.color)} />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300 line-clamp-1">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Manuscript Editor & Assets */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4 flex flex-col h-full">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Paperclip size={14} className="text-cyan-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Research & Supporting Media</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {uploadProgress !== null ? (
                      <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl text-[9px] font-bold text-cyan-400 uppercase tracking-widest">
                        <RefreshCcw size={12} className="animate-spin text-cyan-400" />
                        Uploading ({uploadProgress}%)
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:bg-cyan-400 transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus size={16} />
                        Upload Research
                      </button>
                    )}
                    <input
                      id="manuscript-upload-input"
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      accept=".txt,.md,.pdf,.docx,image/*"
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Research Assets Gallery (Photo Style) */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Research Portfolio</span>
                      <span className="text-[8px] bg-white/5 text-gray-600 px-2 py-0.5 rounded-full font-bold">{researchAssets.length} / 12 FILES</span>
                    </div>
                  </div>
                  
                  {researchAssets.length === 0 ? (
                    <motion.button 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-40 rounded-[2rem] border-2 border-dashed border-white/5 bg-black/40 flex flex-col items-center justify-center gap-4 group hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all transition-duration-500"
                    >
                      <div className="w-12 h-12 rounded-full bg-cyan-500/5 flex items-center justify-center border border-cyan-500/10 group-hover:bg-cyan-500/10 group-hover:scale-110 transition-all">
                        <Plus size={24} className="text-cyan-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Add Scientific Evidence</p>
                        <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Images · Documents · Datasets</p>
                      </div>
                    </motion.button>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-4">
                      {researchAssets.map((asset, i) => (
                        <motion.div
                          key={i}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="aspect-square rounded-[1.5rem] overflow-hidden relative group border border-white/10 bg-black/40 shadow-xl"
                        >
                          {asset.type === 'image' ? (
                            <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center gap-1.5 bg-cyan-500/5">
                              <div className="p-2.5 bg-cyan-500/10 rounded-full border border-cyan-500/20 group-hover:scale-110 transition-transform">
                                <FileText size={20} className="text-cyan-400" />
                              </div>
                              <span className="text-[8px] text-gray-500 break-all line-clamp-2 font-mono uppercase tracking-tighter leading-tight px-1 font-bold">{asset.name}</span>
                            </div>
                          )}
                          <button
                            onClick={() => removeAsset(i)}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-md text-white/50 border border-white/10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-red-400 hover:border-red-400/50 transition-all active:scale-90"
                          >
                            <Trash2 size={12} />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1.5">
                               <CheckCircle2 size={10} className="text-green-500" />
                               <span className="text-[8px] font-black text-white uppercase tracking-widest">{asset.type}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      
                      {researchAssets.length < 12 && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-[1.5rem] border-2 border-dashed border-white/5 bg-white/5 flex flex-col items-center justify-center gap-2 group hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
                        >
                          <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center group-hover:border-cyan-500/30 transition-all">
                             <Plus size={20} className="text-gray-600 group-hover:text-cyan-500 transition-colors" />
                          </div>
                          <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Attach More</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/5 my-2" />

                {/* Drag and Drop Container */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "relative flex-1 rounded-2xl border-2 transition-all flex flex-col",
                    isDragging 
                      ? "border-cyan-500 bg-cyan-500/5" 
                      : "border-dashed border-white/5 bg-black/35"
                  )}
                >
                  <textarea
                    value={manuscript}
                    onChange={(e) => setManuscript(e.target.value)}
                    placeholder="Scientific Manuscript Content: Paste or type the full body of your research here. Use Markdown for structuring chapters, methods, and data tables..."
                    className="w-full flex-1 min-h-[400px] p-6 bg-transparent text-gray-100 placeholder:text-gray-600 border-none outline-none focus:ring-0 text-sm leading-relaxed font-sans resize-y"
                  />

                  {manuscript.trim() === '' && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-30">
                      <BookOpen className="text-gray-400" size={36} />
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-300">Manuscript Body</p>
                        <p className="text-[10px] text-gray-500 max-w-sm">Write directly or drag/drop files to attach to this publication.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <p className="text-[10px] text-gray-500 leading-relaxed italic">
                    Type or paste directly. Formats as standard Markdown in feed.
                  </p>
                  
                  <button
                    type="button"
                    disabled={!title && !abstract && !manuscript}
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-rose-500 disabled:opacity-35 disabled:hover:text-gray-500 transition-colors text-xs font-bold uppercase tracking-wider"
                  >
                    <Trash2 size={12} />
                    Reset Form
                  </button>
                </div>
              </div>
            </div>
          </div>
      
      {/* Footer Publishing Center */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-xs font-bold text-white uppercase tracking-wider">Submission Quality Check</p>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            {title.trim() ? <CheckCircle2 size={12} className="text-green-500" /> : <div className="w-3 h-3 rounded-full border border-white/10" />}
            <span>Title provided</span>
            <span>•</span>
            {abstract.trim() ? <CheckCircle2 size={12} className="text-green-500" /> : <div className="w-3 h-3 rounded-full border border-white/10" />}
            <span>Abstract set</span>
            <span>•</span>
            {manuscript.trim() || researchAssets.length > 0 ? <CheckCircle2 size={12} className="text-green-500" /> : <div className="w-3 h-3 rounded-full border border-white/10" />}
            <span>{researchAssets.length > 0 ? 'Assets attached' : 'Manuscript ready'}</span>
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
          {isPublished ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-8 py-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                <Check size={16} />
                Published to Academic Feed
              </motion.div>
              <button
                onClick={() => {
                  setIsPublished(false);
                  setTitle('');
                  setAbstract('');
                  setManuscript('');
                  setResearchAssets([]);
                  setMainObjective('');
                  setSpecificObjectives([]);
                }}
                className="px-6 py-4 bg-white/5 border border-white/10 text-gray-400 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-colors active:scale-95"
              >
                New Submission
              </button>
            </div>
          ) : (
            <button
              onClick={handlePublish}
              disabled={isPublishing || !title.trim() || !abstract.trim() || (!manuscript.trim() && researchAssets.length === 0)}
              className={cn(
                "w-full sm:w-auto px-10 py-4 font-black rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs uppercase tracking-widest shadow-xl",
                (isPublishing || !title.trim() || !abstract.trim() || (!manuscript.trim() && researchAssets.length === 0))
                  ? "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                  : "bg-white text-black hover:bg-gray-100 shadow-white/5"
              )}
            >
              {isPublishing ? (
                <>
                  <RefreshCcw size={16} className="animate-spin text-cyan-500" />
                  Uploading Manuscript...
                </>
              ) : (
                <>
                  <Globe size={16} className="text-cyan-600" />
                  Publish Research
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
