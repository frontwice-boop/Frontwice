import React, { useState, useEffect } from 'react';
import { Search, Filter, Upload, BookOpen, GraduationCap, Calendar, Building, PlusCircle, X, ChevronDown, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { translateLibrary, translateUI, hasCache } from '../services/translationService';
import { LANGUAGES } from '../constants';

const INITIAL_WORKS = [
  { title: "The Impact of AI on Literary Criticism", auth: "Dr. Sarah Jenkins", year: "2024", dept: "Dept. of Literature", uni: "Oxford University" },
  { title: "Neurosemantics in Flash Fiction", auth: "Marcus Thorne", year: "2023", dept: "Cognitive Science", uni: "MIT" },
  { title: "Gothic Tropes in Digital Narratives", auth: "Elena Volkov", year: "2025", dept: "Cultural Studies", uni: "Berlin Institute" }
];

const TRANSLATION_LANGUAGES = LANGUAGES.map(l => l.name);

const DEFAULT_UI = {
  title: 'Research Library',
  catalogingLabel: 'AI Cataloging Research...',
  newEntryLabel: 'New Research Entry',
  placeholderTitle: 'Research Title...',
  manuscriptLabel: 'Select Manuscript (PDF/DOCX)',
  researcherLabel: 'RESEARCHER',
  yearLabel: 'YEAR',
  institutionLabel: 'INSTITUTION',
  departmentLabel: 'DEPARTMENT',
  publishBtn: 'Publish Research',
  searchPlaceholder: 'Search by title, researcher, institution...',
  allYears: 'All Years',
  institutionFilter: 'Institution'
};

import { useToast } from '../context/ToastContext';

export default function Library({ lang }: { lang: string }) {
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [works, setWorks] = useState(INITIAL_WORKS);
  const [ui, setUi] = useState(DEFAULT_UI);

  // New states for functionality
  const [newWork, setNewWork] = useState({ title: '', auth: '', year: '', dept: '', uni: '' });
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedInst, setSelectedInst] = useState('All');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const applyTranslation = async () => {
      if (lang !== 'English' && TRANSLATION_LANGUAGES.includes(lang)) {
        const libCacheKey = `library_${lang}_${works.length}`;
        const uiCacheKey = `ui_${lang}_${Object.keys(DEFAULT_UI).length}`;

        if (!hasCache(libCacheKey) || !hasCache(uiCacheKey)) {
          setIsTranslating(true);
        }

        const translated = await translateLibrary(INITIAL_WORKS, lang);
        setWorks(translated);
        
        const translatedUI = await translateUI(DEFAULT_UI, lang);
        if (translatedUI) setUi(translatedUI);
        
        setIsTranslating(false);
      } else {
        setWorks(INITIAL_WORKS);
        setUi(DEFAULT_UI);
      }
    };
    applyTranslation();
  }, [lang]);

  const handlePublish = () => {
    if (!newWork.title || !newWork.auth || !newWork.year) {
      showToast('Please fill in required fields: Title, Researcher, and Year.', 'error');
      return;
    }
    setWorks(prev => [newWork, ...prev]);
    showToast('Research published successfully!', 'success');
    setIsFormOpen(false);
    setNewWork({ title: '', auth: '', year: '', dept: '', uni: '' });
  };

  const filteredWorks = works.filter(w => {
    const matchesSearch = w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.auth.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.uni.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesYear = selectedYear === 'All' || w.year === selectedYear;
    const matchesInst = selectedInst === 'All' || w.uni.toLowerCase().includes(selectedInst.toLowerCase());
    
    return matchesSearch && matchesYear && matchesInst;
  });

  const years = Array.from(new Set(works.map(w => w.year))).sort((a, b) => (b as string).localeCompare(a as string));
  const institutions = Array.from(new Set(works.map(w => w.uni))).sort();

  return (
    <div className="p-4 pt-10 pb-24 h-full overflow-y-auto no-scrollbar relative">
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
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white">{ui.catalogingLabel}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8 px-2">
        <h1 className="text-3xl font-serif italic">{ui.title}</h1>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className={cn(
            "p-2 rounded-full transition-all shadow-lg",
            isFormOpen ? "bg-white text-black rotate-45" : "bg-cyan-500 text-black hover:scale-110"
          )}
        >
          <PlusCircle size={24} />
        </button>
      </div>

      {/* Elite Excerpts Row */}
      <div className="mb-10 px-2 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Elite Excerpts</h3>
          <span className="text-[8px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold">TOP READS</span>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {[
            { t: 'Echoes of Silence', a: 'Elena V.' },
            { t: 'The Last Verse', a: 'Victor H.' },
            { t: 'Gothic Digital', a: 'Sarah J.' },
            { t: 'Neuro-Fiction', a: 'Marcus T.' }
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02 }}
              className="min-w-[160px] bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col gap-3 group cursor-pointer"
              onClick={() => showToast(`Opening Excerpt: ${item.t}`, 'info')}
            >
              <div className="w-full aspect-[4/3] bg-zinc-900 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden group-hover:border-rose-500/30 transition-colors">
                <BookOpen size={24} className="text-white/20 group-hover:text-rose-500 transition-colors" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                  <span className="text-[8px] font-bold text-white/40 group-hover:text-white transition-colors uppercase">Excerpt View</span>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-white truncate">{item.t}</h4>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter truncate">by {item.a}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {/* Simple Sheet Research Form */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0, y: -20 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -20 }}
              className="overflow-hidden"
            >
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 mb-8 shadow-2xl backdrop-blur-md space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                    <Upload size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{ui.newEntryLabel}</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="group relative">
                    <input 
                      type="text" 
                      value={newWork.title}
                      onChange={(e) => setNewWork(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={ui.placeholderTitle} 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-serif italic text-white"
                    />
                  </div>

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-32 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-2 text-gray-600 hover:border-cyan-500/20 transition-all cursor-pointer bg-black/20"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={() => showToast('Manuscript secured.', 'success')}
                    />
                    <Upload size={24} className="opacity-20" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">{ui.manuscriptLabel}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" />
                      <input 
                        type="text" 
                        value={newWork.auth}
                        onChange={(e) => setNewWork(prev => ({ ...prev, auth: e.target.value }))}
                        placeholder={ui.researcherLabel} 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-cyan-500/30" 
                      />
                    </div>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" />
                      <input 
                        type="number" 
                        value={newWork.year}
                        onChange={(e) => setNewWork(prev => ({ ...prev, year: e.target.value }))}
                        placeholder={ui.yearLabel} 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-cyan-500/30" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div className="relative">
                      <Building size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" />
                      <input 
                        type="text" 
                        value={newWork.uni}
                        onChange={(e) => setNewWork(prev => ({ ...prev, uni: e.target.value }))}
                        placeholder={ui.institutionLabel} 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-cyan-500/30" 
                      />
                    </div>
                    <div className="relative">
                      <GraduationCap size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" />
                      <input 
                        type="text" 
                        value={newWork.dept}
                        onChange={(e) => setNewWork(prev => ({ ...prev, dept: e.target.value }))}
                        placeholder={ui.departmentLabel} 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-cyan-500/30" 
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handlePublish}
                    className="w-full py-4 bg-cyan-500 text-black font-bold rounded-2xl text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-2"
                  >
                    {ui.publishBtn}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing Browse Experience */}
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ui.searchPlaceholder}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors appearance-none focus:outline-none"
              >
                <option value="All">{ui.allYears}</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" />
            </div>
            
            <div className="relative">
              <select 
                value={selectedInst}
                onChange={(e) => setSelectedInst(e.target.value)}
                className="w-full flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors appearance-none focus:outline-none"
              >
                <option value="All">{ui.institutionFilter}</option>
                {institutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" />
            </div>
          </div>

          <div className="space-y-4">
             {filteredWorks.map((work, i) => (
               <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-4 hover:bg-white/10 transition-all cursor-pointer shadow-lg group"
               >
                 <div className="flex items-start justify-between">
                   <div className="space-y-2">
                     <h3 className="font-serif italic text-xl text-white group-hover:text-cyan-400 transition-colors leading-tight">{work.title}</h3>
                     <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{work.auth} <span className="text-cyan-500/40 mx-2">•</span> {work.year}</p>
                   </div>
                   <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                    <BookOpen size={20} />
                   </div>
                 </div>
                 <div className="flex flex-wrap gap-4 text-[9px] text-gray-600 font-bold uppercase tracking-widest border-t border-white/5 pt-4">
                   <span className="flex items-center gap-1.5"><GraduationCap size={12} className="text-rose-500" /> {work.dept}</span>
                   <span className="flex items-center gap-1.5"><Building size={12} className="text-rose-500" /> {work.uni}</span>
                 </div>
               </motion.div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
