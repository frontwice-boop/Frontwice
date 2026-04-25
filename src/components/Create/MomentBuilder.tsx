import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Video, Plus, Trash2, Sparkles, Wand2, Music, Play, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

import { useToast } from '../../context/ToastContext';

export default function MomentBuilder() {
  const { showToast } = useToast();
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isCompiled, setIsCompiled] = useState(false);
  const [isMusicSynced, setIsMusicSynced] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files) as File[];
      fileArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const generateAIVersion = () => {
    if (images.length === 0) return showToast('Add some pictures first!', 'warning');
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      showToast('AI Video Concept Generated! Processing clips...', 'success');
    }, 2000);
  };

  const handleCompile = async () => {
    if (images.length === 0) return showToast('Add media before compiling!', 'warning');
    setIsCompiling(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsCompiling(false);
    setIsCompiled(true);
    showToast('Moment compiled and ready!', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="block">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Moment Caption</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's the vibe of this moment?"
            className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-sm min-h-[100px]"
          />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Camera size={14} className="text-cyan-500" />
              Capture Gallery
            </h3>
            <span className="text-[10px] text-gray-600 font-bold uppercase">{images.length} / 12 PICS</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="aspect-square rounded-xl overflow-hidden relative group"
              >
                <img src={img} alt="Moment" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </motion.div>
            ))}
            {images.length < 12 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-white/5 border border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors group"
              >
                <Plus size={24} className="text-gray-600 group-hover:text-cyan-500 transition-colors" />
                <span className="text-[8px] font-bold text-gray-600 uppercase">Add Media</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        multiple 
        accept="image/*" 
        className="hidden" 
        onChange={handleImageUpload} 
      />

       <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={generateAIVersion}
          disabled={isGenerating || images.length === 0}
          className="py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          {isGenerating ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
              <Wand2 size={16} />
            </motion.div>
          ) : (
            <>
              <Wand2 size={16} className="text-cyan-500" />
              AI Storyboard
            </>
          )}
        </button>
        <button 
          onClick={() => setIsMusicSynced(!isMusicSynced)}
          className={cn(
            "py-4 border rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all",
            isMusicSynced ? "bg-rose-500 border-rose-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
          )}
        >
          <Music size={16} className={cn("transition-colors", isMusicSynced ? "text-white" : "text-rose-500")} />
          {isMusicSynced ? 'Sync Active' : 'Music Sync'}
        </button>
      </div>

      {isCompiled ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full py-5 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <Check size={20} />
            MOMENT COMPILED
          </div>
          <span className="text-[10px] uppercase tracking-widest opacity-60">Ready for sharing</span>
        </motion.div>
      ) : (
        <button 
          onClick={handleCompile}
          disabled={isCompiling || images.length === 0}
          className={cn(
            "w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-white",
            isCompiling && "opacity-50 grayscale"
          )}
        >
          {isCompiling ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
              <Sparkles size={20} />
            </motion.div>
          ) : (
            <>
              <Play size={20} fill="currentColor" />
              Compile Moment
            </>
          )}
        </button>
      )}
    </div>
  );
}
