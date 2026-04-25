import React, { useState, useEffect } from 'react';
import { Search, Plus, MessageCircle, Sparkles, ChevronLeft, Send, MoreVertical, Phone, Video, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translateChats, translateUI, hasCache } from '../services/translationService';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { LANGUAGES } from '../constants';

const INITIAL_CHATS = [
  { id: '1', name: 'Elite Poets Society', lastMsg: 'The new drama script is ready!', time: '12:45', unread: 2 },
  { id: '2', name: 'Dr. Sarah Jenkins', lastMsg: 'Thank you for your feedback on...', time: 'Yesterday', unread: 0 },
  { id: '3', name: 'frontwice AI Assistant', lastMsg: 'I have some suggestions for your...', time: 'Mon', unread: 0 },
];

const TRANSLATION_LANGUAGES = LANGUAGES.map(l => l.name);

const DEFAULT_UI = {
  title: 'Messages',
  decodingLabel: 'AI Decoding Messages...',
  searchPlaceholder: 'Search chats...',
  communityTitle: 'Community Chat',
  communityDesc: 'Connect with fellow researchers and writers worldwide.',
  online: 'Online',
  typePlaceholder: 'Type a message...'
};

export default function Chat({ lang }: { lang: string }) {
  const { showToast } = useToast();
  const [isTranslating, setIsTranslating] = useState(false);
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [ui, setUi] = useState(DEFAULT_UI);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, any[]>>({
    '1': [
      { id: 'm1', text: 'Hello everyone!', sender: 'Marcus', time: '12:00', mine: false },
      { id: 'm2', text: 'The new drama script is ready!', sender: 'Sarah', time: '12:45', mine: false },
    ]
  });
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const applyTranslation = async () => {
      if (lang !== 'English' && TRANSLATION_LANGUAGES.includes(lang)) {
        const chatsCacheKey = `chats_${lang}_${INITIAL_CHATS.length}`;
        const uiCacheKey = `ui_${lang}_${Object.keys(DEFAULT_UI).length}`;

        if (!hasCache(chatsCacheKey) || !hasCache(uiCacheKey)) {
          setIsTranslating(true);
        }

        const translated = await translateChats(INITIAL_CHATS, lang);
        setChats(translated || INITIAL_CHATS);
        
        const translatedUI = await translateUI(DEFAULT_UI, lang);
        if (translatedUI) setUi(translatedUI);
        
        setIsTranslating(false);
      } else {
        setChats(INITIAL_CHATS);
        setUi(DEFAULT_UI);
      }
    };
    applyTranslation();
  }, [lang]);

  const handleSendMessage = () => {
    if (!selectedChatId || !inputValue.trim()) return;
    const msg = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'Me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mine: true
    };
    setMessages(prev => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), msg]
    }));
    setInputValue('');
  };

  const handleCall = () => {
    showToast('Secure audio link established.', 'info');
  };

  const handleVideoCall = () => {
    showToast('Encrypted video stream initializing...', 'info');
  };

  const handleMoreActions = () => {
    showToast('Archive protocols active.', 'info');
  };

  const handleNewChat = () => {
    showToast('Searching for verified collaborators...', 'info');
  };

  const selectedChat = chats.find(c => c.id === selectedChatId);

  if (selectedChatId) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 no-scrollbar overflow-hidden relative">
        {/* Chat Header */}
        <div className="p-4 pt-10 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedChatId(null)}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-600 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-500/20">
                {selectedChat?.name[0]}
              </div>
              <div>
                <h3 className="font-bold text-sm">{selectedChat?.name}</h3>
                <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest">{ui.online}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
             <button 
              onClick={handleCall}
              className="p-2 text-gray-400 hover:text-white transition-colors"
             >
               <Phone size={20} />
             </button>
             <button 
              onClick={handleVideoCall}
              className="p-2 text-gray-400 hover:text-white transition-colors"
             >
               <Video size={20} />
             </button>
             <button 
              onClick={handleMoreActions}
              className="p-2 text-gray-400 hover:text-white transition-colors"
             >
               <MoreVertical size={20} />
             </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          {(messages[selectedChatId] || []).map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, x: msg.mine ? 20 : -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              className={cn(
                "flex flex-col max-w-[80%] space-y-1",
                msg.mine ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              {!msg.mine && <span className="text-[10px] text-gray-500 font-bold ml-2 uppercase tracking-widest">{msg.sender}</span>}
              <div className={cn(
                "px-4 py-2.5 rounded-2xl text-sm shadow-xl",
                msg.mine 
                  ? "bg-rose-600 text-white rounded-tr-none border border-rose-500/30" 
                  : "bg-white/5 text-gray-200 border border-white/10 rounded-tl-none"
              )}>
                {msg.text}
              </div>
              <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tight">{msg.time}</span>
            </motion.div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 bg-black/40 backdrop-blur-xl border-t border-white/5 pb-10 sm:pb-4">
          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={ui.typePlaceholder}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all font-medium"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="p-4 bg-rose-600 rounded-2xl text-white shadow-xl shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-40"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-10 pb-24 h-full flex flex-col no-scrollbar overflow-hidden relative">
      {/* AI Translating Indicator */}
      <AnimatePresence>
        {isTranslating && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-xl px-6 py-2 rounded-full border border-cyan-500/30 flex items-center gap-3 shadow-2xl"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
              <Sparkles size={16} className="text-cyan-500" />
            </motion.div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white">{ui.decodingLabel}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8 px-2">
        <h1 className="text-3xl font-serif italic">{ui.title}</h1>
        <button 
          onClick={handleNewChat}
          className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
        >
          <Plus size={24} className="text-cyan-400" />
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input 
          type="text" 
          placeholder={ui.searchPlaceholder}
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-xl"
        />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
        {chats.map((chat, i) => (
          <motion.button 
            key={chat.id}
            onClick={() => setSelectedChatId(chat.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
          >
            <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl uppercase border-2 border-black shadow-lg">
              {chat.name[0]}
            </div>
            <div className="flex-1 text-left">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">{chat.name}</h3>
                <span className="text-[10px] text-gray-500">{chat.time}</span>
              </div>
              <p className="text-xs text-gray-400 line-clamp-1 mt-1 font-medium group-hover:text-gray-300">
                {chat.lastMsg}
              </p>
            </div>
            {chat.unread > 0 && (
              <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black border shadow-lg">
                {chat.unread}
              </div>
            )}
          </motion.button>
        ))}
      </div>

      <div 
        onClick={() => showToast('Connecting to global community archive...', 'info')}
        className="mt-8 p-6 bg-white/5 rounded-3xl border border-white/10 flex items-center gap-4 group hover:bg-white/10 transition-all cursor-pointer"
      >
        <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all">
          <MessageCircle size={24} />
        </div>
        <div>
          <p className="font-bold text-sm">{ui.communityTitle}</p>
          <p className="text-[10px] text-gray-500">{ui.communityDesc}</p>
        </div>
      </div>
    </div>
  );
}
