import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  React.useEffect(() => {
    const handleQuotaError = (e: Event) => {
       const detail = (e as CustomEvent).detail || 'Database quota exceeded. Check again tomorrow.';
       showToast(detail, 'error');
    };
    const handleGeneralError = (e: Event) => {
       const detail = (e as CustomEvent).detail || 'Operation failed. Check signal.';
       showToast(detail, 'error');
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaError);
    window.addEventListener('firestore-error', handleGeneralError);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaError);
      window.removeEventListener('firestore-error', handleGeneralError);
    };
  }, [showToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const renderMessage = (msg: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = msg.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        let label = " [Link]";
        if (part.includes("/project/")) {
          label = " [Open Firebase Console ↗]";
        } else if (part.includes("pricing")) {
          label = " [View Pricing Limits ↗]";
        }
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-amber-400 hover:text-amber-300 font-extrabold tracking-normal normal-case inline-block ml-1 pointer-events-auto"
          >
            {label}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-3 w-[90%] max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
            >
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border",
                toast.type === 'success' && "bg-green-500/10 border-green-500/20 text-green-500",
                toast.type === 'error' && "bg-rose-500/10 border-rose-500/20 text-rose-500",
                toast.type === 'warning' && "bg-orange-500/10 border-orange-500/20 text-orange-500",
                toast.type === 'info' && "bg-cyan-500/10 border-cyan-500/20 text-cyan-500",
              )}>
                <div className="flex-shrink-0">
                  {toast.type === 'success' && <CheckCircle2 size={18} />}
                  {toast.type === 'error' && <AlertCircle size={18} />}
                  {toast.type === 'warning' && <Info size={18} />}
                  {toast.type === 'info' && <Bell size={18} />}
                </div>
                <p className="text-xs font-bold uppercase tracking-wider leading-relaxed flex-1 break-words">
                  {renderMessage(toast.message)}
                </p>
                <button 
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
