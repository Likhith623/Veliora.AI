# Veliora.AI — Complete Supabase PostgreSQL Schema

> Run these SQL statements in order in the **Supabase SQL Editor**.

---

## 1. Enable Required Extensions

```sql
-- Enable pgvector for semantic embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## 2. Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 13 AND age <= 120),
    gender TEXT NOT NULL,
    location TEXT,
    bio TEXT,
    avatar_url TEXT,
    total_xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_login_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for username lookups
CREATE INDEX idx_users_username ON users(username);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Service role can insert users"
    ON users FOR INSERT
    WITH CHECK (true);
```

---

## 3. Personas Table

```sql
CREATE TABLE personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    archetype TEXT NOT NULL CHECK (archetype IN ('mentor', 'friend', 'romantic')),
    origin TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    age INTEGER,
    description TEXT,
    avatar_url TEXT,
    face_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personas_bot_id ON personas(bot_id);
CREATE INDEX idx_personas_archetype ON personas(archetype);

-- RLS (public read)
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read personas"
    ON personas FOR SELECT
    USING (true);
```

### Seed Personas

```sql
INSERT INTO personas (bot_id, display_name, archetype, origin, gender, age, face_image_url) VALUES
    -- Delhi
    ('delhi_mentor_male', 'Delhi Mentor (Male)', 'mentor', 'delhi', 'male', 50, 'delhi_mentor_male.jpeg'),
    ('delhi_mentor_female', 'Delhi Mentor (Female)', 'mentor', 'delhi', 'female', 50, 'delhi_mentor_female.jpeg'),
    ('delhi_friend_male', 'Delhi Friend (Male)', 'friend', 'delhi', 'male', 23, 'delhi_friend_male.jpeg'),
    ('delhi_friend_female', 'Delhi Friend (Female)', 'friend', 'delhi', 'female', 23, 'delhi_friend_female.jpeg'),
    ('delhi_romantic_male', 'Delhi Romantic (Male)', 'romantic', 'delhi', 'male', 29, 'delhi_romantic_male.jpeg'),
    ('delhi_romantic_female', 'Delhi Romantic (Female)', 'romantic', 'delhi', 'female', 29, 'delhi_romantic_female.jpeg'),
    -- Japanese
    ('japanese_mentor_male', 'Japanese Mentor (Male)', 'mentor', 'japanese', 'male', 60, 'japanese_mentor_male.jpeg'),
    ('japanese_mentor_female', 'Japanese Mentor (Female)', 'mentor', 'japanese', 'female', 60, 'japanese_mentor_female.jpeg'),
    ('japanese_friend_male', 'Japanese Friend (Male)', 'friend', 'japanese', 'male', 25, 'japanese_friend_male.jpeg'),
    ('japanese_friend_female', 'Japanese Friend (Female)', 'friend', 'japanese', 'female', 25, 'japanese_friend_female.jpeg'),
    ('japanese_romantic_male', 'Japanese Romantic (Male)', 'romantic', 'japanese', 'male', 30, 'japanese_romantic_male.jpeg'),
    ('japanese_romantic_female', 'Japanese Romantic (Female)', 'romantic', 'japanese', 'female', 30, 'japanese_romantic_female.jpeg'),
    -- Parisian
    ('parisian_mentor_male', 'Parisian Mentor (Male)', 'mentor', 'parisian', 'male', 60, 'parisian_mentor_male.jpeg'),
    ('parisian_mentor_female', 'Parisian Mentor (Female)', 'mentor', 'parisian', 'female', 60, 'parisian_mentor_female.jpeg'),
    ('parisian_friend_male', 'Parisian Friend (Male)', 'friend', 'parisian', 'male', 25, 'parisian_friend_male.jpeg'),
    ('parisian_friend_female', 'Parisian Friend (Female)', 'friend', 'parisian', 'female', 25, 'parisian_friend_female.jpeg'),
    ('parisian_romantic_female', 'Parisian Romantic (Female)', 'romantic', 'parisian', 'female', 28, 'parisian_romantic_female.jpeg'),
    -- Berlin
    ('berlin_mentor_male', 'Berlin Mentor (Male)', 'mentor', 'berlin', 'male', 55, 'berlin_mentor_male.jpeg'),
    ('berlin_mentor_female', 'Berlin Mentor (Female)', 'mentor', 'berlin', 'female', 55, 'berlin_mentor_female.jpeg'),
    ('berlin_friend_male', 'Berlin Friend (Male)', 'friend', 'berlin', 'male', 25, 'berlin_friend_male.jpeg'),
    ('berlin_friend_female', 'Berlin Friend (Female)', 'friend', 'berlin', 'female', 25, 'berlin_friend_female.jpeg'),
    ('berlin_romantic_male', 'Berlin Romantic (Male)', 'romantic', 'berlin', 'male', 30, 'berlin_romantic_male.jpeg'),
    ('berlin_romantic_female', 'Berlin Romantic (Female)', 'romantic', 'berlin', 'female', 28, 'berlin_romantic_female.jpeg'),
    -- Singapore
    ('singapore_mentor_male', 'Singapore Mentor (Male)', 'mentor', 'singapore', 'male', 50, 'singapore_mentor_male.jpeg'),
    ('singapore_mentor_female', 'Singapore Mentor (Female)', 'mentor', 'singapore', 'female', 50, 'singapore_mentor_female.jpeg'),
    ('singapore_friend_male', 'Singapore Friend (Male)', 'friend', 'singapore', 'male', 25, 'singapore_friend_male.jpeg'),
    ('singapore_friend_female', 'Singapore Friend (Female)', 'friend', 'singapore', 'female', 25, 'singapore_friend_female.jpeg'),
    ('singapore_romantic_male', 'Singapore Romantic (Male)', 'romantic', 'singapore', 'male', 28, 'singapore_romantic_male.jpeg'),
    ('singapore_romantic_female', 'Singapore Romantic (Female)', 'romantic', 'singapore', 'female', 27, 'singapore_romantic_female.jpeg'),
    -- Mexican
    ('mexican_mentor_male', 'Mexican Mentor (Male)', 'mentor', 'mexican', 'male', 50, 'mexican_mentor_male.jpeg'),
    ('mexican_mentor_female', 'Mexican Mentor (Female)', 'mentor', 'mexican', 'female', 50, 'mexican_mentor_female.jpeg'),
    ('mexican_friend_male', 'Mexican Friend (Male)', 'friend', 'mexican', 'male', 25, 'mexican_friend_male.jpeg'),
    ('mexican_friend_female', 'Mexican Friend (Female)', 'friend', 'mexican', 'female', 25, 'mexican_friend_female.jpeg'),
    ('mexican_romantic_male', 'Mexican Romantic (Male)', 'romantic', 'mexican', 'male', 30, 'mexican_romantic_male.jpeg'),
    ('mexican_romantic_female', 'Mexican Romantic (Female)', 'romantic', 'mexican', 'female', 28, 'mexican_romantic_female.jpeg'),
    -- Sri Lankan
    ('srilankan_mentor_male', 'Sri Lankan Mentor (Male)', 'mentor', 'srilankan', 'male', 50, 'srilankan_mentor_male.jpeg'),
    ('srilankan_mentor_female', 'Sri Lankan Mentor (Female)', 'mentor', 'srilankan', 'female', 50, 'srilankan_mentor_female.jpeg'),
    ('srilankan_friend_male', 'Sri Lankan Friend (Male)', 'friend', 'srilankan', 'male', 25, 'srilankan_friend_male.jpeg'),
    ('srilankan_friend_female', 'Sri Lankan Friend (Female)', 'friend', 'srilankan', 'female', 25, 'srilankan_friend_female.jpeg'),
    ('srilankan_romantic_male', 'Sri Lankan Romantic (Male)', 'romantic', 'srilankan', 'male', 28, 'srilankan_romantic_male.jpeg'),
    ('srilankan_romantic_female', 'Sri Lankan Romantic (Female)', 'romantic', 'srilankan', 'female', 27, 'srilankan_romantic_female.jpeg'),
    -- Emirati
    ('emirati_mentor_male', 'Emirati Mentor (Male)', 'mentor', 'emirati', 'male', 50, 'emirati_mentor_male.jpeg'),
    ('emirati_mentor_female', 'Emirati Mentor (Female)', 'mentor', 'emirati', 'female', 50, 'emirati_mentor_female.jpeg'),
    ('emirati_friend_male', 'Emirati Friend (Male)', 'friend', 'emirati', 'male', 25, 'emirati_friend_male.jpeg'),
    ('emirati_friend_female', 'Emirati Friend (Female)', 'friend', 'emirati', 'female', 25, 'emirati_friend_female.jpeg'),
    ('emirati_romantic_male', 'Emirati Romantic (Male)', 'romantic', 'emirati', 'male', 30, 'emirati_romantic_male.jpeg'),
    ('emirati_romantic_female', 'Emirati Romantic (Female)', 'romantic', 'emirati', 'female', 28, 'emirati_romantic_female.jpeg')
ON CONFLICT (bot_id) DO NOTHING;
```

---

## 4. Messages Table (with pgvector + HNSW Index)

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'bot', 'system')),
    content TEXT NOT NULL,
    language TEXT,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for O(log N) approximate nearest neighbor search
CREATE INDEX idx_messages_embedding_hnsw
    ON messages
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);

-- Composite index for context loading (user + bot + time)
CREATE INDEX idx_messages_user_bot_time
    ON messages(user_id, bot_id, created_at DESC);

-- Index for diary CRON (fetch today's messages)
CREATE INDEX idx_messages_created_date
    ON messages(created_at);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages"
    ON messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert messages"
    ON messages FOR INSERT
    WITH CHECK (true);
```

### Vector Search RPC Function

```sql
CREATE OR REPLACE FUNCTION match_messages(
    query_embedding vector(768),
    match_user_id UUID,
    match_bot_id TEXT,
    match_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    role TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        m.role,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM messages m
    WHERE m.user_id = match_user_id
      AND m.bot_id = match_bot_id
      AND m.embedding IS NOT NULL
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

---

## 5. Diaries Table

```sql
CREATE TABLE diaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_id TEXT NOT NULL,
    entry_date DATE NOT NULL,
    content TEXT NOT NULL,
    mood TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bot_id, entry_date)
);

CREATE INDEX idx_diaries_user_bot ON diaries(user_id, bot_id, entry_date DESC);

-- RLS
ALTER TABLE diaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own diaries"
    ON diaries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert diaries"
    ON diaries FOR INSERT
    WITH CHECK (true);
```

---

## 6. Games Table

```sql
CREATE TABLE games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    archetype TEXT NOT NULL CHECK (archetype IN ('mentor', 'friend', 'romantic')),
    category TEXT NOT NULL,
    min_turns INTEGER DEFAULT 3,
    max_turns INTEGER DEFAULT 15,
    xp_reward INTEGER DEFAULT 250,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_games_archetype ON games(archetype);

-- RLS (public read)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read games"
    ON games FOR SELECT
    USING (true);
```

### Seed Games

```sql
INSERT INTO games (id, name, description, archetype, category, min_turns, max_turns, xp_reward) VALUES
    -- Mentor games
    ('mentor_wisdom_quest', 'Wisdom Quest', 'Answer life''s big questions. The mentor poses philosophical dilemmas and you reason through them together.', 'mentor', 'philosophy', 5, 10, 250),
    ('mentor_culture_trivia', 'Culture Compass', 'Test your knowledge about the mentor''s home city and culture. From food to history.', 'mentor', 'trivia', 5, 12, 200),
    ('mentor_life_simulator', 'Life Crossroads', 'Face real-life dilemmas and make choices. The mentor guides you through consequences.', 'mentor', 'simulation', 5, 10, 300),
    -- Friend games
    ('friend_would_you_rather', 'Would You Rather?', 'Classic would-you-rather with wild, culturally-flavored scenarios!', 'friend', 'party', 5, 15, 200),
    ('friend_story_builder', 'Story Chain', 'Build a collaborative story one sentence at a time with twists!', 'friend', 'creative', 8, 15, 250),
    ('friend_two_truths', 'Two Truths & A Lie', 'Take turns sharing two truths and a lie. Can you spot the lie?', 'friend', 'social', 4, 10, 200),
    ('friend_music_battle', 'Song Lyrics Battle', 'Quote lyrics and guess the song. Culturally themed!', 'friend', 'music', 5, 12, 200),
    -- Romantic games
    ('romantic_dream_date', 'Dream Date Planner', 'Plan the perfect dream date together. Choose city, activity, food, and vibe!', 'romantic', 'romance', 5, 10, 250),
    ('romantic_love_language', 'Love Language Quiz', 'Discover your love language through playful scenarios with flirty commentary.', 'romantic', 'quiz', 5, 8, 200),
    ('romantic_20_questions', '20 Flirty Questions', 'A flirty version of 20 questions where chemistry keeps rising!', 'romantic', 'social', 10, 20, 300)
ON CONFLICT (id) DO NOTHING;
```

---

## 7. User Game Sessions Table

```sql
CREATE TABLE user_game_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_id TEXT NOT NULL,
    game_id TEXT NOT NULL REFERENCES games(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    turn_count INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_game_sessions_user ON user_game_sessions(user_id, status);
CREATE INDEX idx_game_sessions_bot ON user_game_sessions(user_id, bot_id);

-- RLS
ALTER TABLE user_game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own game sessions"
    ON user_game_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage game sessions"
    ON user_game_sessions FOR ALL
    USING (true);
```

---

## 8. User XP Table

```sql
CREATE TABLE user_xp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_id TEXT NOT NULL,
    total_xp INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bot_id)
);

CREATE INDEX idx_user_xp_user_bot ON user_xp(user_id, bot_id);
CREATE INDEX idx_user_xp_leaderboard ON user_xp(total_xp DESC);

-- RLS
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own XP"
    ON user_xp FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage XP"
    ON user_xp FOR ALL
    USING (true);
```

### XP Increment RPC Function

```sql
CREATE OR REPLACE FUNCTION increment_user_xp(
    p_user_id UUID,
    p_bot_id TEXT,
    p_xp_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Upsert XP for user-bot pair
    INSERT INTO user_xp (user_id, bot_id, total_xp, updated_at)
    VALUES (p_user_id, p_bot_id, p_xp_amount, NOW())
    ON CONFLICT (user_id, bot_id)
    DO UPDATE SET
        total_xp = user_xp.total_xp + p_xp_amount,
        updated_at = NOW();

    -- Also update the aggregate total_xp on users table
    UPDATE users
    SET total_xp = (
        SELECT COALESCE(SUM(total_xp), 0)
        FROM user_xp
        WHERE user_id = p_user_id
    )
    WHERE id = p_user_id;
END;
$$;
```

---

## 9. Helper RPC: Get Active User-Bot Pairs (for Diary CRON)

```sql
CREATE OR REPLACE FUNCTION get_active_user_bot_pairs()
RETURNS TABLE (user_id UUID, bot_id TEXT)
LANGUAGE sql
AS $$
    SELECT DISTINCT m.user_id, m.bot_id
    FROM messages m
    WHERE m.created_at >= CURRENT_DATE
      AND m.created_at < CURRENT_DATE + INTERVAL '1 day'
    GROUP BY m.user_id, m.bot_id
    HAVING COUNT(*) >= 3;
$$;
```

---

## 10. Supabase Storage Buckets

Create these buckets in the Supabase Dashboard → Storage:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `avatars` | ✅ Yes | User profile photos |
| `bot-faces` | ✅ Yes | Bot face reference images |
| `selfies` | ✅ Yes | Generated selfie composites |
| `voice-notes` | ✅ Yes | Generated TTS audio files |
| `memes` | ✅ Yes | Generated meme images |

### Storage RLS Policies

```sql
-- Avatars: users can upload their own, anyone can read
CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Bot faces: public read only
CREATE POLICY "Public read bot faces"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'bot-faces');

-- Selfies, voice-notes, memes: service role write, public read
CREATE POLICY "Public read selfies"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('selfies', 'voice-notes', 'memes'));

CREATE POLICY "Service role can write media"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('selfies', 'voice-notes', 'memes'));
```

---

## Summary

| Table | Rows (est.) | Key Features |
|-------|-------------|--------------|
| `users` | 1 per user | Profile, XP aggregate, streak |
| `personas` | ~50 | Bot metadata, seeded |
| `messages` | Millions | pgvector(768), HNSW index |
| `diaries` | 1/user/bot/day | Nightly CRON generated |
| `games` | ~10 | Seeded game catalog |
| `user_game_sessions` | Many | Tracks active/completed games |
| `user_xp` | 1/user/bot | XP per persona relationship |








-- Enable pgvector for semantic embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 13 AND age <= 120),
    gender TEXT NOT NULL,
    location TEXT,
    bio TEXT,
    avatar_url TEXT,
    total_xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_login_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for username lookups
CREATE INDEX idx_users_username ON users(username);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Service role can insert users"
    ON users FOR INSERT
    WITH CHECK (true);

CREATE TABLE personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    archetype TEXT NOT NULL CHECK (archetype IN ('mentor', 'friend', 'romantic')),
    origin TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    age INTEGER,
    description TEXT,
    avatar_url TEXT,
    face_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personas_bot_id ON personas(bot_id);
CREATE INDEX idx_personas_archetype ON personas(archetype);

-- RLS (public read)
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read personas"
    ON personas FOR SELECT
    USING (true);



INSERT INTO personas (bot_id, display_name, archetype, origin, gender, age, face_image_url) VALUES
    -- Delhi
    ('delhi_mentor_male', 'Delhi Mentor (Male)', 'mentor', 'delhi', 'male', 50, 'delhi_mentor_male.jpeg'),
    ('delhi_mentor_female', 'Delhi Mentor (Female)', 'mentor', 'delhi', 'female', 50, 'delhi_mentor_female.jpeg'),
    ('delhi_friend_male', 'Delhi Friend (Male)', 'friend', 'delhi', 'male', 23, 'delhi_friend_male.jpeg'),
    ('delhi_friend_female', 'Delhi Friend (Female)', 'friend', 'delhi', 'female', 23, 'delhi_friend_female.jpeg'),
    ('delhi_romantic_male', 'Delhi Romantic (Male)', 'romantic', 'delhi', 'male', 29, 'delhi_romantic_male.jpeg'),
    ('delhi_romantic_female', 'Delhi Romantic (Female)', 'romantic', 'delhi', 'female', 29, 'delhi_romantic_female.jpeg'),
    -- Japanese
    ('japanese_mentor_male', 'Japanese Mentor (Male)', 'mentor', 'japanese', 'male', 60, 'japanese_mentor_male.jpeg'),
    ('japanese_mentor_female', 'Japanese Mentor (Female)', 'mentor', 'japanese', 'female', 60, 'japanese_mentor_female.jpeg'),
    ('japanese_friend_male', 'Japanese Friend (Male)', 'friend', 'japanese', 'male', 25, 'japanese_friend_male.jpeg'),
    ('japanese_friend_female', 'Japanese Friend (Female)', 'friend', 'japanese', 'female', 25, 'japanese_friend_female.jpeg'),
    ('japanese_romantic_male', 'Japanese Romantic (Male)', 'romantic', 'japanese', 'male', 30, 'japanese_romantic_male.jpeg'),
    ('japanese_romantic_female', 'Japanese Romantic (Female)', 'romantic', 'japanese', 'female', 30, 'japanese_romantic_female.jpeg'),
    -- Parisian
    ('parisian_mentor_male', 'Parisian Mentor (Male)', 'mentor', 'parisian', 'male', 60, 'parisian_mentor_male.jpeg'),
    ('parisian_mentor_female', 'Parisian Mentor (Female)', 'mentor', 'parisian', 'female', 60, 'parisian_mentor_female.jpeg'),
    ('parisian_friend_male', 'Parisian Friend (Male)', 'friend', 'parisian', 'male', 25, 'parisian_friend_male.jpeg'),
    ('parisian_friend_female', 'Parisian Friend (Female)', 'friend', 'parisian', 'female', 25, 'parisian_friend_female.jpeg'),
    ('parisian_romantic_female', 'Parisian Romantic (Female)', 'romantic', 'parisian', 'female', 28, 'parisian_romantic_female.jpeg'),
    -- Berlin
    ('berlin_mentor_male', 'Berlin Mentor (Male)', 'mentor', 'berlin', 'male', 55, 'berlin_mentor_male.jpeg'),
    ('berlin_mentor_female', 'Berlin Mentor (Female)', 'mentor', 'berlin', 'female', 55, 'berlin_mentor_female.jpeg'),
    ('berlin_friend_male', 'Berlin Friend (Male)', 'friend', 'berlin', 'male', 25, 'berlin_friend_male.jpeg'),
    ('berlin_friend_female', 'Berlin Friend (Female)', 'friend', 'berlin', 'female', 25, 'berlin_friend_female.jpeg'),
    ('berlin_romantic_male', 'Berlin Romantic (Male)', 'romantic', 'berlin', 'male', 30, 'berlin_romantic_male.jpeg'),
    ('berlin_romantic_female', 'Berlin Romantic (Female)', 'romantic', 'berlin', 'female', 28, 'berlin_romantic_female.jpeg'),
    -- Singapore
    ('singapore_mentor_male', 'Singapore Mentor (Male)', 'mentor', 'singapore', 'male', 50, 'singapore_mentor_male.jpeg'),
    ('singapore_mentor_female', 'Singapore Mentor (Female)', 'mentor', 'singapore', 'female', 50, 'singapore_mentor_female.jpeg'),
    ('singapore_friend_male', 'Singapore Friend (Male)', 'friend', 'singapore', 'male', 25, 'singapore_friend_male.jpeg'),
    ('singapore_friend_female', 'Singapore Friend (Female)', 'friend', 'singapore', 'female', 25, 'singapore_friend_female.jpeg'),
    ('singapore_romantic_male', 'Singapore Romantic (Male)', 'romantic', 'singapore', 'male', 28, 'singapore_romantic_male.jpeg'),
    ('singapore_romantic_female', 'Singapore Romantic (Female)', 'romantic', 'singapore', 'female', 27, 'singapore_romantic_female.jpeg'),
    -- Mexican
    ('mexican_mentor_male', 'Mexican Mentor (Male)', 'mentor', 'mexican', 'male', 50, 'mexican_mentor_male.jpeg'),
    ('mexican_mentor_female', 'Mexican Mentor (Female)', 'mentor', 'mexican', 'female', 50, 'mexican_mentor_female.jpeg'),
    ('mexican_friend_male', 'Mexican Friend (Male)', 'friend', 'mexican', 'male', 25, 'mexican_friend_male.jpeg'),
    ('mexican_friend_female', 'Mexican Friend (Female)', 'friend', 'mexican', 'female', 25, 'mexican_friend_female.jpeg'),
    ('mexican_romantic_male', 'Mexican Romantic (Male)', 'romantic', 'mexican', 'male', 30, 'mexican_romantic_male.jpeg'),
    ('mexican_romantic_female', 'Mexican Romantic (Female)', 'romantic', 'mexican', 'female', 28, 'mexican_romantic_female.jpeg'),
    -- Sri Lankan
    ('srilankan_mentor_male', 'Sri Lankan Mentor (Male)', 'mentor', 'srilankan', 'male', 50, 'srilankan_mentor_male.jpeg'),
    ('srilankan_mentor_female', 'Sri Lankan Mentor (Female)', 'mentor', 'srilankan', 'female', 50, 'srilankan_mentor_female.jpeg'),
    ('srilankan_friend_male', 'Sri Lankan Friend (Male)', 'friend', 'srilankan', 'male', 25, 'srilankan_friend_male.jpeg'),
    ('srilankan_friend_female', 'Sri Lankan Friend (Female)', 'friend', 'srilankan', 'female', 25, 'srilankan_friend_female.jpeg'),
    ('srilankan_romantic_male', 'Sri Lankan Romantic (Male)', 'romantic', 'srilankan', 'male', 28, 'srilankan_romantic_male.jpeg'),
    ('srilankan_romantic_female', 'Sri Lankan Romantic (Female)', 'romantic', 'srilankan', 'female', 27, 'srilankan_romantic_female.jpeg'),
    -- Emirati
    ('emirati_mentor_male', 'Emirati Mentor (Male)', 'mentor', 'emirati', 'male', 50, 'emirati_mentor_male.jpeg'),
    ('emirati_mentor_female', 'Emirati Mentor (Female)', 'mentor', 'emirati', 'female', 50, 'emirati_mentor_female.jpeg'),
    ('emirati_friend_male', 'Emirati Friend (Male)', 'friend', 'emirati', 'male', 25, 'emirati_friend_male.jpeg'),
    ('emirati_friend_female', 'Emirati Friend (Female)', 'friend', 'emirati', 'female', 25, 'emirati_friend_female.jpeg'),
    ('emirati_romantic_male', 'Emirati Romantic (Male)', 'romantic', 'emirati', 'male', 30, 'emirati_romantic_male.jpeg'),
    ('emirati_romantic_female', 'Emirati Romantic (Female)', 'romantic', 'emirati', 'female', 28, 'emirati_romantic_female.jpeg')
ON CONFLICT (bot_id) DO NOTHING;



CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'bot', 'system')),
    content TEXT NOT NULL,
    language TEXT,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for O(log N) approximate nearest neighbor search
CREATE INDEX idx_messages_embedding_hnsw
    ON messages
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);

-- Composite index for context loading (user + bot + time)
CREATE INDEX idx_messages_user_bot_time
    ON messages(user_id, bot_id, created_at DESC);

-- Index for diary CRON (fetch today's messages)
CREATE INDEX idx_messages_created_date
    ON messages(created_at);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages"
    ON messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert messages"
    ON messages FOR INSERT
    WITH CHECK (true);


CREATE OR REPLACE FUNCTION match_messages(
    query_embedding vector(768),
    match_user_id UUID,
    match_bot_id TEXT,
    match_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    role TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        m.role,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM messages m
    WHERE m.user_id = match_user_id
      AND m.bot_id = match_bot_id
      AND m.embedding IS NOT NULL
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


CREATE TABLE diaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_id TEXT NOT NULL,
    entry_date DATE NOT NULL,
    content TEXT NOT NULL,
    mood TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bot_id, entry_date)
);

CREATE INDEX idx_diaries_user_bot ON diaries(user_id, bot_id, entry_date DESC);

-- RLS
ALTER TABLE diaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own diaries"
    ON diaries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert diaries"
    ON diaries FOR INSERT
    WITH CHECK (true);



CREATE TABLE games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    archetype TEXT NOT NULL CHECK (archetype IN ('mentor', 'friend', 'romantic')),
    category TEXT NOT NULL,
    min_turns INTEGER DEFAULT 3,
    max_turns INTEGER DEFAULT 15,
    xp_reward INTEGER DEFAULT 250,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_games_archetype ON games(archetype);

-- RLS (public read)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read games"
    ON games FOR SELECT
    USING (true);

INSERT INTO games (id, name, description, archetype, category, min_turns, max_turns, xp_reward) VALUES
    -- Mentor games
    ('mentor_wisdom_quest', 'Wisdom Quest', 'Answer life''s big questions. The mentor poses philosophical dilemmas and you reason through them together.', 'mentor', 'philosophy', 5, 10, 250),
    ('mentor_culture_trivia', 'Culture Compass', 'Test your knowledge about the mentor''s home city and culture. From food to history.', 'mentor', 'trivia', 5, 12, 200),
    ('mentor_life_simulator', 'Life Crossroads', 'Face real-life dilemmas and make choices. The mentor guides you through consequences.', 'mentor', 'simulation', 5, 10, 300),
    -- Friend games
    ('friend_would_you_rather', 'Would You Rather?', 'Classic would-you-rather with wild, culturally-flavored scenarios!', 'friend', 'party', 5, 15, 200),
    ('friend_story_builder', 'Story Chain', 'Build a collaborative story one sentence at a time with twists!', 'friend', 'creative', 8, 15, 250),
    ('friend_two_truths', 'Two Truths & A Lie', 'Take turns sharing two truths and a lie. Can you spot the lie?', 'friend', 'social', 4, 10, 200),
    ('friend_music_battle', 'Song Lyrics Battle', 'Quote lyrics and guess the song. Culturally themed!', 'friend', 'music', 5, 12, 200),
    -- Romantic games
    ('romantic_dream_date', 'Dream Date Planner', 'Plan the perfect dream date together. Choose city, activity, food, and vibe!', 'romantic', 'romance', 5, 10, 250),
    ('romantic_love_language', 'Love Language Quiz', 'Discover your love language through playful scenarios with flirty commentary.', 'romantic', 'quiz', 5, 8, 200),
    ('romantic_20_questions', '20 Flirty Questions', 'A flirty version of 20 questions where chemistry keeps rising!', 'romantic', 'social', 10, 20, 300)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE user_game_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_id TEXT NOT NULL,
    game_id TEXT NOT NULL REFERENCES games(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    turn_count INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_game_sessions_user ON user_game_sessions(user_id, status);
CREATE INDEX idx_game_sessions_bot ON user_game_sessions(user_id, bot_id);

-- RLS
ALTER TABLE user_game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own game sessions"
    ON user_game_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage game sessions"
    ON user_game_sessions FOR ALL
    USING (true);

CREATE TABLE user_xp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_id TEXT NOT NULL,
    total_xp INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bot_id)
);

CREATE INDEX idx_user_xp_user_bot ON user_xp(user_id, bot_id);
CREATE INDEX idx_user_xp_leaderboard ON user_xp(total_xp DESC);

-- RLS
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own XP"
    ON user_xp FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage XP"
    ON user_xp FOR ALL
    USING (true);

CREATE OR REPLACE FUNCTION increment_user_xp(
    p_user_id UUID,
    p_bot_id TEXT,
    p_xp_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Upsert XP for user-bot pair
    INSERT INTO user_xp (user_id, bot_id, total_xp, updated_at)
    VALUES (p_user_id, p_bot_id, p_xp_amount, NOW())
    ON CONFLICT (user_id, bot_id)
    DO UPDATE SET
        total_xp = user_xp.total_xp + p_xp_amount,
        updated_at = NOW();

    -- Also update the aggregate total_xp on users table
    UPDATE users
    SET total_xp = (
        SELECT COALESCE(SUM(total_xp), 0)
        FROM user_xp
        WHERE user_id = p_user_id
    )
    WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_active_user_bot_pairs()
RETURNS TABLE (user_id UUID, bot_id TEXT)
LANGUAGE sql
AS $$
    SELECT DISTINCT m.user_id, m.bot_id
    FROM messages m
    WHERE m.created_at >= CURRENT_DATE
      AND m.created_at < CURRENT_DATE + INTERVAL '1 day'
    GROUP BY m.user_id, m.bot_id
    HAVING COUNT(*) >= 3;
$$;


-- Avatars: users can upload their own, anyone can read
CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Bot faces: public read only
CREATE POLICY "Public read bot faces"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'bot-faces');

-- Selfies, voice-notes, memes: service role write, public read
CREATE POLICY "Public read selfies"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('selfies', 'voice-notes', 'memes'));

CREATE POLICY "Service role can write media"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('selfies', 'voice-notes', 'memes'));

-- Add activity type to distinguish what generated this message
ALTER TABLE messages
    ADD COLUMN activity_type TEXT NOT NULL DEFAULT 'chat'
    CHECK (activity_type IN (
        'chat',           -- Regular chat message
        'game',           -- Game turn text
        'voice_note',     -- Voice note (text + audio_url)
        'image_gen',      -- Image/selfie generation
        'image_describe', -- Image description
        'url_summary',    -- URL summarization
        'weather',        -- Weather query
        'meme',           -- Meme generation
        'selfie'          -- Selfie generation
    ));

-- Store associated media URLs (audio, image, etc.)
-- NOT used for context/embedding — just for record keeping
ALTER TABLE messages
    ADD COLUMN media_url TEXT;

-- Index for filtering by activity type
CREATE INDEX idx_messages_activity ON messages(user_id, bot_id, activity_type);

