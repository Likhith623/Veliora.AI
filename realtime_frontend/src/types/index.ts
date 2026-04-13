// Types for the Familia application

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  email: string;
  date_of_birth: string;
  gender?: string;
  country: string;
  city?: string;
  timezone: string;
  bio?: string;
  voice_bio_url?: string;
  profile_photo_url?: string;
  avatar_config: AvatarConfig;
  is_verified: boolean;
  verification_method?: string;
  care_score: number;
  reliability_score: number;
  total_bond_points: number;
  status: 'active' | 'busy' | 'away' | 'break' | 'offline';
  status_message?: string;
  is_minor: boolean;
  matching_preferences: MatchingPreferences;
  created_at: string;
  last_active_at: string;
}

export interface AvatarConfig {
  skin_tone: string;
  hair_style: string;
  hair_color: string;
  eye_color: string;
  face_shape: string;
  accessories: string[];
  outfit: string;
  outfit_color: string;
  background: string;
  expression: string;
}

export interface MatchingPreferences {
  preferred_roles: string[];
  age_range: { min: number; max: number };
  preferred_countries: string[];
  language_priority: 'ease' | 'learning';
  match_gender_preference: string;
}

export interface Language {
  id: string;
  user_id: string;
  language_code: string;
  language_name: string;
  proficiency: 'native' | 'fluent' | 'intermediate' | 'learning';
  is_primary: boolean;
  show_original: boolean;
}

export interface Relationship {
  id: string;
  user_a_id: string;
  user_b_id: string;
  user_a_role: string;
  user_b_role: string;
  status: 'pending' | 'active' | 'paused' | 'ended' | 'graduated';
  level: number;
  bond_points: number;
  care_score: number;
  messages_exchanged: number;
  contests_completed: number;
  contests_won: number;
  streak_days: number;
  longest_streak: number;
  matched_at: string;
  last_interaction_at: string;
  partner?: Profile;
  my_role?: string;
  partner_role?: string;
}

export interface Message {
  id: string;
  relationship_id: string;
  sender_id: string;
  content_type: 'text' | 'voice' | 'image' | 'emoji' | 'system';
  original_text: string;
  original_language: string;
  translated_text?: string;
  target_language?: string;
  has_idiom: boolean;
  idiom_explanation?: string;
  cultural_note?: string;
  voice_url?: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface Contest {
  id: string;
  relationship_id: string;
  contest_type: 'daily' | 'weekly' | 'monthly';
  title: string;
  description: string;
  status: 'scheduled' | 'active' | 'completed' | 'expired';
  max_points: number;
  user_a_score: number;
  user_b_score: number;
  total_score: number;
  is_synchronized: boolean;
  bond_points_awarded: number;
  time_limit_minutes: number;
  created_at: string;
}

export interface ContestQuestion {
  id: string;
  contest_id: string;
  question_text: string;
  question_type: 'open' | 'multiple_choice' | 'true_false';
  options?: string[];
  points: number;
  question_order: number;
  question_about_user: string;
  user_a_answer?: string;
  user_b_answer?: string;
  correct_answer?: string;
}

export interface Game {
  id: string;
  game_type: string;
  title: string;
  description: string;
  instructions: string;
  category: 'emotional' | 'cultural' | 'fun' | 'creative' | 'reflective';
  difficulty: 'easy' | 'medium' | 'hard';
  icon_emoji: string;
  bond_points_reward: number;
  estimated_minutes: number;
}

export interface GameSession {
  id: string;
  game_id: string;
  relationship_id?: string;
  room_id?: string;
  players: { user_id: string; score: number }[];
  status: 'waiting' | 'active' | 'completed';
  current_round: number;
  total_rounds: number;
  game_data: Record<string, any>;
  game?: Game;
}

export interface FamilyRoom {
  id: string;
  room_name: string;
  description?: string;
  room_type: string;
  max_members: number;
  is_active: boolean;
  members?: RoomMember[];
  member_count: number;
  my_role?: string;
  is_moderator?: boolean;
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

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: string;
  unlocked_at?: string;
}

export interface CulturalPotluck {
  id: string;
  room_id: string;
  host_id: string;
  theme: string;
  dish_name?: string;
  dish_photo_url?: string;
  cultural_significance?: string;
  recipe?: string;
  country_of_origin?: string;
  scheduled_at: string;
  status: 'scheduled' | 'live' | 'completed';
}

export type RelationshipRole = 
  | 'mother' | 'father' | 'son' | 'daughter' 
  | 'brother' | 'sister' | 'mentor' | 'student' 
  | 'friend' | 'grandparent' | 'grandchild';

export const ROLE_EMOJIS: Record<string, string> = {
  mother: '👩', father: '👨', son: '👦', daughter: '👧',
  brother: '🧑', sister: '👩', mentor: '🎓', student: '📚',
  friend: '🤝', grandparent: '👴', grandchild: '🧒'
};

export const ROLE_COLORS: Record<string, string> = {
  mother: '#F43F5E', father: '#3B82F6', son: '#10B981', daughter: '#A855F7',
  brother: '#F59E0B', sister: '#EC4899', mentor: '#6366F1', student: '#14B8A6',
  friend: '#FF6B35', grandparent: '#8B5CF6', grandchild: '#06B6D4'
};

export const LEVEL_NAMES: Record<number, string> = {
  1: 'Stranger', 2: 'Acquaintance', 3: 'Bonded', 4: 'Close',
  5: 'Family', 6: 'Trusted', 7: 'Kindred', 8: 'Soulbound',
  9: 'Eternal', 10: 'Legendary'
};

export const LEVEL_FEATURES: Record<number, string[]> = {
  1: ['Text messaging'],
  2: ['Emojis & reactions'],
  3: ['Audio calls'],
  4: ['Video calls'],
  5: ['Join Global Family Room'],
  6: ['Custom themes'],
  7: ['Priority matching'],
  8: ['Mentor badge'],
  9: ['Cultural Ambassador'],
  10: ['Digital Family Book (Heirloom)']
};
