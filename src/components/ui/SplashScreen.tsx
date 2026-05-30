import React from 'react';
import { motion } from 'motion/react';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-6 text-center">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-rose-500 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="z-10 relative"
      >
        <motion.h1 
          initial={{ letterSpacing: "0.2em" }}
          animate={{ letterSpacing: "0.05em" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-serif italic mb-4 bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent lowercase"
        >
          frontwice
        </motion.h1>
        
        <div className="relative mt-8">
           <div className="h-0.5 w-32 bg-white/10 rounded-full mx-auto overflow-hidden">
             <motion.div 
               initial={{ x: "-100%" }}
               animate={{ x: "100%" }}
               transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
               className="h-full w-1/3 bg-gradient-to-r from-rose-500 to-cyan-500"
             />
           </div>
           <p className="mt-4 text-[10px] text-gray-500 uppercase tracking-[0.5em] font-bold animate-pulse">
             Legacy Protocol
           </p>
        </div>
      </motion.div>
    </div>
  );
}
