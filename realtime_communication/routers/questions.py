"""Personal questions router — users create Q&A for friends to answer in contests.

Users can:
  - Add their own questions with answers
  - View their questions
  - Friends can see questions (without answers) and try to answer them
  - Random questions generated at signup for users who don't provide their own
"""
import random
import os
import json
import httpx
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime

from realtime_communication.models.schemas import CreateUserQuestionRequest, AnswerUserQuestionRequest
from realtime_communication.services.auth_service import get_current_user_id
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.xp_service import award_xp
from realtime_communication.services.notification_service import send_notification
from realtime_communication.config import get_settings

router = APIRouter(prefix="/questions", tags=["Personal Q&A"])

# Random questions fallback
RANDOM_QUESTIONS = [
    "What's your all-time favorite movie?",
    "What's your comfort food?",
    "If you could visit any country, where would you go?",
    "What's your biggest fear?",
    "What's your dream job?",
    "What's your favorite season and why?",
    "What's the best gift you've ever received?",
    "Do you prefer mornings or nights?",
    "What's a skill you wish you had?",
    "What's your favorite childhood memory?",
    "What music do you listen to when you're sad?",
    "What's one thing that always makes you laugh?",
    "What's your hidden talent?",
    "What does your ideal weekend look like?",
    "If you could have dinner with anyone, who would it be?",
    "What's your favorite book or author?",
    "What's the most adventurous thing you've done?",
    "What are you most grateful for?",
    "What's your favorite holiday tradition?",
    "If you could learn any instrument, which one?",
]


@router.post("/mine")
async def add_my_question(
    req: CreateUserQuestionRequest,
    current_user: str = Depends(get_current_user_id)
):
    """Add a personal question with its correct answer."""
    db = get_supabase()
    
    # Limit to 20 questions per user
    existing = db.table("user_questions_realtime") \
        .select("id", count="exact") \
        .eq("user_id", current_user) \
        .eq("is_active", True) \
        .execute()
    
    if existing.count >= 20:
        raise HTTPException(status_code=400, detail="Maximum 20 questions allowed")
    
    # DB doesn't strictly depend on correct_answer text if options exist, but we satisfy NOT NULL constraint
    correct_text = ""
    if req.options and 0 <= req.correct_option_index < len(req.options):
        correct_text = req.options[req.correct_option_index]
    
    q = db.table("user_questions_realtime").insert({
        "user_id": current_user,
        "question_text": req.question_text,
        "correct_answer": correct_text,
        "category": req.category,
        "options": req.options or [],
        "correct_option_index": req.correct_option_index or 0,
        "is_active": True,
    }).execute()
    
    return {"question": q.data[0] if q.data else None}


@router.get("/mine")
async def get_my_questions(current_user: str = Depends(get_current_user_id)):
    """Get all my personal questions with answers."""
    db = get_supabase()
    
    questions = db.table("user_questions_realtime") \
        .select("*") \
        .eq("user_id", current_user) \
        .eq("is_active", True) \
        .order("created_at", desc=True) \
        .execute()
    
    return {"questions": questions.data or []}


@router.put("/{question_id}")
async def update_my_question(
    question_id: str,
    req: CreateUserQuestionRequest,
    current_user: str = Depends(get_current_user_id)
):
    """Update a personal question."""
    db = get_supabase()
    
    q = db.table("user_questions_realtime").select("user_id").eq("id", question_id).execute()
    if not q.data or q.data[0]["user_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not your question")
    
    correct_text = ""
    if req.options and 0 <= req.correct_option_index < len(req.options):
        correct_text = req.options[req.correct_option_index]
        
    result = db.table("user_questions_realtime").update({
        "question_text": req.question_text,
        "correct_answer": correct_text,
        "category": req.category,
        "options": req.options or [],
        "correct_option_index": req.correct_option_index or 0,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", question_id).execute()
    
    return {"question": result.data[0] if result.data else None}


@router.delete("/{question_id}")
async def delete_my_question(question_id: str, current_user: str = Depends(get_current_user_id)):
    """Delete (deactivate) a personal question."""
    db = get_supabase()
    
    q = db.table("user_questions_realtime").select("user_id").eq("id", question_id).execute()
    if not q.data or q.data[0]["user_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not your question")
    
    db.table("user_questions_realtime").update({
        "is_active": False,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", question_id).execute()
    
    return {"status": "deleted"}


@router.get("/friend/{friend_id}")
async def get_friend_questions(friend_id: str, current_user: str = Depends(get_current_user_id)):
    """Get a friend's questions (WITHOUT answers) for you to answer them.
    Only accessible if you are friends.
    """
    db = get_supabase()
    
    # Verify friendship
    rel = db.table("relationships_realtime") \
        .select("id") \
        .or_(
            f"and(user_a_id.eq.{current_user},user_b_id.eq.{friend_id}),"
            f"and(user_a_id.eq.{friend_id},user_b_id.eq.{current_user})"
        ) \
        .eq("status", "active") \
        .execute()
    
    if not rel.data:
        raise HTTPException(status_code=403, detail="You must be friends to view their questions")
    
    # Get questions WITHOUT correct_answer
    questions = db.table("user_questions_realtime") \
        .select("id, question_text, category, times_asked, times_answered_correctly, created_at") \
        .eq("user_id", friend_id) \
        .eq("is_active", True) \
        .order("created_at") \
        .execute()
    
    # Get friend's name
    friend = db.table("profiles_realtime").select("display_name").eq("id", friend_id).execute()
    friend_name = friend.data[0]["display_name"] if friend.data else "Your friend"
    
    return {
        "friend_name": friend_name,
        "questions": questions.data or [],
        "count": len(questions.data or []),
    }


@router.post("/answer")
async def answer_friend_question(
    req: AnswerUserQuestionRequest,
    current_user: str = Depends(get_current_user_id)
):
    """Submit an answer to a friend's question. Check if correct and award XP."""
    db = get_supabase()
    
    # Get the question
    q = db.table("user_questions_realtime").select("*").eq("id", req.question_id).execute()
    if not q.data:
        raise HTTPException(status_code=404, detail="Question not found")
    
    q_data = q.data[0]
    friend_id = q_data["user_id"]
    
    if friend_id == current_user:
        raise HTTPException(status_code=400, detail="Cannot answer your own question")
    
    # Verify friendship
    rel = db.table("relationships_realtime") \
        .select("id") \
        .or_(
            f"and(user_a_id.eq.{current_user},user_b_id.eq.{friend_id}),"
            f"and(user_a_id.eq.{friend_id},user_b_id.eq.{current_user})"
        ) \
        .eq("status", "active") \
        .execute()
    
    if not rel.data:
        raise HTTPException(status_code=403, detail="You must be friends to answer")
    
    # Check answer
    correct = q_data["correct_answer"].lower().strip()
    user_answer = req.answer.lower().strip()
    
    is_correct = False
    xp_earned = 0
    
    if correct and user_answer:
        if user_answer == correct:
            is_correct = True
            xp_earned = 10
        elif correct in user_answer or user_answer in correct:
            is_correct = True  # Partial match
            xp_earned = 5
    
    # Update question stats
    db.table("user_questions_realtime").update({
        "times_asked": q_data.get("times_asked", 0) + 1,
        "times_answered_correctly": q_data.get("times_answered_correctly", 0) + (1 if is_correct else 0),
    }).eq("id", req.question_id).execute()
    
    # Award XP
    if xp_earned > 0:
        await award_xp(current_user, xp_earned, "question", "earned",
                       source_id=req.question_id)
    
    # Notify the friend
    answerer = db.table("profiles_realtime").select("display_name").eq("id", current_user).execute()
    answerer_name = answerer.data[0]["display_name"] if answerer.data else "Someone"
    
    await send_notification(
        friend_id, "question_answered",
        data={"question_id": req.question_id, "is_correct": is_correct, "answerer_id": current_user},
        sender=answerer_name
    )
    
    return {
        "is_correct": is_correct,
        "xp_earned": xp_earned,
        "correct_answer": correct if is_correct else None,
        "message": "Correct! 🎉" if is_correct else "Not quite. Try again next time!",
    }


@router.get("/random")
async def get_random_questions(count: int = 5, current_user: str = Depends(get_current_user_id)):
    """Get random questions for new users who haven't set up their own."""
    selected = random.sample(RANDOM_QUESTIONS, min(count, len(RANDOM_QUESTIONS)))
    return {"questions": [{"question_text": q, "category": "personal"} for q in selected]}

@router.post("/generate-ai")
async def generate_ai_question(current_user: str = Depends(get_current_user_id)):
    """Generate a fun, personal question with 4 options using Gemini."""
    settings = get_settings()
    api_key = settings.GEMINI_API_KEY
    
    if not api_key:
        print("[Questions] GEMINI_API_KEY is empty in settings.")
        raise HTTPException(status_code=500, detail="Gemini API Key missing")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    
    prompt = (
        "Role: Expert Fun Question Generator for Veliora.AI.\n"
        "Task: Create a highly engaging, fun, or deeply personal multiple-choice question "
        "designed for best friends or couples to test their bond. The tone should be youthful, "
        "exciting, and geared towards social discovery.\n\n"
        "Constraint: Return ONLY a valid JSON object. No preamble, no markdown code blocks.\n\n"
        "Required Schema:\n"
        "{\n"
        '  "question_text": "string",\n'
        '  "options": ["string", "string", "string", "string"],\n'
        '  "correct_option_index": integer (0-3),\n'
        '  "category": "fun" | "deep" | "random" | "culture"\n'
        "}\n"
    )
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.9, 
            "topP": 0.95,
            "maxOutputTokens": 500,
            "responseMimeType": "application/json"
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json=payload, timeout=15.0)
            if resp.status_code != 200:
                print(f"Gemini API Error {resp.status_code}: {resp.text}")
                # Fallback to secondary key if primary failed
                alt_key = settings.GOOGLE_TRANSLATE_API_KEY
                if alt_key and alt_key != api_key:
                    print("[Questions] Attempting fallback to GOOGLE_TRANSLATE_API_KEY...")
                    alt_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={alt_key}"
                    resp = await client.post(alt_url, json=payload, timeout=15.0)
            
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"Gemini API Error: {resp.text[:100]}")
                
            data = resp.json()
            if "candidates" not in data or not data["candidates"]:
                print("Gemini returned no candidates:", data)
                raise HTTPException(status_code=500, detail="Gemini returned an empty response")
                
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # Robust JSON extraction
            if "{" in raw_text:
                start = raw_text.find("{")
                end = raw_text.rfind("}")
                if start != -1 and end != -1:
                    raw_text = raw_text[start : end + 1]
                
            parsed = json.loads(raw_text)
            return {
                "question_text": parsed.get("question_text", ""),
                "options": parsed.get("options", ["", "", "", ""]),
                "correct_option_index": parsed.get("correct_option_index", 0),
                "category": parsed.get("category", "fun")
            }
            
        except json.JSONDecodeError:
            print("Failed to parse Gemini JSON:", raw_text[:200])
            raise HTTPException(status_code=500, detail="Gemini returned invalid JSON format")
        except Exception as e:
            print(f"Gemini generation error: {type(e).__name__} - {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

