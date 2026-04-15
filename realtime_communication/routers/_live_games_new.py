import json
import random
from datetime import datetime
from typing import Dict
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends

from realtime_communication.models.schemas import CreateLiveGameRequest
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.auth_service import get_current_user_id
from realtime_communication.services.xp_service import award_xp, check_and_level_up
from realtime_communication.services.notification_service import send_notification
from realtime_communication.routers.presence import presence_manager

router = APIRouter(prefix="/games/live", tags=["Live Immersive Games"])

class LiveGameManager:
    def __init__(self):
        self.connections: Dict[str, Dict[str, WebSocket]] = {}
    
    async def connect(self, ws: WebSocket, session_id: str, user_id: str):
        if session_id not in self.connections:
            self.connections[session_id] = {}
        self.connections[session_id][user_id] = ws
    
    def disconnect(self, session_id: str, user_id: str):
        if session_id in self.connections:
            self.connections[session_id].pop(user_id, None)
            if not self.connections[session_id]:
                del self.connections[session_id]
    
    async def broadcast(self, session_id: str, data: dict, exclude: str = None):
        if session_id in self.connections:
            for uid, ws in list(self.connections[session_id].items()):
                if uid != exclude:
                    try:
                        await ws.send_json(data)
                    except Exception:
                        pass
    
    async def send_to(self, session_id: str, user_id: str, data: dict):
        if session_id in self.connections and user_id in self.connections[session_id]:
            try:
                await self.connections[session_id][user_id].send_json(data)
            except Exception:
                pass

manager = LiveGameManager()

# ... REST endpoints (get available, create game) ...
