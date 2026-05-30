import React, { useState, useEffect } from 'react';
import { Home, Library, PlusCircle, MessageSquare, User, Video } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { translateNavigation } from '../services/translationService';

const DEFAULT_ITEMS = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Video, label: 'Moments', path: '/moments' },
  { icon: Library, label: 'Library', path: '/library' },
  { icon: PlusCircle, label: '', path: '/create', isCenter: true },
  { icon: MessageSquare, label: 'Chat', path: '/chat' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export default function BottomNav({ lang }: { lang: string }) {
  const [items, setItems] = useState(DEFAULT_ITEMS);

  useEffect(() => {
    const updateNav = async () => {
      if (lang !== 'English') {
        const translatedLabels = await translateNavigation(lang);
        const newItems = [...DEFAULT_ITEMS];
        newItems[0] = { ...newItems[0], label: translatedLabels[0] };
        newItems[1] = { ...newItems[1], label: translatedLabels[1] };
        newItems[2] = { ...newItems[2], label: translatedLabels[2] };
        newItems[4] = { ...newItems[4], label: translatedLabels[3] };
        newItems[5] = { ...newItems[5], label: translatedLabels[4] };
        setItems(newItems);
      } else {
        setItems(DEFAULT_ITEMS);
      }
    };
    updateNav();
  }, [lang]);

  return (
    <nav className="absolute bottom-0 left-0 right-0 h-16 bg-black/60 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-2 z-50 transition-all">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center transition-colors",
              item.isCenter ? "text-white" : isActive ? "text-white" : "text-gray-500",
              !item.isCenter && "hover:text-white"
            )
          }
        >
          {item.isCenter ? (
            <div className="relative -top-2">
              <div className="absolute inset-0 bg-cyan-400 rounded-lg -left-1.5 translate-y-0.5" />
              <div className="absolute inset-0 bg-rose-500 rounded-lg -right-1.5 translate-y-0.5" />
              <div className="relative bg-white text-black rounded-lg p-1.5 flex items-center justify-center">
                 <item.icon size={28} strokeWidth={2.5} />
              </div>
            </div>
          ) : (
            <>
              <item.icon size={24} strokeWidth={2} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
