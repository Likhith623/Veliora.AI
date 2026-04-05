"""Translation-specific router for direct translation API access and language mapping."""
from fastapi import APIRouter, HTTPException, Depends
from realtime_communication.models.schemas import BatchTranslateRequest, ToggleShowOriginalRequest
from realtime_communication.services.translation_service import translate_text, detect_language, batch_translate, LANG_NAMES
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.auth_service import get_current_user_id

router = APIRouter(prefix="/translate", tags=["Translation"])

@router.post("/")
async def translate(text: str, source_lang: str = None, target_lang: str = "en"):
    """Translate text between languages with full Gemini Nuance Analysis."""
    if not source_lang:
        source_lang = await detect_language(text)
    
    result = await translate_text(text, source_lang, target_lang)
    
    return {
        "original_text": text,
        "source_language": source_lang,
        "target_language": target_lang,
        **result
    }

@router.post("/batch")
async def batch_translate_endpoint(req: BatchTranslateRequest):
    """High-performance batch translation without blocking LLM calls. Useful for historic chat load."""
    if not req.source_lang:
        # Detect from the first string provided if no unified source_lang is passed
        req.source_lang = await detect_language(req.texts[0]) if req.texts else "en"

    result_list = await batch_translate(req.texts, req.source_lang, req.target_lang)

    return {
        "source_language": req.source_lang,
        "target_language": req.target_lang,
        "translations": result_list
    }

@router.post("/detect")
async def detect(text: str):
    """Detect the language of text."""
    lang = await detect_language(text)
    
    return {
        "text": text,
        "language_code": lang,
        "language_name": LANG_NAMES.get(lang, lang)
    }

@router.get("/languages")
async def supported_languages():
    """Get list of supported languages."""
    return {
        "languages": [
            {"code": code, "name": name} 
            for code, name in LANG_NAMES.items()
        ]
    }

@router.patch("/languages/{language_code}/show-original")
async def toggle_show_original(
    language_code: str, 
    req: ToggleShowOriginalRequest, 
    user_id: str = Depends(get_current_user_id)
):
    """Toggle 'Show Original' specifically customized down to the dialect/language level."""
    db = get_supabase()

    # O(1) Realtime string mapping via Wrapper
    update_res = db.table("user_languages_realtime") \
        .update({"show_original": req.show_original}) \
        .eq("user_id", user_id) \
        .eq("language_code", language_code) \
        .execute()
        
    if not update_res.data:
        raise HTTPException(status_code=404, detail="Language profile not found for this user.")

    return {
        "success": True,
        "language_code": language_code,
        "show_original": req.show_original,
        "message": f"Successfully toggled show_original to {req.show_original} for {language_code}"
    }

