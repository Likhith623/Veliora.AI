import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/lib/ThemeContext';
import { AuthProvider } from '@/lib/AuthContext';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Familia — Real People. Real Bonds. No Borders.',
  description: 'Connect with real people across cultures. Build meaningful relationships through AI-powered translation, bonding contests & cultural games. No bots, just genuine human connection.',
  keywords: 'cross-cultural, human connection, translation, family, mentor, global friendship, penpal, cultural exchange',
  openGraph: {
    title: 'Familia — Real People. Real Bonds. No Borders.',
    description: 'Build a global family through real human connection. AI translates, humans bond.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-primary text-primary transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            {/* ── Layered animated background ── */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-animated" aria-hidden="true">
              {/* Base mesh gradient */}
              <div className="bg-mesh absolute inset-0 opacity-40" />

              {/* Subtle dot pattern overlay */}
              <div className="bg-dot-pattern absolute inset-0 opacity-[0.03]" />

              {/* Animated orbs - only show in dark mode */}
              <div className="dark-only">
                <div className="orb orb-primary" />
                <div className="orb orb-secondary" />
                <div className="orb orb-accent" />

                {/* Meteors */}
                <div className="meteor" style={{ top: '15%', left: '85%', animationDelay: '0s' }} />
                <div className="meteor" style={{ top: '45%', left: '70%', animationDelay: '3s' }} />
                <div className="meteor" style={{ top: '70%', left: '90%', animationDelay: '7s' }} />
              </div>
            </div>

            <main className="relative z-10 pb-20">
              {children}
            </main>

            <BottomNav />

            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                className: 'toast-custom',
                style: {
                  background: 'var(--toast-bg)',
                  backdropFilter: 'blur(16px)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.875rem',
                  fontSize: '0.875rem',
                  padding: '0.75rem 1rem',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                },
                success: {
                  iconTheme: { primary: '#4ADE80', secondary: 'var(--bg-primary)' },
                },
                error: {
                  iconTheme: { primary: '#F43F5E', secondary: 'var(--bg-primary)' },
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
