"""
Veliora.AI — Manual Memory Routes
Allows the frontend 'Memories' vault to directly CRUD user memories.
Also supports semantic auto-extraction via Gemini.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import logging
from models.schemas import MemoryEntry, MemoryAddRequest, MemoryUpdateRequest
from api.auth import get_current_user
from services.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/memory", tags=["Manual Memory Vault"])

@router.get("/get", response_model=List[MemoryEntry])
async def get_memories(
    bot_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch manual memories for the UI.
    Extracts the user_id from the modern JWT token automatically.
    """
    from services.supabase_client import get_supabase_admin
    
    user_id = current_user["user_id"]
    client = get_supabase_admin()
    
    try:
        # Avoid blocking the main thread with synchronous httpx requests
        import asyncio
        response = await asyncio.to_thread(
            client.table("memories").select("*").eq("user_id", user_id).eq("bot_id", bot_id).execute
        )
        return response.data
    except Exception as e:
        logger.error(f"Error fetching memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add")
async def add_memory(
    request: MemoryAddRequest,
    current_user: dict = Depends(get_current_user),
):
    """Adds a new manual memory to the vault."""
    from services.supabase_client import get_supabase_admin
    
    user_id = current_user["user_id"]
    client = get_supabase_admin()
    
    payload = {
        "user_id": user_id,
        "bot_id": request.bot_id,
        "memory": request.memory,
        "category": request.category or "general",
        "relation_id": request.relation_id,
        # Default magnitude for manual memories is usually high
        "rfm_magnitude": 5 
    }
    
    try:
        import asyncio
        response = await asyncio.to_thread(
            client.table("memories").insert(payload).execute
        )
        return {
            "success": True,
            "inserted": response.data
        }
    except Exception as e:
        logger.error(f"Error adding memory: {e}")
        raise HTTPException(status_code=500, detail="Failed to add memory")


@router.put("/update")
async def update_memory(
    id: str,
    request: MemoryUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Updates an existing manual memory."""
    from services.supabase_client import get_supabase_admin
    
    user_id = current_user["user_id"]
    client = get_supabase_admin()
    
    payload = {}
    if request.memory is not None:
        payload["memory"] = request.memory
    if request.category is not None:
        payload["category"] = request.category
    if request.relation_id is not None:
        payload["relation_id"] = request.relation_id
        
    if not payload:
        return {"success": True, "updated": []}
        
    try:
        # Enforce user ownership in update
        import asyncio
        response = await asyncio.to_thread(
            client.table("memories").update(payload).eq("id", id).eq("user_id", user_id).execute
        )
        return {
            "success": True,
            "updated": response.data
        }
    except Exception as e:
        logger.error(f"Error updating memory: {e}")
        raise HTTPException(status_code=500, detail="Failed to update memory")


@router.delete("/delete")
async def delete_memory(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """Deletes a manual memory."""
    from services.supabase_client import get_supabase_admin
    
    user_id = current_user["user_id"]
    client = get_supabase_admin()
    
    try:
        # Enforce user ownership
        import asyncio
        await asyncio.to_thread(
            client.table("memories").delete().eq("id", id).eq("user_id", user_id).execute
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting memory: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete memory")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUTO-EXTRACT MEMORIES (Gemini-powered semantic extraction)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class MemoryExtractRequest(BaseModel):
    bot_id: str
    user_name: str
    user_message: str
    bot_response: str


MEMORY_CATEGORIES = [
    "background", "favorites", "hopes_and_goals", "opinions",
    "personality", "relationships", "routines", "fears", "general"
]

EXTRACTION_PROMPT = """You are a memory extraction assistant for an AI companion app.
Analyze the following conversation turn and extract any personal facts or preferences expressed by the user.

User name: {user_name}
User said: "{user_message}"
Bot replied: "{bot_response}"

For each distinct fact about the user, output a JSON array of objects with:
- "memory": A concise 3rd-person fact (e.g., "{user_name} loves basketball", "{user_name} works as a designer")
- "category": One of: background, favorites, hopes_and_goals, opinions, personality, relationships, routines, fears, general

Rules:
- Only extract facts explicitly stated by the USER, not hypotheticals
- If the user expresses a preference, record it as a fact
- Be concise. Max 15 words per memory.
- If nothing extractable, return []
- Output ONLY valid JSON array, no other text.

Example output: [{{"memory": "{user_name} loves basketball", "category": "favorites"}}]"""


@router.post("/extract")
async def extract_memories(
    request: MemoryExtractRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Automatically extract and store semantic memories from a conversation turn.
    Uses Gemini to analyze user messages and identify personal facts.
    """
    import json
    import asyncio

    user_id = current_user["user_id"]
    client = get_supabase_admin()

    try:
        # Build the Gemini prompt
        prompt = EXTRACTION_PROMPT.format(
            user_name=request.user_name,
            user_message=request.user_message,
            bot_response=request.bot_response,
        )

        # Call Gemini for extraction using the same SDK as the rest of the codebase
        from google import genai
        from config.settings import get_settings
        settings = get_settings()
        genai_client = genai.Client(api_key=settings.effective_google_api_key)

        def _call_gemini():
            return genai_client.models.generate_content(model="gemini-2.0-flash", contents=prompt)

        gemini_response = await asyncio.to_thread(_call_gemini)
        raw_text = gemini_response.text.strip()

        # Strip markdown code blocks if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        raw_text = raw_text.strip()

        # Parse JSON
        extracted = json.loads(raw_text)
        if not isinstance(extracted, list):
            extracted = []

        if not extracted:
            return {"success": True, "extracted": 0, "memories": []}

        # Insert valid memories
        inserted = []
        for item in extracted:
            if not isinstance(item, dict):
                continue
            memory_text = item.get("memory", "").strip()
            category = item.get("category", "general")
            if category not in MEMORY_CATEGORIES:
                category = "general"
            if not memory_text:
                continue

            # Check for near-duplicate (simple: exact match on memory text)
            def _check_dup():
                return client.table("memories") \
                    .select("id") \
                    .eq("user_id", user_id) \
                    .eq("bot_id", request.bot_id) \
                    .eq("memory", memory_text) \
                    .limit(1) \
                    .execute()

            dup_result = await asyncio.to_thread(_check_dup)
            if dup_result.data:
                continue  # Skip duplicate

            payload = {
                "user_id": user_id,
                "bot_id": request.bot_id,
                "memory": memory_text,
                "category": category,
                "rfm_magnitude": 4,  # auto-extracted memories get a medium weight
            }

            def _insert(p=payload):
                return client.table("memories").insert(p).execute()

            ins_result = await asyncio.to_thread(_insert)
            if ins_result.data:
                inserted.append(ins_result.data[0])

        return {
            "success": True,
            "extracted": len(inserted),
            "memories": inserted,
        }

    except json.JSONDecodeError as e:
        logger.warning(f"Memory extraction JSON parse error: {e} — raw: {raw_text if 'raw_text' in dir() else 'N/A'}")
        return {"success": True, "extracted": 0, "memories": []}
    except Exception as e:
        logger.error(f"Memory extraction error: {e}", exc_info=True)
        # Non-fatal — don't crash the caller
        return {"success": False, "extracted": 0, "error": str(e)}
