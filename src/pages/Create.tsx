import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PenTool, UserCircle, Star, SearchCode, ChevronRight, Sparkles, GraduationCap } from 'lucide-react';
import CreativeSuite from '../components/Create/CreativeSuite';
import ResearchBuilder from '../components/Create/ResearchBuilder';
import BiographyBuilder from '../components/Create/BiographyBuilder';
import AdCampaignManager from '../components/Create/AdCampaignManager';
import { cn } from '../lib/utils';


import { translateUI, hasCache } from '../services/translationService';

type CreateMode = 'creative' | 'biography' | 'research' | 'ad' | 'expert';

const DEFAULT_LABELS = {
  backBtn: 'Back to Tools',
  backAdBtn: 'Back to Ad Suite',
  creationHubTitle: 'Creation Hub',
  creationHubDesc: 'What do you want to build today?',
  creativeTitle: 'Write something...',
  creativeDesc: 'Choose your medium and let your creativity flow.',
  biographyTitle: 'Biography Builder',
  biographyDesc: 'Map your life milestones and weave a legacy narrative.',
  researchTitle: 'Research Publisher',
  researchDesc: 'Write, upload, and format your research paper directly, with zero AI involvement.',
  adTitle: 'Ad Campaign Manager',
  adDesc: 'Generate reach and growth.',
  expertTitle: 'Expert AI Reviewer',
  expertDesc: 'Get professional feedback on your writing quality.',
  aiAssistantTitle: 'AI Writing Assistant',
  aiAssistantDesc: 'Our integrated Gemini AI can help you expand chapters, generate character cards, or refine your research citations.',
  dbError: 'Database signal disrupted. Please check your connection or retry.',
  tools: {
    creative: { label: 'Creative Suite', desc: 'Prose, Drama, Poetry, Research' },
    biography: { label: 'Biography Builder', desc: 'Timeline & AI expansion' },
    research: { label: 'Research Publication', desc: 'Direct manuscript submission' },
    ad: { label: 'Ad Campaign', desc: 'Reach more readers' },
    expert: { label: 'Expert Review', desc: 'Professional AI Feedback' }
  }
};

const TOOLS_BASE = [
  { id: 'creative', icon: PenTool },
  { id: 'biography', icon: UserCircle },
  { id: 'research', icon: SearchCode },
  { id: 'expert', icon: GraduationCap },
  { id: 'ad', icon: Star, restricted: true },
];

import { generateExpertReview } from '../services/ai';
import { useToast } from '../context/ToastContext';

export default function Create({ lang, user, setLang }: { lang: string; user: any; setLang: (l: string) => void }) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<CreateMode | null>(null);
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [isTranslating, setIsTranslating] = useState(false);
  const [textToReview, setTextToReview] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [expertResult, setExpertResult] = useState<any>(null);

  const handleExpertReview = async () => {
    if (!textToReview.trim()) return showToast('Please enter some text to review.', 'warning');
    setIsReviewing(true);
    try {
      const data = await generateExpertReview({
        content: textToReview,
        language: lang
      }, (partial) => {
        // partial is the raw JSON string so far
        try {
          // Attempt a very loose parse just for the summary to show progress
          const summaryMatch = partial.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)/i);
          if (summaryMatch && summaryMatch[1]) {
            setExpertResult((prev: any) => ({
              ...prev,
              summary: summaryMatch[1].replace(/\\n/g, '\n')
            }));
          }
        } catch (e) {}
      });
      setExpertResult(data);
      showToast('Expert review completed!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to get expert review.', 'error');
    } finally {
      setIsReviewing(false);
    }
  };

  React.useEffect(() => {
    const applyTranslation = async () => {
      if (lang !== 'English') {
        const cacheKey = `ui_${lang}_${Object.keys(DEFAULT_LABELS).length}`;
        if (!hasCache(cacheKey)) {
          setIsTranslating(true);
        }
        
        const translated = await translateUI(DEFAULT_LABELS, lang);
        if (translated) setLabels(translated);
        setIsTranslating(false);
      } else {
        setLabels(DEFAULT_LABELS);
      }
    };
    applyTranslation();
  }, [lang]);

  const TOOLS = TOOLS_BASE.map(tool => ({
    ...tool,
    label: labels.tools[tool.id as keyof typeof labels.tools].label,
    desc: labels.tools[tool.id as keyof typeof labels.tools].desc,
  }));

  const visibleTools = TOOLS.filter(tool => !tool.restricted || user?.email === 'frontwice@gmail.com');

  if (mode === 'creative') {
    return (
      <div className="p-4 pt-10 pb-24 h-full overflow-y-auto no-scrollbar">
        <button 
          onClick={() => setMode(null)}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="rotate-180" size={20} />
          <span>{labels.backBtn}</span>
        </button>
        <h1 className="text-3xl font-serif italic mb-2 px-2">{labels.creativeTitle}</h1>
        <p className="text-gray-400 text-sm mb-8 px-2">{labels.creativeDesc}</p>
        <CreativeSuite lang={lang} setLang={setLang} />
      </div>
    );
  }

  if (mode === 'biography') {
    return (
      <div className="p-4 pt-10 pb-24 h-full overflow-y-auto no-scrollbar">
        <button 
          onClick={() => setMode(null)}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="rotate-180" size={20} />
          <span>{labels.backBtn}</span>
        </button>
        <h1 className="text-3xl font-serif italic mb-2 px-2">{labels.biographyTitle}</h1>
        <p className="text-gray-400 text-sm mb-8 px-2">{labels.biographyDesc}</p>
        <BiographyBuilder lang={lang} setLang={setLang} />
      </div>
    );
  }

  if (mode === 'research') {
    return (
      <div className="p-4 pt-10 pb-24 h-full overflow-y-auto no-scrollbar">
        <button 
          onClick={() => setMode(null)}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="rotate-180" size={20} />
          <span>{labels.backBtn}</span>
        </button>
        <h1 className="text-3xl font-serif italic mb-2 px-2">{labels.researchTitle}</h1>
        <p className="text-gray-400 text-sm mb-8 px-2">{labels.researchDesc}</p>
        <ResearchBuilder lang={lang} setLang={setLang} />
      </div>
    );
  }

  if (mode === 'expert') {
    return (
      <div className="p-4 pt-10 pb-24 h-full overflow-y-auto no-scrollbar">
        <button 
          onClick={() => setMode(null)}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="rotate-180" size={20} />
          <span>{labels.backBtn}</span>
        </button>
        <h1 className="text-3xl font-serif italic mb-2 px-2 text-cyan-400">{labels.expertTitle}</h1>
        <p className="text-gray-400 text-sm mb-8 px-2">{labels.expertDesc}</p>
        
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto border border-cyan-500/20">
            <GraduationCap size={40} className="text-cyan-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Expert Analysis Dashboard</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">Upload your draft or paste your text below to receive a deep-dive analysis into your narrative structure and character development.</p>
          </div>
          <textarea 
            value={textToReview}
            onChange={(e) => setTextToReview(e.target.value)}
            placeholder="Paste your excerpt here for evaluation..."
            className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
          <button 
            onClick={handleExpertReview}
            disabled={isReviewing || !textToReview.trim()}
            className={cn(
              "w-full py-4 bg-cyan-500 text-black font-black rounded-xl hover:bg-cyan-400 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2",
              (isReviewing || !textToReview.trim()) && "opacity-50"
            )}
          >
            {isReviewing ? (
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
                <Sparkles size={16} />
              </motion.div>
            ) : (
              <>
                <Sparkles size={16} />
                Begin Expert Review
              </>
            )}
          </button>

          {expertResult && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 space-y-6 text-left"
            >
              <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl border border-cyan-500/30">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Overall Quality Score</span>
                <span className="text-3xl font-black text-cyan-400">{expertResult.overallScore}%</span>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                <p className="text-sm font-light italic text-gray-300 leading-relaxed border-l-2 border-rose-500 pl-4">{expertResult.summary}</p>
                
                <div className="grid grid-cols-1 gap-4 mt-6">
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-bold text-cyan-500 uppercase tracking-tighter">Narrative Structure</h5>
                    <p className="text-xs text-gray-400 leading-relaxed">{expertResult.analysis.structure}</p>
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">Character Development</h5>
                    <p className="text-xs text-gray-400 leading-relaxed">{expertResult.analysis.characters}</p>
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-bold text-purple-500 uppercase tracking-tighter">Prose & Style</h5>
                    <p className="text-xs text-gray-400 leading-relaxed">{expertResult.analysis.style}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                 <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">Expert Recommendations</h5>
                 <div className="space-y-2">
                   {expertResult.recommendations.map((rec: string, i: number) => (
                     <div key={i} className="flex gap-3 bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/10">
                       <span className="text-cyan-400 font-bold">0{i+1}</span>
                       <p className="text-xs text-gray-300 leading-relaxed">{rec}</p>
                     </div>
                   ))}
                 </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'ad') {
    return (
      <div className="p-4 pt-10 pb-24 h-full overflow-y-auto no-scrollbar">
        <button 
          onClick={() => setMode(null)}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="rotate-180" size={20} />
          <span>{labels.backAdBtn}</span>
        </button>
        <h1 className="text-3xl font-serif italic mb-2 px-2 text-rose-500">{labels.adTitle}</h1>
        <p className="text-gray-400 text-sm mb-8 px-2">Exclusively for @{user?.username || user?.email?.split('@')[0] || 'frontwice'}. {labels.adDesc}</p>
        <AdCampaignManager lang={lang} setLang={setLang} />
      </div>
    );
  }

  return (
    <div className="p-4 pt-10 pb-24 h-full overflow-y-auto no-scrollbar relative">
      {/* AI Translating Indicator */}
      <AnimatePresence>
        {isTranslating && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1 rounded-full border border-rose-500/30 flex items-center gap-2 z-50 shadow-xl"
          >
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
              <Sparkles className="text-rose-500" size={12} />
            </motion.div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-white italic">AI Syncing Hub...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <h1 className="text-3xl font-serif italic mb-2 px-2">{labels.creationHubTitle}</h1>
      <p className="text-gray-400 text-sm mb-8 px-2">{labels.creationHubDesc}</p>
      
      <div className="space-y-3">
        {visibleTools.map((tool) => (
          <motion.button
            key={tool.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode(tool.id as CreateMode)}
            className={cn(
              "w-full flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors text-left group",
              tool.id === 'ad' && "border-rose-500/30 bg-rose-500/5 shadow-lg shadow-rose-500/5"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform",
              tool.id === 'ad' ? "bg-rose-500/20 text-rose-500" : "bg-rose-500/10 text-rose-500"
            )}>
              <tool.icon size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{tool.label}</h3>
              <p className="text-xs text-gray-500">{tool.desc}</p>
            </div>
            <ChevronRight className="text-gray-600 group-hover:text-white transition-colors" size={20} />
          </motion.button>
        ))}
      </div>

      <div className="mt-12 p-6 bg-gradient-to-br from-rose-500/10 to-cyan-500/10 rounded-3xl border border-white/5">
        <h4 className="font-serif italic text-xl mb-2">{labels.aiAssistantTitle}</h4>
        <p className="text-sm text-gray-400 leading-relaxed mb-4">
          {labels.aiAssistantDesc}
        </p>
        <div className="h-1 w-12 bg-rose-500 rounded-full" />
      </div>
    </div>
  );
}
