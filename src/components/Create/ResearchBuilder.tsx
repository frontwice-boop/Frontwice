import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, ArrowLeft, Save, Globe, FileText, ChevronRight, PenTool, Edit3, Plus, Trash2, ListTree, BrainCircuit, X, Upload, Table, Database } from 'lucide-react';
import { RESEARCH_STRUCTURE, REFERENCE_STYLES } from '../../constants';
import { cn } from '../../lib/utils';
import { generateResearchChapter, generateResearchDataset } from '../../services/ai';
import { translateUI, translateResearch } from '../../services/translationService';

const DEFAULT_LABELS = {
  researchTitle: 'Research Title',
  requiredLabel: 'REQUIRED',
  placeholderTitle: 'Impact of Quantum Computing on Cybersecurity...',
  styleLabel: 'Academic Style',
  langLabel: 'Research Language',
  progressLabel: 'Chapter Progress',
  sectionLabel: 'SECTION',
  documentationLabel: 'Research Documentation',
  notesLabel: 'Your Research Notes',
  addNoteBtn: 'Add Note',
  aiSyncBtn: 'AI Sync',
  shortcutLabel: 'Ctrl + Enter to save',
  noNotesLabel: 'No research notes recorded',
  subtopicsLabel: 'Subtopics & References',
  subtopicPlaceholder: 'Type subtopic & hit Enter...',
  noSubtopicsLabel: 'No specific subtopics added yet.',
  datasetTitle: 'Synthetic Research Dataset',
  summaryLabel: 'AI Summary of Mock Data',
  generateDataBtn: 'Generate Synthetic Data',
  adoptQuestionnaireBtn: 'AI Adopt/Adapt Questionnaire',
  aiGenerationBtn: 'AI Generation',
  generateNewBtn: 'Generate New Version',
  exportBtn: 'Export Research',
  noDataExport: 'No research data to export!',
  confirmClear: 'Are you sure you want to clear all research notes and results? This cannot be undone.',
  emptyDesc: 'Provide notes or subtopics above, then let AI build your chapter blueprint.',
  protocolLabel: 'Questionnaire Protocol',
  protocolDesc: 'AI will auto-generate a scale, citing the original source. It will prioritize Adopted instruments to bypass validity/reliability testing requirements.',
  aiSyncing: 'AI Localizing Research...',
  aiSync: 'AI Sync',
  aiDataSummary: 'AI Summary of Mock Data',
  generatedSources: 'Generated Sources',
  drafting: 'Drafting...'
};

const RESEARCH_LANGUAGES = [
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

export default function ResearchBuilder({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('APA');
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Record<string, { content: string; citations: string[] }>>({});
  const [researchNotes, setResearchNotes] = useState<Record<string, string[]>>({});
  const [subtopics, setSubtopics] = useState<Record<string, string[]>>({});
  const [isAddingSubtopic, setIsAddingSubtopic] = useState(false);
  const [newSubtopic, setNewSubtopic] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [dataset, setDataset] = useState<{ description: string; headers: string[]; rows: string[][]; summaryStatistics: string } | null>(null);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [labels, setLabels] = useState(DEFAULT_LABELS);

  React.useEffect(() => {
    const applyTranslation = async () => {
      if (lang !== 'English' && RESEARCH_LANGUAGES.includes(lang)) {
        setIsTranslating(true);
        const translatedUI = await translateUI(DEFAULT_LABELS, lang);
        if (translatedUI) setLabels(translatedUI);

        const translatedResults = await translateResearch(results, lang);
        if (translatedResults) setResults(translatedResults);

        setIsTranslating(false);
      } else {
        setLabels(DEFAULT_LABELS);
      }
    };
    applyTranslation();
  }, [lang]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const currentChapter = RESEARCH_STRUCTURE[currentChapterIdx];
  const currentSection = currentChapter.sections[currentSectionIdx];
  const totalChapters = RESEARCH_STRUCTURE.length;
  const storageKey = `${currentChapter.chapter}-${currentSection}`;

  const handleNext = () => {
    if (currentSectionIdx < currentChapter.sections.length - 1) {
      setCurrentSectionIdx(prev => prev + 1);
    } else if (currentChapterIdx < totalChapters - 1) {
      setCurrentChapterIdx(prev => prev + 1);
      setCurrentSectionIdx(0);
    }
  };

  const handleBack = () => {
    if (currentSectionIdx > 0) {
      setCurrentSectionIdx(prev => prev - 1);
    } else if (currentChapterIdx > 0) {
      setCurrentChapterIdx(prev => prev - 1);
      setCurrentSectionIdx(RESEARCH_STRUCTURE[currentChapterIdx - 1].sections.length - 1);
    }
  };

  const handleGenerate = async (useNotes = false) => {
    if (!title) return showToast('Please enter a research title', 'error');
    setIsLoading(true);
    try {
      const notes = useNotes ? (researchNotes[storageKey] || []).join('\n\n') : '';
      const topicList = subtopics[storageKey] || [];
      
      const data = await generateResearchChapter({
        title,
        chapter: currentChapter.chapter,
        section: currentSection,
        style,
        language: lang,
        previousContext: Object.values(results).map((r: any) => r.content.substring(0, 200)).join('\n'),
        notes: notes + (topicList.length > 0 ? `\nFocus on these subtopics: ${topicList.join(', ')}` : '')
      });
      setResults(prev => ({ ...prev, [storageKey]: data }));
      showToast('Chapter generated successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Generation failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubtopic = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newSubtopic.trim()) {
      setSubtopics(prev => ({
        ...prev,
        [storageKey]: [...(prev[storageKey] || []), newSubtopic.trim()]
      }));
      setNewSubtopic('');
      setIsAddingSubtopic(false);
    }
  };

  const handleAddNote = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newNote.trim()) {
      setResearchNotes(prev => ({
        ...prev,
        [storageKey]: [...(prev[storageKey] || []), newNote.trim()]
      }));
      setNewNote('');
      setIsAddingNote(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setResearchNotes(prev => ({
            ...prev,
            [storageKey]: [...(prev[storageKey] || []), `[File: ${file.name}]\n${content}`]
          }));
        };
        reader.readAsText(file);
      });
    }
  };

  const removeNote = (idx: number) => {
    setResearchNotes(prev => ({
      ...prev,
      [storageKey]: prev[storageKey].filter((_, i) => i !== idx)
    }));
  };

  const removeSubtopic = (idx: number) => {
    setSubtopics(prev => ({
      ...prev,
      [storageKey]: prev[storageKey].filter((_, i) => i !== idx)
    }));
  };

  const handleGenerateDataset = async () => {
    if (!title) return showToast('Please enter a research title', 'error');
    setIsGeneratingData(true);
    try {
      const data = await generateResearchDataset({
        title,
        objectives: subtopics[storageKey] || ["Investigate key trends", "Analyze participant behavior"],
        variables: ["Age", "Gender", "ExperienceLevel", "SatisfactionScore", "Engagement"],
        language: lang
      });
      setDataset(data);
      showToast('Synthetic dataset generated!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Dataset generation failed.', 'error');
    } finally {
      setIsGeneratingData(false);
    }
  };

  const handleExport = async () => {
    if (Object.keys(results).length === 0) return showToast(labels.noDataExport, 'warning');
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create a text blob representing the research
    const content = Object.entries(results).map(([key, val]) => {
      const data = val as { content: string; citations: string[] };
      const [chapter, section] = key.split('-');
      return `--- ${chapter}: ${section} ---\n\n${data.content}\n\nCitations:\n${data.citations.map(c => `- ${c}`).join('\n')}\n\n`;
    }).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_Research_Export.txt`;
    link.click();
    
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearAll = () => {
    setResults({});
    setResearchNotes({});
    setSubtopics({});
    setDataset(null);
    setShowClearConfirm(false);
  };

  const currentResult = results[storageKey];

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
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold uppercase tracking-widest text-white">Clear All?</h3>
                <p className="text-xs text-gray-500 leading-relaxed italic">
                  {labels.confirmClear}
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={clearAll}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-rose-600 transition-colors"
                >
                  Confirm Clear
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

      {/* AI Translating Indicator */}
      <AnimatePresence>
        {isTranslating && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-xl px-6 py-2 rounded-full border border-cyan-500/30 flex items-center gap-3 shadow-2xl"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
              <Sparkles size={16} className="text-cyan-500" />
            </motion.div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white">{labels.aiSyncing}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <label className="block">
          <div className="flex items-center gap-1.5 mb-1 ml-1">
             <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">{labels.researchTitle}</span>
             <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full font-bold">{labels.requiredLabel}</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={labels.placeholderTitle}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-serif italic text-lg text-cyan-400"
          />
        </label>

        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold ml-1">{labels.styleLabel}</span>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-sm"
            >
              {REFERENCE_STYLES.map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold ml-1">{labels.langLabel}</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-sm text-cyan-400 font-bold"
            >
              {RESEARCH_LANGUAGES.map(l => <option key={l} value={l} className="bg-black">{l}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 mt-4">
          <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold ml-1">{labels.progressLabel}</span>
          <div className="h-10 mt-1.5 bg-white/5 border border-white/10 rounded-xl px-4 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
            <span>CH {currentChapterIdx + 1}/{totalChapters}</span>
            <div className="flex gap-0.5">
              {RESEARCH_STRUCTURE.map((_, i) => (
                <div key={i} className={cn("w-2 h-1 rounded-full", i <= currentChapterIdx ? "bg-cyan-500" : "bg-white/10")} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
               <FileText size={18} />
             </div>
             <div>
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{currentChapter.chapter}</h3>
               <p className="text-lg font-serif italic mt-1 text-white">{currentSection}</p>
             </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Manual Input Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
               <div className="flex items-center gap-2">
                 <Edit3 size={12} className="text-cyan-500" />
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{labels.notesLabel}</span>
               </div>
               <div className="flex items-center gap-2">
                 <button 
                  onClick={() => setIsAddingNote(!isAddingNote)}
                  className={cn(
                    "p-1 rounded-lg transition-all",
                    isAddingNote ? "text-cyan-500 rotate-45" : "text-gray-500 hover:text-cyan-500 hover:bg-white/5"
                  )}
                 >
                   <Plus size={18} />
                 </button>
                  <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="text-gray-500 hover:text-cyan-500 transition-colors p-1 flex items-center gap-1 group/upload relative"
                   title="Upload Multiple Research Notes"
                  >
                    <div className="relative flex items-center justify-center">
                      <Upload size={18} className="group-hover/upload:scale-110 transition-transform" />
                      <div className="absolute -top-1.5 -right-1.5 bg-cyan-500 text-black rounded-full p-0.5 shadow-sm">
                        <Plus size={8} strokeWidth={4} />
                      </div>
                    </div>
                  </button>
               </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {isAddingNote && (
                  <motion.form 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onSubmit={handleAddNote}
                    className="relative group"
                  >
                    <textarea 
                      autoFocus
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Enter a specific research finding, observation, or data point..."
                      className="w-full min-h-[80px] bg-black/40 border border-cyan-500/30 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all font-light leading-relaxed"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleAddNote();
                        }
                      }}
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <span className="text-[8px] text-gray-600 font-bold uppercase tracking-wider">{labels.shortcutLabel}</span>
                      <button 
                        type="submit"
                        disabled={!newNote.trim()}
                        className="bg-cyan-500 text-black px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-400 disabled:opacity-50 transition-colors"
                      >
                        {labels.addNoteBtn}
                      </button>
                    </div>
                  </motion.form>
                )}

                {(researchNotes[storageKey] || []).map((note, i) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={note + i}
                    className="relative group bg-white/5 border border-white/10 rounded-2xl p-4 transition-all hover:border-cyan-500/30"
                  >
                    <p className="text-sm text-gray-300 font-light leading-relaxed line-clamp-4 italic">
                      {note.startsWith('[File:') ? (
                        <span className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                          <Upload size={12} /> {note.split('\n')[0]}
                        </span>
                      ) : null}
                      {note.startsWith('[File:') ? note.split('\n').slice(1).join('\n') : note}
                    </p>
                    <div className="absolute bottom-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => removeNote(i)}
                        className="p-1.5 text-gray-600 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                      <button 
                        onClick={() => handleGenerate(true)}
                        className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all"
                      >
                        {labels.aiSync}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(!isAddingNote && (!researchNotes[storageKey] || researchNotes[storageKey].length === 0)) && (
                <div className="h-40 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-600 group hover:border-cyan-500/20 transition-all cursor-pointer" onClick={() => setIsAddingNote(true)}>
                  <Edit3 size={24} className="group-hover:text-cyan-500 opacity-20" />
                  <p className="text-[10px] uppercase tracking-[0.2em] font-medium italic">{labels.noNotesLabel}</p>
                </div>
              )}
            </div>
          </div>

          {/* Subtopics Section */}
          <div className="space-y-3">
             <div className="flex items-center justify-between px-1">
               <div className="flex items-center gap-2">
                 <ListTree size={12} className="text-rose-500" />
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{labels.subtopicsLabel}</span>
               </div>
               <button 
                onClick={() => setIsAddingSubtopic(!isAddingSubtopic)}
                className={cn(
                  "transition-all duration-300",
                  isAddingSubtopic ? "text-rose-500 rotate-45" : "text-gray-500 hover:text-rose-500"
                )}
               >
                 <Plus size={18} />
               </button>
             </div>
             
             <div className="flex flex-wrap gap-2">
                <AnimatePresence mode="popLayout">
                  {isAddingSubtopic && (
                       <motion.form 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onSubmit={handleAddSubtopic}
                        className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 rounded-xl px-2 py-1 flex-1 min-w-[200px]"
                      >
                        <input 
                          autoFocus
                          value={newSubtopic}
                          onChange={(e) => setNewSubtopic(e.target.value)}
                          placeholder={labels.subtopicPlaceholder}
                          className="w-full bg-transparent text-xs text-white placeholder:text-rose-500/40 focus:outline-none"
                        />
                        <button type="submit" className="text-rose-500 hover:text-rose-400 p-0.5">
                          <Plus size={14} />
                        </button>
                      </motion.form>
                  )}
                  {(subtopics[storageKey] || []).map((topic, i) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0 }}
                      key={topic + i}
                      className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs group hover:border-rose-500/30 transition-colors"
                    >
                      <span className="text-gray-400 line-clamp-1 max-w-[150px]">{topic}</span>
                      <button 
                        type="button"
                        onClick={() => removeSubtopic(i)}
                        className="text-gray-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {(!isAddingSubtopic && (!subtopics[storageKey] || subtopics[storageKey].length === 0)) && (
                  <p className="text-[10px] text-gray-600 italic ml-1">{labels.noSubtopicsLabel}</p>
                )}
             </div>
          </div>

          <AnimatePresence mode="wait">
            {dataset && currentChapterIdx === 4 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-[2rem] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-cyan-500" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-white">{labels.datasetTitle}</h4>
                  </div>
                  <button 
                    onClick={() => setDataset(null)}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <p className="text-[10px] text-gray-400 italic leading-relaxed">{dataset.description}</p>
                
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        {dataset.headers.map(h => (
                          <th key={h} className="py-2 px-3 text-cyan-500 font-bold uppercase tracking-tighter whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataset.rows.slice(0, 5).map((row, ri) => (
                        <tr key={ri} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          {row.map((val, ci) => (
                            <td key={ci} className="py-2 px-3 text-gray-400 font-light">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Sparkles size={10} className="text-rose-500" />
                    {labels.aiDataSummary}
                  </p>
                  <p className="text-[11px] text-gray-300 leading-relaxed italic">{dataset.summaryStatistics}</p>
                </div>
              </motion.div>
            )}

            {currentResult ? (
              <motion.div
                key={`${storageKey}-result text`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 pt-6 border-t border-white/5"
              >
                <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-sm bg-cyan-500/[0.03] p-6 rounded-[2rem] border border-cyan-500/10">
                  {currentResult.content}
                </div>
                {currentResult.citations.length > 0 && (
                  <div className="pt-6 border-t border-white/5 px-2">
                    <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Globe size={12} className="text-cyan-500" />
                      {labels.generatedSources} ({style})
                    </h5>
                    <ul className="space-y-3">
                      {currentResult.citations.map((c, i) => (
                        <li key={i} className="text-[10px] text-cyan-500/70 italic flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                          <span className="text-rose-500 font-bold">{i + 1}</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={`${storageKey}-empty`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-4 opacity-30"
              >
                <BrainCircuit size={48} className="text-cyan-500" />
                <p className="text-xs max-w-[200px]">{labels.emptyDesc}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {currentChapterIdx === 4 && (
            <button
              onClick={handleGenerateDataset}
              disabled={isGeneratingData || !title}
              className={cn(
                "w-full py-4 mb-4 bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-cyan-500/20 transition-all",
                isGeneratingData && "opacity-50"
              )}
            >
              {isGeneratingData ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                  <span className="text-[8px]">{labels.drafting}</span>
                </motion.div>
              ) : (
                <>
                  <Table size={16} />
                  {labels.generateDataBtn}
                </>
              )}
            </button>
          )}

          {currentSection.includes('Instrument') && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-2 animate-pulse">
              <div className="flex items-center gap-2 mb-1">
                <BrainCircuit size={14} className="text-rose-500" />
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">{labels.protocolLabel}</p>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {labels.protocolDesc}
              </p>
            </div>
          )}

          <button
            onClick={() => handleGenerate(false)}
            disabled={isLoading || !title}
            className={cn(
              "w-full py-5 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-xl font-inherit",
              isLoading 
                ? "bg-gray-800 text-gray-500" 
                : currentSection.includes('Instrument')
                  ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20"
                  : "bg-white text-black hover:bg-gray-200"
            )}
          >
            {isLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <Sparkles size={18} />
              </motion.div>
            ) : (
              <>
                <Sparkles size={18} className={currentSection.includes('Instrument') ? "text-white" : "text-rose-500"} />
                {currentSection.includes('Instrument') 
                  ? labels.adoptQuestionnaireBtn
                  : (currentResult ? labels.generateNewBtn : labels.aiGenerationBtn)}
              </>
            )}
          </button>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-md p-4 border-t border-white/10 flex items-center justify-between">
          <button 
            onClick={handleBack}
            disabled={currentChapterIdx === 0 && currentSectionIdx === 0}
            className="p-3 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{labels.sectionLabel} {currentSectionIdx + 1}/{currentChapter.sections.length}</span>
            <span className="text-[8px] text-cyan-500 font-bold tracking-tighter uppercase mt-1">{labels.documentationLabel}</span>
          </div>

          <button 
            onClick={handleNext}
            disabled={currentChapterIdx === totalChapters - 1 && currentSectionIdx === currentChapter.sections.length - 1}
            className="p-3 text-cyan-400 hover:text-cyan-300 disabled:opacity-20 transition-colors"
          >
            <ArrowRight size={24} />
          </button>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload}
        className="hidden" 
        accept=".txt,.md,.pdf" 
        multiple
      />

      <div className="mt-8 flex gap-3 px-2">
        <button 
          onClick={handleExport}
          disabled={isExporting || Object.keys(results).length === 0}
          className={cn(
            "flex-[2] py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-cyan-500/20",
            (isExporting || Object.keys(results).length === 0) && "opacity-50 grayscale"
          )}
        >
           {isExporting ? (
             <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
               <Save size={20} />
             </motion.div>
           ) : (
             <>
               <Save size={20} />
               {labels.exportBtn}
             </>
           )}
        </button>
        <button 
          onClick={() => setShowClearConfirm(true)}
          className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors group"
        >
          <Trash2 size={20} className="text-gray-500 group-hover:text-rose-500 transition-colors" />
        </button>
      </div>
    </div>
  );
}
