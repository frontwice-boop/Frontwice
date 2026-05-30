import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, X, Trash2, ChevronDown, ChevronUp, Bug, Cloud, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import { runCloudDiagnostics } from '../services/cloudDiagnostics';

interface LogEntry {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  details?: any;
}

export const DebugConsole: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const addLog = (type: LogEntry['type'], ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      const newEntry: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        message,
        timestamp: new Date(),
        details: args.length > 1 ? args : undefined
      };

      setLogs(prev => [...prev.slice(-100), newEntry]); // Keep last 100 logs
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', ...args);
    };
    console.error = (...args) => {
      originalError(...args);
      addLog('error', ...args);
    };
    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', ...args);
    };
    console.info = (...args) => {
      originalInfo(...args);
      addLog('info', ...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const clearLogs = () => setLogs([]);

  const handleRunDiagnostics = async () => {
    if (isDiagnosing) return;
    setIsDiagnosing(true);
    await runCloudDiagnostics();
    setIsDiagnosing(false);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        id="debug-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 z-50 p-3 bg-zinc-900 border border-white/10 rounded-full shadow-xl text-rose-500 hover:scale-110 active:scale-95 transition-all opacity-20 hover:opacity-100"
        title="Toggle Debug Console"
      >
        <Bug size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isExpanded ? '80vh' : '40vh'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-black/95 backdrop-blur-2xl border-t border-white/10 flex flex-col font-mono"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-zinc-900/50">
              <div className="flex items-center gap-2 text-rose-500">
                <Terminal size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">System Console</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleRunDiagnostics} 
                  disabled={isDiagnosing}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 border border-white/10 text-[9px] font-bold uppercase tracking-tighter hover:bg-zinc-700 transition-colors",
                    isDiagnosing ? "text-cyan-500 animate-pulse" : "text-cyan-400"
                  )}
                  title="Run Cloud Diagnostics"
                >
                  <Cloud size={12} />
                  {isDiagnosing ? 'Running...' : 'Run Cloud'}
                </button>
                <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-500 hover:text-white p-1">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                <button onClick={clearLogs} className="text-gray-500 hover:text-rose-500 p-1" title="Clear Logs">
                  <Trash2 size={14} />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white p-1">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Logs Body */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-1.5 text-[11px] selection:bg-rose-500/30"
            >
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2 opacity-50">
                  <Bug size={24} />
                  <span>No logs captured yet</span>
                </div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 group animate-in fade-in slide-in-from-left-1 duration-200">
                  <span className="text-gray-600 shrink-0 select-none">
                    {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <div className={`
                    break-all whitespace-pre-wrap
                    ${log.type === 'error' ? 'text-rose-400' : ''}
                    ${log.type === 'warn' ? 'text-amber-400' : ''}
                    ${log.type === 'info' ? 'text-sky-400' : ''}
                    ${log.type === 'log' ? 'text-gray-300' : ''}
                  `}>
                    <span className="font-bold opacity-50 mr-2">[{log.type.toUpperCase()}]</span>
                    {log.message}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
