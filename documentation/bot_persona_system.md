# 🤖 Bot Persona System Architecture

This file contains the high-level diagrams and flowcharts for the **Bot Persona System**, including the **Multimodal Mental Health Trigger System**, the **Redis & RabbitMQ Architecture**, and the **Entire Platform Architecture**.

## 1. Bot Persona System (with Multimodal Emotion & Mental Health)

```mermaid
flowchart TB
    classDef default fill:#fff,stroke:#333,stroke-width:1px,color:#111,rx:6,ry:6;
    classDef yellowbox fill:#fffacc,stroke:#e6e600,stroke-width:2px,color:#111,rx:6,ry:6;
    classDef pinkbox fill:#ffe6e6,stroke:#ff6666,stroke-width:2px,color:#111,rx:6,ry:6;
    classDef purplebox fill:#f2e6ff,stroke:#9933cc,stroke-width:2px,color:#111,rx:6,ry:6;
    classDef bluebox fill:#e6f3ff,stroke:#3399ff,stroke-width:2px,color:#111,rx:6,ry:6;
    classDef orangebox fill:#fff0e6,stroke:#ff9933,stroke-width:2px,color:#111,rx:6,ry:6;
    classDef mentalbox fill:#e6ffe6,stroke:#33cc33,stroke-width:2px,color:#111,rx:6,ry:6;

    %% ==========================================
    %% COLUMN 1: MAIN MESSAGE FLOW
    %% ==========================================
    subgraph MessageFlow ["💬 Main Message Processing Flow"]
        
        UserMsg["User sends message <br/>(text, selfie, URL, voice note)"] --> ProcessMsg["Process Message Input (B1)"]
        
        %% The 4 Parallel Checks
        ProcessMsg --> GuardRails["Guard Rails"]
        ProcessMsg --> NSFW["NSFW Determiner <br/>(Romantic bots only)"]
        ProcessMsg --> MHCheck["Multimodal Emotion & Mental Health"]:::mentalbox
        ProcessMsg --> LangCheck["Language Check"]
        
        %% --- Interventions (Left Side) ---
        GuardRails -- "Violation" --> LogViolation["Log Violation"]:::pinkbox
        NSFW -- "NSFW detected" --> LogViolation
        
        LogViolation --> ApplyInterv["Apply Intervention"]:::pinkbox
        ApplyInterv --> FetchContext["Fetch Safe Context <br/>/memory.py"]:::pinkbox
        FetchContext --> SafeResume["Safe Resume Conversation <br/>/utils/security.py"]:::pinkbox
        
        %% --- Therapy (Center-Right) ---
        MHCheck -- "Declining" --> LogDecline["Log Mental Health Decline"]:::mentalbox
        LogDecline --> AlertSys["Crisis Alert System"]:::mentalbox
        LogDecline --> TherapyMode["Activate Therapy/Comfort Mode"]:::mentalbox
        
        %% --- Error (Far Right) ---
        LangCheck -- "Unsupported" --> LangError["Return language error"]
        
        %% --- Convergence to Memory API ---
        MemAPI["Memory API <br/>(Retrieve context & store)"]:::purplebox
        
        GuardRails -- "Safe" --> MemAPI
        NSFW -- "Safe" --> MemAPI
        MHCheck -- "Stable" --> MemAPI
        LangCheck -- "Supported" --> MemAPI
        SafeResume --> MemAPI
        TherapyMode --> MemAPI
        
        %% --- Routing ---
        ContentRouting{"Content Analysis & <br/>Feature Routing"}
        MemAPI --> ContentRouting
        
        %% --- Generators Diamond Fan-Out ---
        ContentRouting -- "Website URL" --> WebSummary["Website URL Summary"]:::bluebox
        ContentRouting -- "Song URL" --> SongAnalyzer["Song Analyzer"]:::bluebox
        ContentRouting -- "Selfie" --> SelfieReader["Selfie Reader"]:::bluebox
        ContentRouting -- "News request" --> NewsGen["News Generator"]:::bluebox
        ContentRouting -- "Weather request" --> WeatherGen["Weather Generator"]:::bluebox
        ContentRouting -- "Festival info" --> FestivalGen["Festival Generator"]:::bluebox
        ContentRouting -- "Meme request" --> MemeGen["Meme Generator"]:::bluebox
        ContentRouting -- "General chat" --> BotResGen["Bot Response Generator"]:::bluebox
        
        ContentRouting -- "Unknown input" --> LangError
        
        %% --- Generators Convergence ---
        RespComp["Response Composition"]:::bluebox
        WebSummary --> RespComp
        SongAnalyzer --> RespComp
        SelfieReader --> RespComp
        NewsGen --> RespComp
        WeatherGen --> RespComp
        FestivalGen --> RespComp
        MemeGen --> RespComp
        BotResGen --> RespComp
        
        %% --- Output Formatting ---
        DecideFormat{"Decide Response Format <br/>(Text / Voice)"}:::bluebox
        RespComp --> DecideFormat
        
        VoiceNote["Convert to Voice Note"]:::bluebox
        AwardXP["Award XP"]:::bluebox
        
        DecideFormat -- "Voice" --> VoiceNote --> AwardXP
        DecideFormat -- "Text" --> AwardXP
    end

    %% ==========================================
    %% COLUMN 2: BUTTON CLICK FLOW
    %% ==========================================
    subgraph ButtonFlow ["🖱️ Clickable Button Flow"]
        
        BtnClick["User clicks button <br/>(game, selfie gen, voice call)"] --> ProcessBtn["Process Button Input (B2)"]
        ProcessBtn --> BtnRouting{"Button Type Routing"}
        
        GameAgent["Gaming Agent"]:::orangebox
        SelfieGen["Selfie Generator"]:::orangebox
        VoiceCall["Voice Call Initiator"]:::orangebox
        
        BtnRouting -- "Game" --> GameAgent
        BtnRouting -- "Selfie Gen" --> SelfieGen
        BtnRouting -- "Voice Call" --> VoiceCall
        
        LoadCtx["Load User Context <br/>(preferences, history)"]:::purplebox
        GameAgent --> LoadCtx
        SelfieGen --> LoadCtx
        VoiceCall --> LoadCtx
        
        AwardBtnXP["Award XP for Button"]:::bluebox
        LogBtn["Log Button Action & Return"]:::bluebox
        
        LoadCtx --> AwardBtnXP --> LogBtn
    end

    %% ==========================================
    %% FINAL OUTPUT (Global Convergence)
    %% ==========================================
    LogRet["Log & Return Response <br/>(store to supabase)"]
    
    AwardXP --> LogRet
    LangError --> LogRet
    LogBtn --> LogRet
```

## 2. Redis & RabbitMQ Architecture (Bot Persona System)

```mermaid
graph TD
    classDef client fill:#f5faff,stroke:#a3d2ca,stroke-width:2px;
    classDef api fill:#e6f7ff,stroke:#91d5ff,stroke-width:2px;
    classDef redis fill:#fff2e8,stroke:#ffbb96,stroke-width:2px;
    classDef rmq fill:#fffbe6,stroke:#ffe58f,stroke-width:2px;
    classDef worker fill:#f6ffed,stroke:#b7eb8f,stroke-width:2px;
    classDef db fill:#f9f0ff,stroke:#d0bdf4,stroke-width:2px;
    classDef logic fill:#e6ffe6,stroke:#33cc33,stroke-width:2px;

    UserReq["User Request (Chat, Voice)"]:::client
    API_Endpoints["FastAPI: /api/chat, /api/voice"]:::api

    UserReq --> API_Endpoints

    subgraph Redis_Ecosystem ["Redis Stack 7.x (High Speed Tier)"]
        direction TB
        ConnMgr["redis_class.py (RedisManager) <br/>Maintains Connection Pooling"]:::redis
        ActiveCache["Active Context List <br/>Keys: session:userid:botid <br/>TTL: 24h"]:::redis
        
        subgraph RediSearch_Indices ["RediSearch Indexes"]
            MemIndex["FT.CREATE memories_idx <br/>Schema: user_id (TAG), bot_id (TAG) <br/>embedding (VECTOR HNSW 10 TYPE FLOAT32 DIM 768) <br/>rfm_score, magnitude, frequency (NUMERIC)"]:::redis
            ChatIndex["FT.CREATE chats_idx <br/>Schema: user_message (TEXT), bot_response (TEXT) <br/>user_id (TAG), bot_id (TAG)"]:::redis
        end
    end

    API_Endpoints --> ConnMgr
    ConnMgr --> ActiveCache
    ConnMgr -.->|"Vector Similarity + RFM Filtering"| MemIndex
    
    subgraph Core_Memory_Logic ["Memory Retrieval Engine (memory_functions.py)"]
        direction TB
        SemanticSearch["Semantic Vector Search (pgvector + HF)"]:::logic
        RFMProcessor["RFM Processor (RFM_functions.py) <br/>Recency x Frequency x Magnitude"]:::logic
        ContextLoader["Context Builder (chatbot.py)"]:::logic
        
        SemanticSearch --> ContextLoader
        RFMProcessor --> ContextLoader
    end

    MemIndex --> RFMProcessor
    ActiveCache --> ContextLoader

    subgraph RabbitMQ_Async_Bus ["RabbitMQ (Message Broker)"]
        direction LR
        Exchange{"Topic Exchange <br/>(veliora_exchange)"}:::rmq
        MemQueue["Queue: memory_queue <br/>Durable, Ack-based"]:::rmq
        LogQueue["Queue: message_queue <br/>Durable, Ack-based"]:::rmq
        CleanupTask["queue_cleanup.py <br/>(Prunes stale/dead queues)"]:::rmq
        
        Exchange -- "routing_key: memory" --> MemQueue
        Exchange -- "routing_key: log" --> LogQueue
        CleanupTask -.->|"Monitor"| MemQueue
    end

    API_Endpoints -- "Publish (serialization.py)" --> Exchange

    subgraph Workers_Db ["Async Python Consumers & Supabase Storage"]
        direction TB
        MemWorker["memory_worker.py (LLM Extract)"]:::worker
        MsgWorker["message_worker.py (Batch Process)"]:::worker
        
        Supabase_Mem["pg_vector: memories (Permanent Archival)"]:::db
        Supabase_Msg["table: messages (Chat History)"]:::db
    end

    MemQueue -->|"Consume"| MemWorker
    LogQueue -->|"Consume"| MsgWorker

    MemWorker -- "1. HASH + Vector insert" --> MemIndex
    MemWorker -- "2. Permanent Store" --> Supabase_Mem
    MsgWorker -- "Append log" --> ChatIndex
    MsgWorker -- "Permanent Store" --> Supabase_Msg
```

## 3. Entire Architecture (Persona Engine + Real-time Familia)

```mermaid
flowchart TD
    %% ==========================================
    %% GLOBAL STYLES & THEMES
    %% ==========================================
    classDef client fill:#f9f0ff,stroke:#d0bdf4,stroke-width:2px,color:#111,rx:8,ry:8;
    classDef auth fill:#e6f7ff,stroke:#91d5ff,stroke-width:2px,color:#111,rx:8,ry:8;
    classDef sys1 fill:#fffbe6,stroke:#ffe58f,stroke-width:2px,color:#111,rx:8,ry:8;
    classDef sys2 fill:#f6ffed,stroke:#b7eb8f,stroke-width:2px,color:#111,rx:8,ry:8;
    classDef db fill:#fff0f6,stroke:#ffadd2,stroke-width:2px,color:#111,rx:8,ry:8;
    classDef ext fill:#fff2e8,stroke:#ffbb96,stroke-width:2px,color:#111,rx:8,ry:8;
    classDef rmq fill:#fcf1f1,stroke:#e9c4c4,stroke-width:2px,color:#111,rx:8,ry:8;
    classDef mental fill:#e6ffe6,stroke:#33cc33,stroke-width:2px,color:#111,rx:8,ry:8;

    %% ==========================================
    %% 1. CLIENT & GATEWAY LAYER
    %% ==========================================
    subgraph Client_Layer ["📱 Client Interfaces"]
        WebClient["Next.js Web / React 19 Frontend"]:::client
        MobileClient["iOS / Android Mobile Devices"]:::client
    end

    subgraph API_Gateway ["🛡️ Security & Routing (FastAPI)"]
        TokenAuth["Supabase JWT Validator <br/>(HS256/ES256 Signature Decoder)"]:::auth
        RouterMatrix{"API Namespace Router"}:::auth
        
        TokenAuth -- "Tokens Verified" --> RouterMatrix
    end

    WebClient & MobileClient --> TokenAuth

    %% ==========================================
    %% 2. CORE SYSTEMS (Split Pillars)
    %% ==========================================
    
    %% LEFT PILLAR: AI & Persona
    subgraph System_1_Persona ["🤖 Sub-System I: Veliora Persona Engine (AI Layer)"]
        PersonaRoutes["/api/chat, /api/voice <br/>(REST & WebSocket)"]:::sys1
        
        MentalHealth["Emotion & Mental Health Tracker <br/>(Crisis Detection & Therapy Mode)"]:::mental
        BrainCore["Generative Logic Core (llm_engine.py) <br/>Google Gemini 2.0 Flash"]:::sys1
        Prompts["Prompt Injector (bot_prompt.py)"]:::sys1
        
        MemoryEngine["Neuro-Link Memory Processing <br/>(Redis RFM + pgvector)"]:::sys1
        ServerlessRank["HuggingFace Reranker <br/>(cross-encoder MiniLM)"]:::ext
        
        MultimodalAI["Multimodal Processors <br/>(Computer Vision, Stable Diffusion)"]:::ext
        VoicePipe["Double-Streaming Audio Pipeline <br/>(Deepgram STT -> Cartesia TTS)"]:::ext

        %% Internal Flow
        PersonaRoutes --> MentalHealth --> BrainCore --> Prompts
        PersonaRoutes --> MemoryEngine --> ServerlessRank
        PersonaRoutes --> MultimodalAI
        PersonaRoutes --> VoicePipe
    end

    %% RIGHT PILLAR: Realtime Human Interaction
    subgraph System_2_Realtime ["👥 Sub-System II: Familia Real-time Hub (Human Layer)"]
        RealtimeRoutes["/api/v1/chat, /calls <br/>(REST & P2P Signaler)"]:::sys2
        
        MatchMaker["Cross-Cultural Matching Service <br/>(Role/Age/Language engine)"]:::sys2
        Transliterator["Translation & Contextual Guard <br/>(Cloud Translate + Idiom Guard)"]:::sys2
        GamificationXP["10-Level Bond Progression <br/>(Stranger -> Eternal)"]:::sys2
        SocialArena["Multiplayer WebSockets <br/>(Family Rooms, TicTacToe)"]:::sys2

        %% Internal Flow
        RealtimeRoutes --> MatchMaker
        RealtimeRoutes --> Transliterator
        RealtimeRoutes --> GamificationXP
        RealtimeRoutes --> SocialArena
    end

    %% Route branching
    RouterMatrix -- "AI Commands" --> PersonaRoutes
    RouterMatrix -- "Human P2P/Social" --> RealtimeRoutes

    %% ==========================================
    %% 3. ASYNC LAYER (Middleware)
    %% ==========================================
    subgraph Async_Fabric ["⚙️ Background Tasks & Queues"]
        RabbitBus{"RabbitMQ Exchanger"}:::rmq
        Workers["mem_worker & msg_worker"]:::rmq
        CronJobs["background_tasks.py <br/>(XP Flushes, Diary CRON)"]:::rmq
        
        RabbitBus --> Workers
    end

    %% Event Triggers mapping down to Async
    MemoryEngine -- "Publish raw facts" --> RabbitBus
    GamificationXP -- "Batch XP in memory" --> CronJobs

    %% ==========================================
    %% 4. UNIFIED DATA CENTER (Bottom Layer)
    %% ==========================================
    subgraph Data_Center ["💾 Unified Persistence Layer"]
        BlobStorage["Supabase Storage (S3) <br/>(Uploads, Voice Notes, Avatars)"]:::db
        RedisCache["Redis Stack 7.x <br/>(Indexes, Active Hash, Pub/Sub)"]:::db
        PgSQL["Supabase PostgreSQL <br/>(pg_vector Schema, Profiles, RLS)"]:::db
    end

    %% Connecting Left Pillar & Left Async to Databases
    MultimodalAI & VoicePipe --> BlobStorage
    Workers --> RedisCache & PgSQL
    MemoryEngine --> RedisCache
    
    %% Connecting Right Pillar & Right Async to Databases
    RealtimeRoutes -- "Media Uploads" --> BlobStorage
    RealtimeRoutes -- "WebRTC ICE Pub/Sub" --> RedisCache
    SocialArena --> RedisCache
    CronJobs --> PgSQL
```
