"""Calls router — WebRTC signaling for audio/video calls + existing STT/TTS.

WebRTC signaling:
  - WS /calls/signal/{relationship_id}/{user_id}
  - Handles: offer, answer, ice_candidate, call_start, call_end
  - Enforces: Audio ≥ Level 3, Video ≥ Level 4

STT/TTS endpoints preserved from former voice.py router.
"""
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, Dict
import json
from datetime import datetime

from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.auth_service import get_current_user_id
from realtime_communication.services.notification_service import send_notification

router = APIRouter(prefix="/calls", tags=["Voice & Video Calls"])


# ─── WebRTC Signaling Manager ─────────────────────────────────────────────────

class SignalingManager:
    def __init__(self):
        self.connections: Dict[str, Dict[str, WebSocket]] = {}  # relationship_id → {user_id: ws}
    
    async def connect(self, ws: WebSocket, relationship_id: str, user_id: str):
        await ws.accept()
        if relationship_id not in self.connections:
            self.connections[relationship_id] = {}
        self.connections[relationship_id][user_id] = ws
    
    def disconnect(self, relationship_id: str, user_id: str):
        if relationship_id in self.connections:
            self.connections[relationship_id].pop(user_id, None)
            if not self.connections[relationship_id]:
                del self.connections[relationship_id]
    
    async def send_to_partner(self, relationship_id: str, sender_id: str, data: dict):
        if relationship_id in self.connections:
            for uid, ws in self.connections[relationship_id].items():
                if uid != sender_id:
                    try:
                        await ws.send_json(data)
                    except Exception:
                        pass


signaling = SignalingManager()


# ─── WebRTC Signaling WebSocket ────────────────────────────────────────────────

@router.websocket("/signal/{relationship_id}/{user_id}")
async def webrtc_signal(websocket: WebSocket, relationship_id: str, user_id: str):
    """WebRTC signaling endpoint for peer-to-peer audio/video calls.
    
    Client sends:
      - {"type": "call_start", "call_type": "audio"|"video"}
      - {"type": "offer", "sdp": "..."}
      - {"type": "answer", "sdp": "..."}
      - {"type": "ice_candidate", "candidate": {...}}
      - {"type": "call_end"}
    """
    db = get_supabase()
    
    # Verify relationship exists and user is part of it
    rel = db.table("relationships_realtime") \
        .select("user_a_id, user_b_id, level, status") \
        .eq("id", relationship_id) \
        .execute()
    
    if not rel.data or rel.data[0]["status"] != "active":
        await websocket.close(code=4004, reason="Relationship not found or inactive")
        return
    
    rel_data = rel.data[0]
    if user_id not in [rel_data["user_a_id"], rel_data["user_b_id"]]:
        await websocket.close(code=4003, reason="You are not part of this relationship")
        return
    
    partner_id = rel_data["user_b_id"] if rel_data["user_a_id"] == user_id else rel_data["user_a_id"]
    level = rel_data.get("level", 1)
    
    await signaling.connect(websocket, relationship_id, user_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")
            
            if msg_type == "call_start":
                call_type = msg.get("call_type", "audio")
                
                # Enforce level requirements
                if call_type == "audio" and level < 3:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Audio calls require Level 3 (Bonded). Current: Level {level}."
                    })
                    continue
                
                if call_type == "video" and level < 4:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Video calls require Level 4 (Close). Current: Level {level}."
                    })
                    continue
                
                # Notify partner
                caller = db.table("profiles_realtime").select("display_name").eq("id", user_id).execute()
                caller_name = caller.data[0]["display_name"] if caller.data else "Someone"
                
                await send_notification(
                    partner_id, "incoming_call",
                    data={"relationship_id": relationship_id, "call_type": call_type, "caller_id": user_id},
                    sender=caller_name
                )
                
                # Forward to partner
                await signaling.send_to_partner(relationship_id, user_id, {
                    "type": "incoming_call",
                    "call_type": call_type,
                    "caller_id": user_id,
                })
            
            elif msg_type in ("offer", "answer", "ice_candidate"):
                # Forward signaling data to partner
                await signaling.send_to_partner(relationship_id, user_id, {
                    **msg,
                    "from": user_id,
                })
            
            elif msg_type == "call_end":
                # Update call minutes and create call log
                duration = msg.get("duration_seconds", 0)
                call_type = msg.get("call_type", "audio")
                if duration > 0:
                    try:
                        current = db.table("relationships_realtime") \
                            .select("total_call_minutes") \
                            .eq("id", relationship_id) \
                            .execute()
                        if current.data:
                            new_mins = current.data[0].get("total_call_minutes", 0) + (duration // 60)
                            db.table("relationships_realtime").update({
                                "total_call_minutes": new_mins,
                                "last_interaction_at": datetime.utcnow().isoformat(),
                            }).eq("id", relationship_id).execute()
                        
                        # Phase 7: Log the call explicitly
                        db.table("call_logs_realtime").insert({
                            "relationship_id": relationship_id,
                            "caller_id": user_id,  # Person ending the call will log for simplicity, or we can use metadata
                            "receiver_id": partner_id,
                            "call_type": call_type,
                            "started_at": datetime.utcnow().isoformat(), # approximation if not provided by client
                            "duration_seconds": duration,
                            "status": "completed"
                        }).execute()
                    except Exception:
                        pass
                
                await signaling.send_to_partner(relationship_id, user_id, {
                    "type": "call_ended",
                    "ended_by": user_id,
                })
            
            elif msg_type == "call_reject":
                await signaling.send_to_partner(relationship_id, user_id, {
                    "type": "call_rejected",
                    "rejected_by": user_id,
                })
                
                # Send missed call notification
                caller = db.table("profiles_realtime").select("display_name").eq("id", user_id).execute()
                caller_name = caller.data[0]["display_name"] if caller.data else "Someone"
                await send_notification(
                    partner_id, "missed_call",
                    data={"relationship_id": relationship_id},
                    sender=caller_name
                )
    
    except WebSocketDisconnect:
        signaling.disconnect(relationship_id, user_id)
        await signaling.send_to_partner(relationship_id, user_id, {
            "type": "peer_disconnected",
            "user_id": user_id,
        })
    except Exception as e:
        print(f"[Signaling] Error: {e}")
        signaling.disconnect(relationship_id, user_id)


# ─── STT/TTS Endpoints (from former voice.py) ─────────────────────────────────

class SpeakRequest(BaseModel):
    text: str
    language: str = "en"
    voice_id: Optional[str] = None
    output_format: str = "mp3"


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """Transcribe uploaded audio to text."""
    from realtime_communication.services.deepgram_stt import transcribe_audio, transcribe_audio_auto_detect
    
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")
    
    mime = audio.content_type or "audio/webm"
    
    if language:
        result = await transcribe_audio(audio_bytes, language=language, mime_type=mime)
    else:
        result = await transcribe_audio_auto_detect(audio_bytes, mime_type=mime)
    
    if result.get("error"):
        raise HTTPException(status_code=502, detail=result["error"])
    
    return {
        "transcript": result["transcript"],
        "confidence": result["confidence"],
        "detected_language": result["language"],
        "words": result.get("words", []),
    }


@router.post("/speak")
async def speak(req: SpeakRequest):
    """Convert text to speech."""
    from realtime_communication.services.cartesia_tts import synthesize_speech, get_available_voices
    
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    result = await synthesize_speech(
        text=req.text, language=req.language,
        voice_id=req.voice_id, output_format=req.output_format,
    )
    
    if not result["success"]:
        raise HTTPException(status_code=502, detail=result.get("error", "TTS failed"))
    
    return Response(
        content=result["audio_bytes"],
        media_type=result["content_type"],
        headers={"Content-Disposition": f'inline; filename="speech.{req.output_format}"'},
    )


@router.get("/voices")
async def list_voices():
    """List available TTS voices."""
    from realtime_communication.services.cartesia_tts import get_available_voices
    return {"voices": get_available_voices()}

@router.get("/logs/{relationship_id}")
async def get_call_logs(relationship_id: str, limit: int = 50, offset: int = 0, current_user: str = Depends(get_current_user_id)):
    """Phase 7: Fetch historical call logs between users in a specific relationship."""
    db = get_supabase()
    
    # Authorize access
    rel = db.table("relationships_realtime").select("user_a_id, user_b_id, status").eq("id", relationship_id).execute()
    if not rel.data or (current_user not in [rel.data[0]["user_a_id"], rel.data[0]["user_b_id"]]):
        raise HTTPException(status_code=403, detail="Unauthorized access to these call logs.")
    
    logs = db.table("call_logs_realtime") \
        .select("id, caller_id, receiver_id, call_type, started_at, duration_seconds, status, created_at") \
        .eq("relationship_id", relationship_id) \
        .order("created_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()
        
    return {"logs": logs.data or [], "count": len(logs.data or [])}
