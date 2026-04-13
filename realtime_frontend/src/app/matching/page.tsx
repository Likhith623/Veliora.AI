'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Globe, Heart, Search, Sparkles, Users, Star, Shield,
  ChevronRight, Loader2, MapPin, X, UserCheck, Eye, ArrowRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { ROLE_EMOJIS } from '@/types';
import toast from 'react-hot-toast';

const ROLES = [
  { id: 'mother', label: 'Mother', emoji: '👩', desc: 'A nurturing soul from another culture', color: 'from-pink-500 to-rose-500', bg: 'bg-pink-500/10', text: 'text-pink-500' },
  { id: 'father', label: 'Father', emoji: '👨', desc: 'A guiding presence across borders', color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500/10', text: 'text-blue-500' },
  { id: 'son', label: 'Son', emoji: '👦', desc: 'An eager learner from far away', color: 'from-green-500 to-emerald-500', bg: 'bg-green-500/10', text: 'text-green-500' },
  { id: 'daughter', label: 'Daughter', emoji: '👧', desc: 'A curious explorer of cultures', color: 'from-purple-500 to-violet-500', bg: 'bg-purple-500/10', text: 'text-purple-500' },
  { id: 'sibling', label: 'Sibling', emoji: '🧑', desc: 'A companion across the world', color: 'from-orange-500 to-amber-500', bg: 'bg-orange-500/10', text: 'text-orange-500' },
  { id: 'grandparent', label: 'Grandparent', emoji: '👴', desc: 'Wisdom from another heritage', color: 'from-amber-500 to-yellow-500', bg: 'bg-amber-500/10', text: 'text-amber-500' },
  { id: 'grandchild', label: 'Grandchild', emoji: '🧒', desc: 'Youth bridging generations', color: 'from-cyan-500 to-teal-500', bg: 'bg-cyan-500/10', text: 'text-cyan-500' },
  { id: 'mentor', label: 'Mentor', emoji: '🧑‍🏫', desc: 'A guide in a new cultural journey', color: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
  { id: 'student', label: 'Student', emoji: '🧑‍🎓', desc: 'Ready to learn from another world', color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  { id: 'friend', label: 'Friend', emoji: '🤝', desc: 'A genuine cross-cultural bond', color: 'from-rose-500 to-pink-500', bg: 'bg-rose-500/10', text: 'text-rose-500' },
  { id: 'penpal', label: 'Pen Pal', emoji: '✉️', desc: 'Exchange letters across the globe', color: 'from-violet-500 to-purple-500', bg: 'bg-violet-500/10', text: 'text-violet-500' },
];

// Alias groups should match backend `role_aliases`
const ROLE_ALIASES: Record<string, string[]> = {
  sibling: ['brother', 'sister', 'sibling'],
  brother: ['brother', 'sibling'],
  sister: ['sister', 'sibling'],
  penpal: ['penpal', 'friend'],
};

function offeringMatchesSearch(offering: string | undefined, searchRole: string) {
  if (!offering) return false;
  const o = offering.toLowerCase().trim();
  const s = searchRole.toLowerCase().trim();
  if (o === s) return true;
  const aliases = ROLE_ALIASES[s];
  if (aliases && aliases.includes(o)) return true;
  return false;
}

function offeringMatchesProfile(profile: any, searchRole: string) {
  // Try top-level offering_role first
  if (offeringMatchesSearch(profile?.offering_role, searchRole)) return true;

  // Fallback to matching_preferences.offering_role
  try {
    const prefs = profile?.matching_preferences;
    if (prefs) {
      if (offeringMatchesSearch(prefs.offering_role, searchRole)) return true;
      const preferred = Array.isArray(prefs.preferred_roles) ? prefs.preferred_roles : [];
      for (const r of preferred) {
        if (offeringMatchesSearch(r, searchRole)) return true;
      }
    }
  } catch (e) {
    // ignore
  }

  // Also check top-level `role` field (older rows)
  if (offeringMatchesSearch(profile?.role, searchRole)) return true;

  return false;
}

interface BrowseProfile {
  id: string;
  display_name: string;
  country?: string;
  city?: string;
  avatar_config?: any;
  is_verified: boolean;
  care_score: number;
  bio?: string;
  offering_role: string;
  seeking_role?: string;
}

type PageMode = 'browse-roles' | 'browse-results' | 'quick-match';

export default function MatchingPage() {
  const { user, refreshRelationships, refreshUser } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>('browse-roles');
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [profiles, setProfiles] = useState<BrowseProfile[]>([]);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalProfiles, setTotalProfiles] = useState(0);

  const [myRole, setMyRole] = useState('');
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [offeredRoles, setOfferedRoles] = useState<string[]>([]);
  const [offeredLoading, setOfferedLoading] = useState(false);
  const [partnerRole, setPartnerRole] = useState('');
  const [matchStep, setMatchStep] = useState<'select-role' | 'select-partner' | 'searching' | 'found' | 'not-found'>('select-role');
  const [searchTime, setSearchTime] = useState(0);
  const [matchResult, setMatchResult] = useState<any>(null);

  useEffect(() => { loadRoleCounts(); }, []);

  // Load user's offered roles from Supabase when authenticated
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setOfferedLoading(true);
        const roles = await api.getMyOfferedRoles(user.id);
        setOfferedRoles(Array.isArray(roles) ? roles : []);
      } catch (e) {
        console.error('Failed to load offered roles', e);
      } finally {
        setOfferedLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (matchStep === 'searching') timer = setInterval(() => setSearchTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [matchStep]);

  const loadRoleCounts = async () => {
    try {
      const result = await api.browseAllRoles();
      setRoleCounts(result.role_counts || {});
      setTotalProfiles(result.total_profiles || 0);
    } catch (err) { console.error('Failed to load role counts:', err); }
  };

  // Shared helper: fetch profiles for a role, optionally using the authenticated
  // endpoint. Returns filtered profiles (matching offering role) or empty array.
  const fetchProfilesForRole = async (roleId: string, opts?: { auth?: boolean, minMs?: number, poll?: boolean }) => {
    const { auth = false, minMs = 0, poll = false } = opts || {};
    const start = Date.now();
    const intervalMs = 2000;
    const maxAttempts = 12;
    let attempts = 0;

    const callApi = async () => {
      if (auth) return await api.browseByRoleAuth(roleId);
      return await api.browseByRole(roleId);
    };

    if (!poll) {
      const result = await callApi();
      const raw = result.profiles || [];
      const filtered = raw.filter((p: any) => offeringMatchesProfile(p, roleId));
      const elapsed = Date.now() - start;
      if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed));
      return filtered;
    }

    while (attempts < maxAttempts) {
      attempts++;
      const result = await callApi();
      const raw = result.profiles || [];
      const filtered = raw.filter((p: any) => offeringMatchesProfile(p, roleId));
      if (filtered.length > 0) {
        const elapsed = Date.now() - start;
        if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed));
        return filtered;
      }

      // stop early if user cancelled the search
      if (matchStep !== 'searching') return [];
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    const elapsed = Date.now() - start;
    if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed));
    return [];
  };

  const browseRole = async (roleId: string) => {
    // Use the globe/search UI while we poll for actual results that match
    // the selected role. Ensure at least 3s of animation for UX.
    setSelectedRole(roleId);
    setPartnerRole(roleId);
    setMatchStep('searching');
    setSearchTime(0);
    setMode('quick-match');
    setProfiles([]);

    const start = Date.now();
    const minMs = 3000;
    const intervalMs = 2000;
    const maxAttempts = 12; // ~24s
    let attempts = 0;
    let foundAny = false;

    try {
      const filtered = await fetchProfilesForRole(roleId, { auth: false, minMs: 3000, poll: true });
      if (filtered.length > 0) {
        setProfiles(filtered);
        setMode('browse-results');
        setMatchStep('found');
      } else {
        setMatchStep('not-found');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to browse');
      setMatchStep('not-found');
    }
  };

  const startQuickMatch = async () => {
    if (!user) { toast.error('Please log in'); return; }
    // Show globe/searching animation for a short fixed interval, then perform
    // a quick search using the browse endpoint (which respects preferred_roles).
    setMatchStep('searching');
    setSearchTime(0);
    try {
      // Poll the server until matching profiles appear (keep globe animation running).
      const maxAttempts = 12; // ~24 seconds at 2s interval
      const intervalMs = 2000;
      let attempts = 0;
      let foundAny = false;

      const filtered = await fetchProfilesForRole(partnerRole, { auth: true, minMs: 3000, poll: true });
      if (filtered.length > 0) {
        setProfiles(filtered);
        setSelectedRole(partnerRole);
        setMode('browse-results');
        setMatchStep('found');
      } else {
        setMatchStep('not-found');
      }
    } catch (err: any) {
      toast.error(err.message || 'Match failed'); setMatchStep('select-partner');
    }
  };

  const cancelSearch = async () => {
    if (user) { try { await api.cancelMatching(user.id); } catch {} }
    setMatchStep('select-partner'); setSearchTime(0);
  };

  const filteredProfiles = profiles.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.display_name?.toLowerCase().includes(q) || p.country?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) || p.bio?.toLowerCase().includes(q);
  });

  const selectedRoleData = ROLES.find(r => r.id === selectedRole);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center glass-card max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-familia-500 to-heart-500 flex items-center justify-center">
            <Search className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">Find Your Global Family</h2>
          <p className="text-muted mb-6">Please log in to browse and connect</p>
          <Link href="/login"><button className="btn-primary w-full">Log In</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 glass border-b border-themed z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          {mode !== 'browse-roles' ? (
            <motion.button onClick={() => { setMode('browse-roles'); setSelectedRole(''); setProfiles([]); setSearchQuery(''); }}
              className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition" whileTap={{ scale: 0.95 }}>
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          ) : (
            <Link href="/dashboard">
              <motion.button className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition" whileTap={{ scale: 0.95 }}>
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            </Link>
          )}
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-familia-400" />
            {mode === 'browse-results' ? `Browse ${selectedRoleData?.label || 'Role'}s` : 'Find Your Match'}
          </h1>
          <div className="flex-1" />
          {totalProfiles > 0 && mode === 'browse-roles' && (
            <span className="text-xs text-muted bg-[var(--bg-card)] px-3 py-1.5 rounded-full border border-themed">
              {totalProfiles} people worldwide
            </span>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* ── BROWSE BY ROLES ── */}
          {mode === 'browse-roles' && (
            <motion.div key="browse-roles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="text-center mb-8">
                <motion.div className="text-5xl mb-4" animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>🌍</motion.div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                  Browse by <span className="gradient-text">Roles</span>
                </h2>
                <p className="text-muted max-w-lg mx-auto">
                  Find someone who matches the role you&apos;re looking for. Each role represents a unique cross-cultural bond.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
                {ROLES.map((role, index) => {
                  const count = roleCounts[role.id] || 0;
                  return (
                    <motion.button key={role.id} onClick={() => browseRole(role.id)}
                      className="glass-card !p-5 text-center card-hover group relative overflow-hidden"
                      whileTap={{ scale: 0.97 }}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300`} />
                      <div className="relative z-10">
                        <div className={`w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                          {role.emoji}
                        </div>
                        <div className="font-semibold text-sm mb-1">{role.label}</div>
                        <div className="text-[11px] text-muted mb-2 line-clamp-2">{role.desc}</div>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
                          count > 0 ? `${role.bg} ${role.text}` : 'bg-[var(--bg-card)] text-muted'
                        }`}>
                          <Users className="w-3 h-3" />
                          {count > 0 ? `${count} available` : 'None yet'}
                        </div>
                      </div>
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition">
                        <ChevronRight className={`w-4 h-4 ${role.text}`} />
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* My Offered Roles - allow user to view and select multiple roles to offer */}
              <div className="glass-card p-4 mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold">My Offered Roles</div>
                    <div className="text-xs text-muted">Select roles you can offer to others</div>
                  </div>
                  <div>
                    <button onClick={async () => {
                      if (!user) { toast.error('Please log in'); return; }
                      try {
                        setOfferedLoading(true);
                        await api.setMyOfferedRoles(user.id, offeredRoles);
                        toast.success('Saved offered roles');
                        // Refresh counts, reload roles from backend and refresh local profile
                        await loadRoleCounts();
                        const roles = await api.getMyOfferedRoles(user.id);
                        setOfferedRoles(Array.isArray(roles) ? roles : []);
                        try { await refreshUser(); } catch (e) { /* ignore */ }
                      } catch (e: any) {
                        console.error(e);
                        toast.error(e?.message || 'Failed to save offered roles');
                      } finally { setOfferedLoading(false); }
                    }} className="btn-primary text-sm">{offeredLoading ? 'Saving...' : 'Save Offered Roles'}</button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {offeredRoles.length === 0 && <div className="text-xs text-muted">You haven't offered any roles yet.</div>}
                    {offeredRoles.map((r) => {
                      const role = ROLES.find(rr => rr.id === r);
                      return (
                        <div key={r} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-card)] border border-themed text-sm">
                          <div className="mr-1">{role?.emoji || '❓'}</div>
                          <div className="font-medium text-sm">{role?.label || r}</div>
                          <button onClick={async () => {
                            if (!user) { toast.error('Please log in'); return; }
                            // Optimistic UI update
                            const next = offeredRoles.filter(x => x !== r);
                            setOfferedRoles(next);
                            setOfferedLoading(true);
                            try {
                              await api.setMyOfferedRoles(user.id, next);
                              toast.success('Removed role');
                              await loadRoleCounts();
                              try { await refreshUser(); } catch {}
                            } catch (e: any) {
                              // revert UI on failure
                              setOfferedRoles(offeredRoles);
                              console.error(e);
                              toast.error(e?.message || 'Failed to remove role');
                            } finally { setOfferedLoading(false); }
                          }} className="ml-2 text-xs text-muted hover:text-[var(--text-primary)]">✕</button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ROLES.map((role) => {
                    const selected = offeredRoles.includes(role.id);
                    return (
                      <button key={role.id} onClick={() => {
                        const next = selected ? offeredRoles.filter(r => r !== role.id) : [...offeredRoles, role.id];
                        setOfferedRoles(next);
                      }}
                        className={`flex items-center gap-2 p-2 rounded-md text-sm border ${selected ? 'border-familia-400 bg-familia-500/5' : 'border-transparent hover:bg-[var(--bg-card-hover)]'}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-lg`}>
                          {role.emoji}
                        </div>
                        <div className="truncate">{role.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Match CTA */}
              <motion.div className="glass-card text-center relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <div className="absolute inset-0 bg-gradient-to-r from-familia-500/5 via-transparent to-bond-500/5" />
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-familia-400" />
                    <h3 className="font-bold text-lg">AI-Powered Quick Match</h3>
                  </div>
                  <p className="text-muted text-sm mb-4 max-w-md mx-auto">
                    Let our AI find the perfect person for you based on preferences, language, and culture.
                  </p>
                  <motion.button onClick={() => {
                    // Prefill quick-match role selection from user's offered roles
                    setPreferredRoles(offeredRoles || []);
                    if ((offeredRoles || []).length > 0) setMyRole(offeredRoles[0]);
                    setMode('quick-match'); setMatchStep('select-role');
                  }}
                    className="btn-primary inline-flex items-center gap-2"
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Search className="w-4 h-4" /> Start Quick Match <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── BROWSE RESULTS ── */}
          {mode === 'browse-results' && (
            <motion.div key="browse-results" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {selectedRoleData && (
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedRoleData.color} flex items-center justify-center text-2xl shadow-lg`}>
                    {selectedRoleData.emoji}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{selectedRoleData.label}s Available</h2>
                    <p className="text-sm text-muted">{selectedRoleData.desc}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${selectedRoleData.bg} ${selectedRoleData.text}`}>
                    {profiles.length} found
                  </span>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, country, or interests..."
                  className="input-familia !pl-11 !pr-10" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text-primary)]">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isLoading && (
                <div className="text-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-familia-400 mx-auto mb-4" />
                  <p className="text-muted">Searching for {selectedRoleData?.label}s around the world...</p>
                </div>
              )}

              {!isLoading && filteredProfiles.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-lg font-bold mb-2">
                    {searchQuery ? 'No matches for your search' : `No ${selectedRoleData?.label}s Available Yet`}
                  </h3>
                  <p className="text-muted mb-6 max-w-md mx-auto">
                    {searchQuery ? 'Try a different search term.' : 'Be the first to register as this role, or check back later!'}
                  </p>
                  {searchQuery ? (
                    <button onClick={() => setSearchQuery('')} className="btn-secondary">Clear Search</button>
                  ) : (
                    <button onClick={() => setMode('browse-roles')} className="btn-primary">Browse Other Roles</button>
                  )}
                </div>
              )}

              {!isLoading && filteredProfiles.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProfiles.map((profile, index) => (
                    <motion.div key={profile.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-card card-hover group relative overflow-hidden">
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${selectedRoleData?.color || 'from-familia-500 to-bond-500'}`} />
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${selectedRoleData?.color || 'from-familia-500 to-bond-500'} flex items-center justify-center text-2xl font-bold text-white shadow-md`}>
                            {profile.display_name?.[0] || '?'}
                          </div>
                          {profile.is_verified && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-[var(--bg-primary)]">
                              <Shield className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm truncate">{profile.display_name}</span>
                            {profile.is_verified && (
                              <span className="text-green-500 text-[10px] bg-green-500/10 px-1.5 py-0.5 rounded-full">✓</span>
                            )}
                          </div>
                          {profile.country && (
                            <div className="flex items-center gap-1 text-xs text-muted mb-1.5">
                              <MapPin className="w-3 h-3" />
                              {profile.city ? `${profile.city}, ${profile.country}` : profile.country}
                            </div>
                          )}
                          {profile.bio && <p className="text-xs text-muted line-clamp-2 mb-2">{profile.bio}</p>}
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${selectedRoleData?.bg} ${selectedRoleData?.text}`}>
                              {selectedRoleData?.emoji} {profile.offering_role}
                            </span>
                            <span className="text-[10px] text-muted flex items-center gap-1">
                              <Heart className="w-3 h-3 text-heart-400" /> {profile.care_score}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-themed flex items-center gap-2">
                        <button className="flex-1 text-xs py-2 rounded-lg bg-[var(--bg-card-hover)] hover:bg-[var(--input-border)] transition flex items-center justify-center gap-1.5 text-muted hover:text-[var(--text-primary)]">
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button disabled={connectingId === profile.id} onClick={async () => {
                          if (!user) { toast.error('Please log in'); return; }
                          setConnectingId(profile.id);
                          try {
                            const result = await api.connectWithUser(profile.id, selectedRole);
                            await refreshRelationships();
                            const relId = result.relationship?.id;
                            if (relId) {
                              toast.success(result.message || `Connected with ${profile.display_name}!`);
                              router.push(`/chat/${relId}`);
                            } else {
                              toast.success('Connected! Go to your dashboard to chat.');
                            }
                          } catch (err: any) {
                            toast.error(err.message || 'Failed to connect');
                          } finally {
                            setConnectingId(null);
                          }
                        }} className={`flex-1 text-xs py-2 rounded-lg bg-gradient-to-r ${selectedRoleData?.color || 'from-familia-500 to-bond-500'} text-white font-medium flex items-center justify-center gap-1.5 hover:shadow-md transition disabled:opacity-50`}>
                          {connectingId === profile.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                          {connectingId === profile.id ? 'Connecting...' : 'Connect'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── QUICK MATCH ── */}
          {mode === 'quick-match' && (
            <motion.div key="quick-match" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <AnimatePresence mode="wait">
                {matchStep === 'select-role' && (
                  <motion.div key="qm-r" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="text-center mb-8">
                      <div className="text-5xl mb-4">🌍</div>
                      <h2 className="text-2xl font-bold mb-2">Who do you want to be?</h2>
                      <p className="text-muted">Choose your role in this cross-cultural bond</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {ROLES.map((role, i) => {
                        const selected = preferredRoles.includes(role.id);
                        return (
                        <motion.button key={role.id} onClick={async () => {
                            // Toggle selection
                            let updated: string[] = [];
                            if (selected) {
                              updated = preferredRoles.filter(r => r !== role.id);
                              setPreferredRoles(updated);
                            } else {
                              updated = [...preferredRoles, role.id];
                              setPreferredRoles(updated);
                            }

                            // Persist to server (preferred_roles)
                            try {
                              await api.setMyRole({ preferred_roles: updated });
                              // update primary myRole to first selected
                              if (updated.length > 0) setMyRole(updated[0]);
                              // Refresh role counts so tiles show current numbers
                              await loadRoleCounts();
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to save role');
                            }

                            // Move to next step if at least one role selected
                            if (updated.length > 0) setMatchStep('select-partner');
                          }}
                          className={`glass-card !p-4 text-center card-hover group ${selected ? 'ring-2 ring-familia-400' : ''}`}
                          whileTap={{ scale: 0.97 }} initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                          <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center text-2xl group-hover:scale-110 transition`}>
                            {role.emoji}
                          </div>
                          <div className="font-semibold text-sm mb-1">{role.label}</div>
                          <div className="text-[10px] text-muted">{role.desc}</div>
                        </motion.button>)
                      })}
                    </div>
                    <button onClick={() => setMode('browse-roles')} className="mt-6 text-sm text-muted hover:text-[var(--text-primary)] transition mx-auto block">← Back to Browse</button>
                  </motion.div>
                )}

                {matchStep === 'select-partner' && (
                  <motion.div key="qm-p" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="text-center mb-8">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="text-4xl">{ROLE_EMOJIS[myRole] || '🌍'}</div>
                        <Heart className="w-6 h-6 text-heart-400" />
                        <div className="text-4xl">❓</div>
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Who are you looking for?</h2>
                      <p className="text-muted">As a <span className="text-familia-400 font-medium">{myRole}</span>, who would complete your family?</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {ROLES.filter(r => r.id !== myRole).map((role, i) => (
                        <motion.button key={role.id} onClick={() => { setPartnerRole(role.id); startQuickMatch(); }}
                          className="glass-card !p-4 text-center card-hover group"
                          whileTap={{ scale: 0.97 }} initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                          <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center text-2xl group-hover:scale-110 transition`}>
                            {role.emoji}
                          </div>
                          <div className="font-semibold text-sm mb-1">{role.label}</div>
                          <div className="text-[10px] text-muted">{role.desc}</div>
                        </motion.button>
                      ))}
                    </div>
                    <button onClick={() => setMatchStep('select-role')} className="mt-6 text-sm text-muted hover:text-[var(--text-primary)] transition mx-auto block">← Change my role</button>
                  </motion.div>
                )}

                {matchStep === 'searching' && (
                  <motion.div key="qm-s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
                    <div className="relative w-40 h-40 mx-auto mb-8">
                      <motion.div className="absolute inset-0 rounded-full bg-gradient-to-br from-familia-500/15 to-bond-500/15 border border-familia-500/20"
                        animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div className="text-5xl" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}>🌍</motion.div>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Searching the globe...</h2>
                    <p className="text-muted mb-3">Finding the perfect <span className="text-familia-400 font-medium">{partnerRole}</span></p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-themed text-sm text-muted">
                      <Loader2 className="w-3 h-3 animate-spin" /> {searchTime}s
                    </div>
                    <div className="mt-6"><button onClick={cancelSearch} className="text-sm text-muted hover:text-[var(--text-primary)] transition">Cancel</button></div>
                  </motion.div>
                )}

                {matchStep === 'found' && matchResult && (
                  <motion.div key="qm-f" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                    <motion.div className="text-6xl mb-4" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.8, type: 'spring' }}>✨</motion.div>
                    <h2 className="text-3xl font-bold mb-3 gradient-text">Match Found!</h2>
                    <p className="text-muted mb-8">The universe connected you across borders ✦</p>
                    <div className="glass-card max-w-md mx-auto mb-8">
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="text-center">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-familia-500 to-bond-500 flex items-center justify-center text-2xl mx-auto mb-1">{ROLE_EMOJIS[myRole] || '🌍'}</div>
                          <div className="text-xs text-muted">You</div>
                        </div>
                        <Heart className="w-6 h-6 text-heart-400" />
                        <div className="text-center">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-2xl mx-auto mb-1">{ROLE_EMOJIS[partnerRole] || '🤝'}</div>
                          <div className="text-xs text-muted">{matchResult.partner?.display_name}</div>
                        </div>
                      </div>
                      <div className="text-left space-y-2">
                        <div className="font-semibold text-lg">{matchResult.partner?.display_name || 'New Match'}</div>
                        <div className="text-sm text-muted">{matchResult.partner?.country}</div>
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-themed">
                          <div className="text-center p-2 rounded-xl bg-familia-500/10">
                            <div className="text-lg font-bold text-familia-400">{matchResult.partner?.care_score || 50}</div>
                            <div className="text-[10px] text-muted">Care</div>
                          </div>
                          <div className="text-center p-2 rounded-xl bg-green-500/10">
                            <div className="text-lg font-bold text-green-400">A+</div>
                            <div className="text-[10px] text-muted">Reliable</div>
                          </div>
                          <div className="text-center p-2 rounded-xl bg-amber-500/10">
                            <div className="text-lg font-bold text-amber-400">{Math.round(matchResult.match_score)}%</div>
                            <div className="text-[10px] text-muted">Match</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Link href={`/chat/${matchResult.relationship?.id}`}>
                        <button className="btn-primary flex items-center gap-2 px-8 py-3">
                          <Heart className="w-4 h-4" /> Start Bonding <ChevronRight className="w-4 h-4" />
                        </button>
                      </Link>
                      <button onClick={() => { setMode('browse-roles'); setMatchStep('select-role'); setMatchResult(null); }}
                        className="px-5 py-3 rounded-xl border border-themed text-muted hover:text-[var(--text-primary)] transition text-sm">Back to Browse</button>
                    </div>
                  </motion.div>
                )}

                {matchStep === 'not-found' && (
                  <motion.div key="qm-nf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                    <div className="text-5xl mb-4">🌏</div>
                    <h2 className="text-2xl font-bold mb-3">No Matches Right Now</h2>
                    <p className="text-muted mb-6 max-w-md mx-auto">Try browsing by role or check back later!</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button onClick={() => setMode('browse-roles')} className="btn-primary flex items-center gap-2 px-6">
                        <Users className="w-4 h-4" /> Browse Roles
                      </button>
                      <button onClick={() => setMatchStep('select-role')} className="px-5 py-3 rounded-xl border border-themed text-muted hover:text-[var(--text-primary)] transition text-sm">Try Again</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}