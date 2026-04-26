"""Translation service using Google Cloud Translation API v2 and Gemini 2.0 Flash for Cultural Context.
Handles batch translations, dialect nuances, and fact extraction."""
import httpx
import json
import re
from typing import Optional, List, Dict
from realtime_communication.config import get_settings

LANG_NAMES = {
    "en": "English", "hi": "Hindi", "pt": "Portuguese",
    "ja": "Japanese", "es": "Spanish", "ko": "Korean",
    "fr": "French", "de": "German", "zh": "Chinese",
    "ar": "Arabic", "ru": "Russian", "it": "Italian",
    "ta": "Tamil", "te": "Telugu", "bn": "Bengali",
    "tr": "Turkish", "th": "Thai", "vi": "Vietnamese",
    "nl": "Dutch", "pl": "Polish", "sv": "Swedish",
}

FACT_PATTERNS: dict[str, list[str]] = {
    "favorite_food": [
        r"(?:my |i )?(?:favorite|fav|favourite) (?:food|dish|meal|cuisine) (?:is|are|would be) (.+?)(?:\.|!|,|$)",
        r"i (?:love|like|enjoy|prefer) (?:eating|to eat|having) (.+?)(?:\.|!|,|$)",
    ],
    "hobby": [
        r"(?:my |i )?(?:hobbies?|hobby) (?:is|are|include) (.+?)(?:\.|!|,|$)",
        r"i (?:love|like|enjoy) (?:to )?(.+?)(?:ing)? in my (?:free|spare) time",
    ],
}

GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"
GOOGLE_DETECT_URL = "https://translation.googleapis.com/language/translate/v2/detect"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

async def detect_language(text: str) -> str:
    """Detect language mapping against Google Translate."""
    if not text.strip(): return "en"
    api_key = get_settings().GOOGLE_TRANSLATE_API_KEY
    if not api_key: return "en"

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_DETECT_URL,
                params={"key": api_key},
                json={"q": text},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {}).get("detections", [])
                if data and len(data) > 0 and len(data[0]) > 0:
                    return data[0][0].get("language", "en")
    except Exception:
        pass
    return "en"

async def _get_cultural_context_gemini(text: str, source_lang: str, target_lang: str) -> Optional[Dict]:
    """Provide deep cultural, idiomatic, and slang explanations via Gemini 2.0 Flash."""
    api_key = get_settings().GEMINI_API_KEY
    if not api_key:
        return None

    src_name = LANG_NAMES.get(source_lang, source_lang)
    tgt_name = LANG_NAMES.get(target_lang, target_lang)

    system_prompt = f"""You are a multicultural linguistic expert. Analyze this {src_name} text: "{text}".
Does it contain an idiom, culturally specific slang, or deep cultural nuance that perfectly translating to {tgt_name} would lose?
If YES, respond strictly in valid JSON format: {{"has_idiom": true, "explanation": "<a concise 1-sentence explanation in {tgt_name}>"}}.
If NO or just standard text, respond strictly: {{"has_idiom": false}}. Wait, output ONLY JSON, no markdown blocks."""

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={api_key}",
                json={
                    "contents": [{"parts": [{"text": system_prompt}]}],
                    "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
                },
                timeout=12
            )
            if resp.status_code == 200:
                data = resp.json()
                candidate_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                parsed = json.loads(candidate_text.strip())
                if parsed.get("has_idiom"):
                    return {
                        "has_idiom": True,
                        "idiom_explanation": parsed.get("explanation"),
                        "cultural_note": f"💡 Cultural Note: {parsed.get('explanation')}"
                    }
    except Exception as e:
        print(f"[Gemini Context Error] {e}")
    return None

async def _translate_with_google(text: str, source_lang: str, target_lang: str) -> str:
    """Standard Google V2 string translation."""
    api_key = get_settings().GOOGLE_TRANSLATE_API_KEY
    if not api_key: return f"[Translation Server Error] {text}"

    try:
        data = {"q": text, "target": target_lang, "format": "text"}
        if source_lang and source_lang != "und":
            data["source"] = source_lang
            
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_TRANSLATE_URL, 
                params={"key": api_key},
                data=data, 
                timeout=15
            )
            if resp.status_code == 200:
                translations = resp.json().get("data", {}).get("translations", [])
                if translations: return translations[0].get("translatedText", text)
            else:
                print(f"[Google Translate Error] Status: {resp.status_code}, Body: {resp.text}")
    except Exception as e:
        print(f"[Google Translate Exception] {e}")
    return text

async def _batch_translate_google(texts: List[str], source_lang: str, target_lang: str) -> List[str]:
    """Scalable batch translation optimized for multi-message or history dumps using Google V2 API."""
    api_key = get_settings().GOOGLE_TRANSLATE_API_KEY
    if not api_key: return texts

    try:
        data = [("target", target_lang), ("format", "text")]
        if source_lang and source_lang != "und":
            data.append(("source", source_lang))
        for t in texts:
            data.append(("q", t))
            
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_TRANSLATE_URL, 
                params={"key": api_key},
                data=data, 
                timeout=20
            )
            if resp.status_code == 200:
                translations = resp.json().get("data", {}).get("translations", [])
                return [t.get("translatedText", orig) for t, orig in zip(translations, texts)]
            else:
                print(f"[Google Batch Translate Error] Status: {resp.status_code}, Body: {resp.text}")
    except Exception as e:
        print(f"[Google Batch Translate Exception] {e}")
    return texts

def _normalize_for_google(lang: str) -> str:
    """Normalize codes like 'te-Latn' to 'te' for Google Translate V2 compatibility."""
    if not lang: return lang
    if "-" in lang:
        # Keep common variants like pt-BR, zh-CN, but strip script variants like -Latn
        if lang.endswith("-Latn") or lang.endswith("-Hans") or lang.endswith("-Hant"):
            return lang.split("-")[0]
    return lang

async def translate_text(text: str, source_lang: str, target_lang: str) -> dict:
    """Translates text and synchronously fetches nuanced cultural context."""
    if not text.strip() or source_lang == target_lang:
        return {"translated_text": text, "has_idiom": False, "idiom_explanation": None, "cultural_note": None}

    # Normalize source for Google but keep original for Gemini context
    google_src = _normalize_for_google(source_lang)
    translated = await _translate_with_google(text, google_src, target_lang)
    context = await _get_cultural_context_gemini(text, source_lang, target_lang)

    return {
        "translated_text": translated,
        "has_idiom": context["has_idiom"] if context else False,
        "idiom_explanation": context["idiom_explanation"] if context else None,
        "cultural_note": context["cultural_note"] if context else None,
    }

async def batch_translate(texts: List[str], source_lang: str, target_lang: str) -> List[dict]:
    """Execute high-throughput batch translation without context calls per item to save tokens/time."""
    if not texts or source_lang == target_lang:
        return [{"translated_text": txt, "has_idiom": False} for txt in texts]

    google_src = _normalize_for_google(source_lang)
    translated_list = await _batch_translate_google(texts, google_src, target_lang)
    
    return [
        {"original_text": orig, "translated_text": trans, "has_idiom": False} 
        for orig, trans in zip(texts, translated_list)
    ]

async def extract_facts_from_message(text: str, user_id: str) -> list:
    """Regex pattern extraction fallback for chat messages."""
    facts = []
    text_lower = text.lower()
    for category, patterns in FACT_PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, text_lower)
            if match:
                facts.append({"category": category, "value": match.group(1).strip()})
                break
    return facts
