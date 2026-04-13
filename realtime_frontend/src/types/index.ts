// ═══════════════════════════════════════════════════════════════
// Veliora.AI — Complete Type Definitions
// Synced to: INTEGRATON_RALTINE.md
// ═══════════════════════════════════════════════════════════════

// ── Section 2: Profiles ────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  email: string;
  bio?: string;
  city?: string;
  country: string;
  timezone: string;
  gender?: string;
  date_of_birth?: string;
  avatar_config: AvatarConfig;
  is_verified: boolean;
  is_minor: boolean;
  is_banned: boolean;
  care_score: number;
  matching_preferences: MatchingPreferences;
  total_xp: number;
  total_bond_points?: number;
  level: number;
  status: 'online' | 'offline' | 'busy' | 'away';
  status_message?: string;
  languages?: Language[];
  created_at: string;
}

export interface AvatarConfig {
  skin?: string;
  hair?: string;
  hair_color?: string;
  outfit?: string;
  accessories?: string[];
  [key: string]: any; // Free-form JSON per docs
}

export interface MatchingPreferences {
  offering_role?: string;
  preferred_roles: string[];
  seeking_role?: string;
}

// ── Section 2.6: Languages ─────────────────────────────────────

export interface Language {
  language_code: string;
  language_name: string;
  proficiency: 'native' | 'fluent' | 'intermediate' | 'beginner';
  is_primary: boolean;
  show_original: boolean;
}

// ── Section 2.9: Relationships ─────────────────────────────────

export interface Relationship {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: 'pending' | 'active' | 'paused' | 'ended';
  level: number;
  level_label: string;
  shared_xp: number;
  created_at: string;
  // Enriched fields from friends/list or chat context
  partner?: Profile;
  my_role?: string;
  partner_role?: string;
  // Display helpers
  partner_id?: string;
  partner_display_name?: string;
  partner_country?: string;
  partner_avatar_config?: AvatarConfig;
  last_message_at?: string;
  // Legacy fields (kept for backward compat)
  care_score?: number;
  bond_points?: number;
  streak_days?: number;
  messages_exchanged?: number;
  last_interaction_at?: string;
  matched_at?: string;
}

// ── Section 2.10: Notifications ────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  // Extension fields
  title?: string;
  body?: string;
  user_id?: string;
}

// ── Section 3: Verification ────────────────────────────────────

export interface VerificationStatus {
  is_verified: boolean;
  status: 'pending' | 'approved' | 'rejected' | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

// ── Section 5: Friends ─────────────────────────────────────────

export interface FriendSearchResult {
  user_id: string;
  display_name: string;
  username: string;
  country: string;
  is_verified: boolean;
  relationship_status: 'none' | 'pending' | 'active';
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  from_display_name: string;
  from_country: string;
  created_at: string;
  status: 'pending';
}

export interface Friend {
  relationship_id: string;
  partner_id: string;
  partner_display_name: string;
  partner_country: string;
  partner_avatar_config: AvatarConfig;
  level: number;
  level_label: string;
  status: string;
  last_message_at: string;
}

// ── Section 6: Chat ────────────────────────────────────────────

export interface Message {
  id: string;
  relationship_id?: string;
  sender_id: string;
  original_text: string;
  translated_text?: string;
  original_language?: string;
  translated_language?: string;
  content_type: 'text' | 'image' | 'video' | 'voice';
  voice_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  reply_to_id?: string | null;
  reactions?: Record<string, number>;
  has_idiom: boolean;
  idiom_explanation?: string | null;
  cultural_note?: string | null;
  created_at: string;
  is_deleted: boolean;
  is_read?: boolean;
}

export interface Poll {
  poll_id: string;
  question: string;
  options: string[];
  votes?: number[];
  total_votes?: number;
  user_vote?: number | null;
  allow_multiple?: boolean;
  is_anonymous?: boolean;
  expires_at?: string;
  created_at?: string;
}

// ── Section 7: Calls ───────────────────────────────────────────

export interface CallLog {
  id: string;
  relationship_id: string;
  caller_id?: string;
  receiver_id?: string;
  call_type: 'audio' | 'video';
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  status?: string;
  created_at?: string;
}

export interface Voice {
  voice_id: string;
  name: string;
  language: string;
  gender: string;
}

// ── Section 8: Family Rooms ────────────────────────────────────

export interface FamilyRoom {
  id: string;
  room_name: string;
  description?: string;
  room_type: string;
  max_members: number;
  created_by: string;
  created_at: string;
  // Enriched
  member_count?: number;
  my_role?: string;
  is_moderator?: boolean;
  members?: RoomMember[];
}

export interface RoomMember {
  user_id: string;
  role_in_room: string;
  is_moderator: boolean;
  profiles?: {
    display_name: string;
    country: string;
    avatar_config: AvatarConfig;
  };
}

export interface RoomMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  translated_content?: string;
  content_type: string;
  media_url?: string | null;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_config: any;
    country: string;
  };
}

export interface JoinCode {
  id?: string;
  code: string;
  expires_at?: string | null;
  max_uses?: number | null;
  uses?: number;
}

export interface CulturalPotluck {
  id: string;
  room_id: string;
  dish_name: string;
  description?: string;
  recipe_url?: string;
  culture_origin?: string;
  image_url?: string;
}

// ── Section 9: Games (Turn-Based) ──────────────────────────────

export interface Game {
  id: string;
  name: string;
  description: string;
  category: string;
  min_players: number;
  max_players: number;
  xp_reward: number;
  // Fallback/legacy
  game_type?: string;
  title?: string;
  icon_emoji?: string;
  estimated_minutes?: number;
  bond_points_reward?: number;
  difficulty?: string;
  instructions?: string;
}

export interface GameSession {
  session_id: string;
  game_id: string;
  relationship_id: string;
  status: 'waiting_for_partner' | 'active' | 'completed';
  current_turn: string | null;
  score?: Record<string, number>;
  game_data?: any;
}

export interface GameActionResult {
  session_id: string;
  result: string;
  score: Record<string, number>;
  next_question?: {
    id: string;
    question: string;
    options: string[];
  };
  is_game_over: boolean;
  xp_earned: number;
}

// ── Section 10: Live Games ─────────────────────────────────────

export interface LiveGame {
  id: string;
  name: string;
  description: string;
  min_level: number;
}

export interface LiveGameSession {
  session_id: string;
  game_id: string;
  status: 'waiting' | 'active' | 'completed';
  player_a: string;
  player_b: string | null;
}

// Pong game state
export interface PongState {
  type: 'game_state';
  ball: { x: number; y: number; vx: number; vy: number; radius: number };
  paddles: Record<string, { y: number; x: number; height: number; width: number }>;
  scores: Record<string, number>;
  canvas: { width: number; height: number };
}

// Tic-tac-toe game state
export interface TicTacToeState {
  type: 'game_state';
  board: (string | null)[];
  current_turn: string;
  your_symbol: 'X' | 'O';
}

// ── Section 11: Contests ───────────────────────────────────────

export interface Contest {
  contest_id: string;
  contest_type: 'vocabulary' | 'culture_trivia' | 'language_challenge' | 'riddle';
  first_question?: ContestQuestion;
  // Enriched
  relationship_id?: string;
  status?: string;
  scores?: Record<string, number>;
}

export interface ContestQuestion {
  id: string;
  question: string;
  options: string[];
  time_limit_seconds?: number;
}

export interface ContestAnswer {
  is_correct: boolean;
  correct_answer: string;
  explanation?: string;
  points_earned: number;
  next_question?: ContestQuestion;
}

export interface ContestResult {
  winner: string;
  scores: Record<string, number>;
  xp_earned: number;
  relationship_xp_earned: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  country: string;
  total_points?: number;
  contests_won?: number;
  total_xp?: number;
  level?: number;
}

// ── Section 12: Questions ──────────────────────────────────────

export interface Question {
  id: string;
  question_text: string;
  category?: string;
  is_public: boolean;
  created_at?: string;
}

export interface QuestionAnswer {
  answer_id: string;
  question_id: string;
  xp_earned: number;
  relationship_xp: number;
}

// ── Section 13: Translation ────────────────────────────────────

export interface TranslationResult {
  translated_text: string;
  source_language: string;
  target_language: string;
  has_idiom: boolean;
  idiom_explanation?: string | null;
  cultural_note?: string | null;
}

export interface SupportedLanguage {
  code: string;
  name: string;
}

// ── Section 14: Safety ─────────────────────────────────────────

export interface ReliabilityScore {
  user_id: string;
  reliability_score: number;
  total_interactions: number;
  reports_received: number;
  positive_feedback: number;
  is_trusted: boolean;
}

export interface MinorProtection {
  user_id: string;
  is_minor: boolean;
  restrictions: string[];
  allowed_call_types: string[];
  max_relationship_level: number;
}

// ── Section 15: Privacy ────────────────────────────────────────

export interface PrivacySettings {
  show_online_status: boolean;
  allow_messages_from: string;
  show_last_seen: boolean;
  allow_calls_from: string;
  translation_language: string;
  show_original_text: boolean;
  blocked_users: string[];
}

// ── Section 16: XP System ──────────────────────────────────────

export interface XPInfo {
  user_id: string;
  total_xp: number;
  level: number;
  level_label: string;
  xp_to_next_level: number;
  streak_days: number;
  streak_multiplier: number;
}

export interface XPTransaction {
  id: string;
  action: string;
  xp_earned: number;
  total_after: number;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export type RelationshipRole =
  | 'mother' | 'father' | 'son' | 'daughter'
  | 'brother' | 'sister' | 'mentor' | 'student'
  | 'friend' | 'grandparent' | 'grandchild'
  | 'sibling' | 'penpal';

export const ROLE_EMOJIS: Record<string, string> = {
  mother: '👩', father: '👨', son: '👦', daughter: '👧',
  brother: '🧑', sister: '👩', mentor: '🎓', student: '📚',
  friend: '🤝', grandparent: '👴', grandchild: '🧒',
  sibling: '🧑', penpal: '✉️',
};

export const ROLE_COLORS: Record<string, string> = {
  mother: '#F43F5E', father: '#3B82F6', son: '#10B981', daughter: '#A855F7',
  brother: '#F59E0B', sister: '#EC4899', mentor: '#6366F1', student: '#14B8A6',
  friend: '#FF6B35', grandparent: '#8B5CF6', grandchild: '#06B6D4',
  sibling: '#F97316', penpal: '#EAB308',
};

// Level system per docs Section 16
export const LEVEL_NAMES: Record<number, string> = {
  1: 'Strangers',
  2: 'Acquaintances',
  3: 'Bonded',
  4: 'Close',
  5: 'Deep Bond',
  6: 'Trusted',
  7: 'Lifetime',
};

export const LEVEL_FEATURES: Record<number, string[]> = {
  1: ['Messaging'],
  2: ['Media sharing'],
  3: ['Audio calls'],
  4: ['Video calls'],
  5: ['Family Rooms'],
  6: ['Contest creation'],
  7: ['All features'],
};

export const CONTEST_TYPES = ['vocabulary', 'culture_trivia', 'language_challenge', 'riddle'] as const;

export const SAFETY_REPORT_REASONS = [
  'harassment', 'spam', 'inappropriate_content', 'underage', 'scam', 'other'
] as const;
