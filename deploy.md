# Veliora.AI — Architecture & VM Deployment Guide

This document provides a rigorous analysis of the Veliora.AI architecture across both the **Realtime** and **Persona** systems, followed by a complete step-by-step guide on how to host this complex infrastructure perfectly on a Virtual Machine (VM).

---

## 1. System Architecture Analysis

Veliora.AI is a highly distributed, real-time, AI-driven application. It is broken down into several distinct microservices and external integrations.

### A. Core Backend (FastAPI Monolith)
- **Role:** Central orchestrator for both Persona AI interactions and Realtime multiplayer social mechanics.
- **Responsibilities:**
  - REST API endpoints for user profiles, XP, notifications, and game logic.
  - Integration with **Supabase** for PostgreSQL database interactions and Auth.
  - Integration with AI services: **Gemini** (Text/Embeddings), **Deepgram** (STT), **Cartesia** (TTS), and **HuggingFace**.
- **Realtime WebSocket Server:** Runs inside FastAPI using Starlette WebSockets. It handles real-time signaling for Live Games (Tic-Tac-Toe, Ping Pong, Match-Making), Chat events, and Family Groups.

### B. Background Workers (RabbitMQ + Redis)
- **Role:** Asynchronous processing to prevent blocking the main FastAPI event loop.
- **Components (`Redis_chat/working_files/`):**
  - **Memory Worker:** Monitors queues and compresses long chat histories into semantic memories using Gemini. Stores these back into Redis Vector Search.
  - **Message Worker:** Handles asynchronous dispatch of messages.
  - **XP Flush Worker / Diary Cron:** Runs on intervals to batch update XP in Postgres and generate daily AI diaries.
- **Tech:** Uses RabbitMQ for durable queues and Redis Stack for intermediate state and vector storage.

### C. WebRTC Voice/Video Server (Mediasoup - Node.js)
- **Role:** Selective Forwarding Unit (SFU) for Realtime Calls.
- **Responsibilities:** 
  - Offloads the heavy lifting of peer-to-peer media routing from the Python backend.
  - Handles multi-party voice and video calls in "Family Rooms" and direct 1-1 realtime calls.
  - Requires its own WebSocket signaling (or hooks into FastAPI) and needs specific UDP ports open for RTP/RTCP media streams.

### D. Frontends (Next.js / React)
- **Persona Frontend (Port 3000):** The primary AI interaction layer. Handles individual user interactions with Veliora (spiritual guide, etc).
- **Realtime Frontend (Port 3001):** The multiplayer social layer. Handles user-to-user chat, finding matches, live multiplayer games, contests, and video calls.

---

## 2. Infrastructure Requirements for a VM

To host this perfectly, you need a VM with decent specifications because you are running AI embeddings, multiple workers, and a WebRTC SFU.

**Recommended VM Specs:**
- **OS:** Ubuntu 22.04 LTS
- **CPU:** 4 vCPUs minimum (WebRTC and Python workers are CPU intensive)
- **RAM:** 8GB - 16GB (Redis Vector Stack and Next.js builds consume high RAM)
- **Storage:** 50GB+ SSD

**Required Network Ports (Firewall):**
- **TCP 80 & 443:** HTTP/HTTPS Traffic (Nginx)
- **TCP 8000:** (Optional) If accessing FastAPI directly without Nginx proxy
- **UDP 10000 - 10100:** (CRITICAL) Mediasoup RTC ports for Voice/Video media. If these are blocked, video calls will fail.

---

## 3. Step-by-Step VM Deployment Guide

### Phase 1: Environment Setup
1. SSH into your VM and update packages:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
2. Install dependencies: Docker, Node.js, Python 3.10+, and Nginx.
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs python3-pip python3-venv nginx docker.io docker-compose npm
   sudo npm install -g pm2
   ```

### Phase 2: Deploying Infrastructure Services (Docker)
You need Redis Stack and RabbitMQ running in the background. Create a `docker-compose.yml`:
```yaml
version: '3.8'
services:
  redis:
    image: redis/redis-stack-server:latest
    ports:
      - "6379:6379"
    restart: always

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    restart: always
```
Run it: `sudo docker-compose up -d`

### Phase 3: Deploying the Backend
1. Clone the repository and setup Python Virtual Environment.
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. Create your `.env` file based on your local `.env`. **Important:** Change `CORS_ORIGINS` to match your actual domain names (e.g., `https://yourdomain.com`).
3. Start the FastAPI server and Background Workers using `PM2`:
   ```bash
   # Create an ecosystem.config.js for PM2
   cat << 'EOF' > ecosystem.config.js
   module.exports = {
     apps: [
       {
         name: "veliora-fastapi",
         script: "uvicorn",
         args: "main:app --host 0.0.0.0 --port 8000 --workers 4",
         interpreter: "venv/bin/python"
       }
     ]
   }
   EOF
   pm2 start ecosystem.config.js
   pm2 save
   ```

### Phase 4: Deploying the WebRTC (Mediasoup) Server
1. Navigate to the `mediasoup_server` directory.
2. Install dependencies: `npm install`
3. Edit `config.js` to set the `announcedIp` to your VM's **Public IP Address**. (Critical for video calls to work!).
4. Start with PM2:
   ```bash
   pm2 start index.js --name "veliora-webrtc"
   pm2 save
   ```

### Phase 5: Deploying the Frontends
1. Build both Next.js applications:
   ```bash
   # Persona Frontend
   cd persona_frontend_main/chatbot-new-frontend
   npm install
   npm run build
   pm2 start npm --name "persona-frontend" -- start -- -p 3000

   # Realtime Frontend
   cd ../../realtime_frontend
   npm install
   npm run build
   pm2 start npm --name "realtime-frontend" -- start -- -p 3001
   ```

### Phase 6: Nginx Reverse Proxy & SSL
You will need a domain name (e.g., `veliora.ai`). Route traffic using Nginx:
1. `sudo nano /etc/nginx/sites-available/veliora`
2. Configure blocks for `/api` (routes to port 8000), `/` (routes to 3000), and `realtime.veliora.ai` (routes to 3001).
3. Use Certbot to generate Free SSL certificates.
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d veliora.ai -d realtime.veliora.ai
   ```

### Crucial VM Reminders
1. **Mediasoup UDP Ports:** The most common failure point when moving to a VM is forgetting to open the UDP port range (usually 10000-10100) in AWS Security Groups, DigitalOcean Firewalls, or UFW. WebRTC will fail to establish media streams without this.
2. **WebSockets:** Ensure Nginx is configured to `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";` so real-time games and chat don't disconnect.
