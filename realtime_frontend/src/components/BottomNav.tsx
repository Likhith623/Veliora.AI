'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, MessageCircle, Gamepad2, User, Bell } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/matching', icon: Users, label: 'Match' },
  { href: '/family-rooms', icon: MessageCircle, label: 'Rooms' },
  { href: '/games', icon: Gamepad2, label: 'Games' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Don't show bottom nav on landing, login, signup, or active chat conversation pages
  const hiddenPaths = ['/', '/login', '/signup', '/verify'];
  const isInChatConversation = pathname.startsWith('/chat/') && pathname !== '/chat';
  if (hiddenPaths.includes(pathname) || isInChatConversation || !user) {
    return null;
  }

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
    >
      <div className="mx-4 mb-4">
        <div className="max-w-md mx-auto bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-2xl shadow-black/20">
          <div className="flex items-center justify-around py-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    className={`
                      relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors
                      ${isActive 
                        ? 'text-familia-400' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }
                    `}
                    whileTap={{ scale: 0.9 }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-familia-500/10 rounded-xl"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    
                    <motion.div
                      animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                    </motion.div>
                    
                    <span className={`text-[10px] font-medium ${isActive ? 'text-familia-400' : ''}`}>
                      {item.label}
                    </span>
                    
                    {/* Glow effect for active item */}
                    {isActive && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-familia-400 blur-md opacity-60" />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
