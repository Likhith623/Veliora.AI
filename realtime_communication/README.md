<p align="center">
  <img src="https://img.shields.io/badge/FAMILIA-Real%20People.%20Real%20Bonds.%20No%20Borders.-FF6B35?style=for-the-badge&labelColor=1a1a2e" alt="Familia Banner"/>
</p>

<h1 align="center">🌍 Familia</h1>
<h3 align="center"><em>"Real People. Real Bonds. No Borders."</em></h3>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat-square&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase" alt="Supabase"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python" alt="Python"/>
</p>

---

## Table of Contents

- [About the Project](#-about-the-project)
- [Team NEUTRONS](#-team-neutrons)
- [Core Features](#-core-features)
- [Relationship Levels System](#-relationship-levels-system)
- [Family Roles](#-family-roles)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Scripts](#-scripts)
- [License](#-license)

---

## Demo

**[Watch the Demo Video](https://drive.google.com/file/d/1yhEig74VhgStsgx-1hj0IK5x8YF-ONOF/view?usp=drivesdk)**

---

## About the Project

**Familia** is a cross-cultural human connection platform that breaks borders and language barriers to help people find **real family-like bonds** across the globe. Unlike traditional social media, Familia focuses on meaningful, verified human connections -- matching people as digital mothers, fathers, siblings, mentors, and friends.

Every user is verified through video or voice introductions. Messages are automatically translated while preserving cultural idioms. Relationships evolve through **10 trust levels** -- from Stranger to Legendary -- unlocking new features at every stage. Users compete in bonding contests, play emotional games, and gather in global family rooms to build connections that feel like real family.

> **No bots. No fakes. Just real people building real bonds across every border.**

---

## Team NEUTRONS

> **SRM University, AP -- Amaravati**

| Role | Name | Reg. Number | Email |
|------|------|-------------|-------|
| **Team Leader** | Vasireddy Likhith Chowdary | AP23110010253 | likhithchowdary_vasireddy@srmap.edu.in |
| Member | Kakani Pujitha | AP23110011433 | pujitha_kakani@srmap.edu.in |
| Member | K. Nikitha | AP23110011376 | anikitha_kunapareddy@srmap.edu.in |
| Member | Samad Shaik | AP23110010747 | samad_shaik@srmap.edu.in |

---

## Core Features

### 1. Verified Humans Only
Every person on Familia proves they are **real** through a video or voice introduction explaining *why* they want to be part of a digital family. Liveness detection, video analysis, and voice verification ensure a community free of bots, catfishers, and bad actors.

- Video introduction challenges
- Voice + photo verification
- Liveness scoring with real-human detection
- Government ID verification option
- Care Score & Reliability Score tracking

### 2. Magic Translation Bridge
AI-powered real-time translation that does not just convert words -- it **preserves meaning**. Cultural idioms are detected and explained so a Japanese grandmother can truly understand her Brazilian digital granddaughter.

- Google Cloud Translation API integration
- Automatic language detection
- Idiom detection & cultural explanations
- Cultural context notes on messages
- "Show Original" toggle for language learners
- Support for 100+ languages

### 3. Bonding Contests
Weekly synchronized challenges that pairs complete together to strengthen their bond. Questions range from *"What would your partner do if..."* to cultural quizzes and emotional deep-dives.

- Daily, weekly, and monthly contest types
- Synchronized real-time gameplay
- Open-ended, multiple choice, and true/false questions
- Leaderboard rankings
- Bond points awarded on completion
- Streak tracking for consistency

### 4. Relationship Levels (Strangers to Family to Legendary)
Every relationship starts at **Level 1 (Stranger)** and evolves through **10 levels** based on interaction quality, consistency, and mutual care. Each level unlocks new communication features.

| Level | Name | Unlocked Feature |
|-------|------|-----------------|
| 1 | Stranger | Text messaging |
| 2 | Acquaintance | Emojis & reactions |
| 3 | Bonded | Audio calls |
| 4 | Close | Video calls |
| 5 | Family | Join Global Family Room |
| 6 | Trusted | Custom themes |
| 7 | Kindred | Priority matching |
| 8 | Soulbound | Mentor badge |
| 9 | Eternal | Cultural Ambassador |
| 10 | Legendary | Digital Family Book (Heirloom) |

### 5. Global Family Rooms
Virtual living rooms where **4+ people from different countries** gather as a digital family unit. Host cultural potlucks, share recipes, celebrate festivals, and build multi-generational global families.

- Multi-country family room creation
- Cultural potluck events with dish sharing
- Moderator roles and room management
- Room-based games and activities
- Shared cultural experiences

### 6. Fun & Emotional Games
**12+ interactive games** designed to build emotional intelligence and cultural understanding between matched pairs and family rooms.

- **Emotion Charades** -- Express emotions across cultures
- **Story Chain** -- Collaborative storytelling
- **Music Swap** -- Share cultural music and reactions
- **Cultural Quizzes** -- Learn about each other's heritage
- Categories: Emotional, Cultural, Fun, Creative, Reflective
- Difficulty levels: Easy, Medium, Hard
- Bond points rewards per game

---

## Relationship Levels System

```
 Level 1     Level 2        Level 3     Level 4    Level 5
+--------+  +-----------+  +--------+  +-------+  +--------+
|Stranger|->|Acquaintance|->| Bonded |->| Close |->| Family |
+--------+  +-----------+  +--------+  +-------+  +--------+
                                                       |
 Level 10    Level 9      Level 8      Level 7    Level 6
+---------+  +--------+  +----------+  +-------+  +--------+
|Legendary|<-| Eternal|<-|Soulbound |<-|Kindred|<-|Trusted |
+---------+  +--------+  +----------+  +-------+  +--------+
```

Progression is driven by:
- Messages exchanged
- Contests completed & won
- Daily streak consistency
- Games played together
- Care Score ratings

---

## Family Roles

Users can offer and seek the following family roles:

| Role | Emoji | Color |
|------|-------|-------|
| Mother | :woman: | `#F43F5E` |
| Father | :man: | `#3B82F6` |
| Son | :boy: | `#10B981` |
| Daughter | :girl: | `#A855F7` |
| Brother | :person: | `#F59E0B` |
| Sister | :woman: | `#EC4899` |
| Mentor | :mortar_board: | `#6366F1` |
| Student | :books: | `#14B8A6` |
| Friend | :handshake: | `#FF6B35` |
| Grandparent | :older_man: | `#8B5CF6` |
| Grandchild | :child: | `#06B6D4` |
| Sibling | :person: | -- |
| Penpal | :envelope: | -- |

Role aliases are supported (e.g., searching "sibling" returns brother, sister, and sibling matches).

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 15.5.10 | React framework with App Router |
| **React** | 19.0.0 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.4.x | Utility-first styling |
| **Framer Motion** | 11.15.x | Animations & transitions |
| **Zustand** | 5.0.x | Lightweight state management |
| **Supabase JS** | 2.47.x | Auth & real-time client |
| **Lucide React** | 0.469.x | Icon library |
| **React Hot Toast** | 2.5.x | Toast notifications |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **FastAPI** | 0.104+ | Async Python web framework |
| **Uvicorn** | latest | ASGI server |
| **Supabase Python** | 2.3+ | Database & auth client |
| **httpx** | 0.25+ | Async HTTP client |
| **websockets** | 12.0+ | Real-time communication |
| **Pillow** | 10.2+ | Image processing |
| **python-multipart** | latest | File upload handling |
| **aiofiles** | latest | Async file I/O |

### Infrastructure & APIs
| Service | Purpose |
|---------|---------|
| **Supabase** | PostgreSQL database, authentication, RLS policies |
| **Google Cloud Translation** | Real-time message translation (100+ languages) |
| **Deepgram** | Speech-to-Text for voice messages |
| **Cartesia** | Text-to-Speech for voice replies |

---

## Architecture

```
+----------------------------------------------------------+
|                    FRONTEND (Next.js 15)                  |
|  +--------+ +----------+ +----------+ +--------------+   |
|  |  Auth  | |Dashboard | |  Chat    | |   Matching   |   |
|  |  Pages | |  & Nav   | |  (Phone) | |   & Browse   |   |
|  +--------+ +----------+ +----------+ +--------------+   |
|  +--------+ +----------+ +----------+ +--------------+   |
|  | Games  | | Contests | |  Family  | |   Profile    |   |
|  |        | |          | |  Rooms   | |   & Avatar   |   |
|  +--------+ +----------+ +----------+ +--------------+   |
|               Tailwind CSS + Framer Motion                |
+-----------------------+----------------------------------+
                        | REST API (HTTP)
                        v
+----------------------------------------------------------+
|                  BACKEND (FastAPI)                        |
|  +-------+ +----------+ +----------+ +--------------+    |
|  | Auth  | | Profiles | | Matching | |    Chat      |    |
|  |Router | |  Router  | |  Router  | |   Router     |    |
|  +-------+ +----------+ +----------+ +--------------+    |
|  +-------+ +----------+ +----------+ +--------------+    |
|  |Games  | | Contests | |  Family  | |   Safety     |    |
|  |Router | |  Router  | |  Rooms   | |   Router     |    |
|  +-------+ +----------+ +----------+ +--------------+    |
|  +------------+  +--------------+                        |
|  |Translation |  |    Voice     |                        |
|  |   Router   |  |   Router     |                        |
|  +------------+  +--------------+                        |
|        Auth Service | Matching Service | Translation Svc |
+-----------------------+----------------------------------+
                        | Supabase Client
                        v
+----------------------------------------------------------+
|                 SUPABASE (PostgreSQL)                     |
|  +----------+ +--------------+ +----------------------+  |
|  | profiles | | relationships| |    messages           |  |
|  | users    | | matching_q   | |    notifications      |  |
|  | langs    | | contests     | |    achievements       |  |
|  | verify   | | games        | |    family_rooms       |  |
|  +----------+ +--------------+ +----------------------+  |
|              Row Level Security (RLS) Policies            |
+----------------------------------------------------------+
```

---

## Database Schema

Key tables in the Supabase PostgreSQL database:

| Table | Purpose |
|-------|---------|
| `profiles` | User data, avatar config, scores, verification status, matching preferences |
| `user_languages` | Languages per user with proficiency levels (native/fluent/intermediate/learning) |
| `verification_records` | Video, voice, photo verification with liveness scores |
| `relationships` | Bonds between users with roles, levels, scores, streaks |
| `messages` | Chat messages with translations, idiom detection, cultural notes |
| `contests` | Bonding contests (daily/weekly/monthly) with scoring |
| `contest_questions` | Individual questions for each contest |
| `games` | Available game catalog with categories and difficulties |
| `game_sessions` | Active/completed game sessions with player scores |
| `family_rooms` | Global family room configurations |
| `room_members` | Room membership with moderator roles |
| `notifications` | User notification system |
| `achievements` | Unlockable badges (common to legendary rarity) |
| `cultural_potluck` | Cultural potluck events in family rooms |

---

## API Endpoints

All API routes are prefixed with `/api/v1`

| Router | Prefix | Description |
|--------|--------|-------------|
| **Auth** | `/api/v1/auth` | Sign up, login, JWT verification, session management |
| **Profiles** | `/api/v1/profiles` | Profile CRUD, avatar updates, language management, status |
| **Matching** | `/api/v1/matching` | Browse by role, smart matching, relationship creation |
| **Chat** | `/api/v1/chat` | Send/receive messages, translation, read receipts |
| **Contests** | `/api/v1/contests` | Create, join, answer questions, leaderboards |
| **Games** | `/api/v1/games` | Game catalog, sessions, scoring, rewards |
| **Family Rooms** | `/api/v1/family-rooms` | Room creation, membership, potluck events |
| **Safety** | `/api/v1/safety` | Content moderation, reporting, blocking |
| **Translation** | `/api/v1/translation` | Text translation, language detection, idiom parsing |
| **Voice** | `/api/v1/voice` | Speech-to-text (Deepgram), text-to-speech (Cartesia) |

**Health Check:** `GET /` -- Returns API status and version

---

## Project Structure

```
cfc_Familya_1/
|
|-- frontend/                       # Next.js 15 Application
|   |-- src/
|   |   |-- app/
|   |   |   |-- layout.tsx          # Root layout with theme + auth providers
|   |   |   |-- page.tsx            # Landing page (hero, features, CTA)
|   |   |   |-- globals.css         # Global styles + chat phone UI
|   |   |   |-- login/              # Login page
|   |   |   |-- signup/             # Registration page
|   |   |   |-- verify/             # Email verification
|   |   |   |-- dashboard/          # Main dashboard
|   |   |   |-- profile/            # Profile management
|   |   |   |-- avatar/             # Avatar customization
|   |   |   |-- matching/           # Browse & match by roles
|   |   |   |-- chat/               # Chat list
|   |   |   |   +-- [relationshipId]/ # Individual chat (phone-like UI)
|   |   |   |-- contests/           # Bonding contests
|   |   |   |-- games/              # Game catalog & sessions
|   |   |   +-- family-rooms/       # Global family rooms
|   |   |-- components/
|   |   |   +-- BottomNav.tsx       # Mobile bottom navigation
|   |   |-- lib/
|   |   |   |-- api.ts              # API client (Axios)
|   |   |   |-- AuthContext.tsx      # Authentication context provider
|   |   |   |-- supabase.ts         # Supabase client initialization
|   |   |   +-- ThemeContext.tsx     # Dark/light theme context
|   |   +-- types/
|   |       +-- index.ts            # TypeScript type definitions
|   |-- package.json
|   |-- tailwind.config.js
|   |-- tsconfig.json
|   +-- next.config.js
|
|-- backend/                        # FastAPI Application
|   |-- main.py                     # App entry point, router registration, CORS
|   |-- config.py                   # Environment settings (Pydantic BaseSettings)
|   |-- requirements.txt            # Python dependencies
|   |-- start.sh                    # Server start script
|   |-- models/
|   |   +-- schemas.py              # Pydantic request/response models
|   |-- routers/
|   |   |-- auth.py                 # Authentication endpoints
|   |   |-- profiles.py             # Profile management
|   |   |-- matching.py             # Role-based matching & browsing
|   |   |-- chat.py                 # Messaging & translation
|   |   |-- contests.py             # Bonding contest system
|   |   |-- games.py                # Game engine
|   |   |-- family_rooms.py         # Family room management
|   |   |-- safety.py               # Content moderation
|   |   |-- translation.py          # Translation service
|   |   +-- voice.py                # Voice STT/TTS
|   +-- services/
|       |-- auth_service.py         # JWT verification, user extraction
|       |-- supabase_client.py      # Supabase connection
|       |-- matching_service.py     # Smart matching algorithm
|       |-- translation_service.py  # Google Translate wrapper
|       |-- deepgram_stt.py         # Speech-to-text service
|       |-- cartesia_tts.py         # Text-to-speech service
|       +-- contest_service.py      # Contest logic
|
|-- supabase/                       # Database
|   |-- schema.sql                  # Complete database schema (915 lines)
|   |-- add_role_column.sql         # Role column migration
|   +-- fix_rls_policies.sql        # Row Level Security policies
|
|-- scripts/                        # Utility Scripts
|   |-- create_demo_users.sh        # Create test users
|   |-- set_demo_roles.sh           # Assign demo roles
|   |-- set_roles.py                # Python role assignment
|   +-- update_demo_user_roles.sh   # Update demo user roles
|
+-- README.md                       # You are here!
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.11+
- **Supabase** account (free tier works)
- **Google Cloud** API key (for Translation)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/cfc_Familya_1.git
cd cfc_Familya_1
```

### 2. Set Up the Database

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the files in order:
   - `supabase/schema.sql` -- Complete database schema
   - `supabase/add_role_column.sql` -- Role column migration
   - `supabase/fix_rls_policies.sql` -- Row Level Security policies

### 3. Set Up the Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see Environment Variables section)
cp .env.example .env

# Start the server
uvicorn main:app --reload --port 8000
```

### 4. Set Up the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" >> .env.local

# Start the development server
npm run dev
```

### 5. Open the App

Visit [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Google Cloud Translation
GOOGLE_TRANSLATE_API_KEY=your-google-api-key

# Deepgram (Speech-to-Text)
DEEPGRAM_API_KEY=your-deepgram-key

# Cartesia (Text-to-Speech)
CARTESIA_API_KEY=your-cartesia-key

# CORS Origins
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/create_demo_users.sh` | Creates demo users for testing |
| `scripts/set_demo_roles.sh` | Assigns family roles to demo users |
| `scripts/set_roles.py` | Python script for role assignment |
| `scripts/update_demo_user_roles.sh` | Updates existing demo user roles |
| `backend/start.sh` | Starts the FastAPI server |

---

## Design Philosophy

- **Familia Orange** (`#FF6B35`) -- The signature color representing warmth and connection
- **Dark-first design** with full light mode support
- **Phone-like chat interface** -- WhatsApp-inspired messaging on desktop & mobile
- **Framer Motion animations** throughout the UI
- **Custom SVG avatars** with full customization (skin, hair, eyes, outfit, accessories)
- **RTL-ready** for global language support

---

## Contributing

This project was built for the **Code For Change** hackathon. Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is developed by **Team NEUTRONS** at **SRM University AP, Amaravati** for the Code For Change hackathon.

---

<p align="center">
  <strong>Built with love by Team NEUTRONS</strong><br/>
  <em>SRM University AP -- Amaravati</em><br/><br/>
  <img src="https://img.shields.io/badge/Familia-Connecting%20Humanity-FF6B35?style=for-the-badge" alt="Familia"/>
</p>
