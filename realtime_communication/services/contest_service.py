import random
from typing import Dict, Any, List
from datetime import datetime, timedelta
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.xp_service import award_xp

QUESTION_TEMPLATES = [
    {"template": "What is {name}'s favorite food?", "category": "favorite_food"},
    {"template": "What is {name}'s favorite color?", "category": "favorite_color"},
    {"template": "What is {name}'s biggest hobby?", "category": "hobby"},
    {"template": "What was {name}'s childhood fear?", "category": "fear"},
    {"template": "What is {name}'s biggest dream?", "category": "dream"},
    {"template": "Does {name} have any pets? If so, what kind?", "category": "pet"},
    {"template": "What is {name}'s favorite movie or show?", "category": "favorite_movie"},
    {"template": "What kind of music does {name} like most?", "category": "favorite_music"},
    {"template": "What is {name}'s favorite place to visit?", "category": "favorite_place"},
    {"template": "What is {name}'s proudest achievement?", "category": "achievement"},
    {"template": "What cultural tradition is important to {name}?", "category": "cultural_tradition"},
    {"template": "What does {name} usually do on weekends?", "category": "daily_routine"},
]


async def update_user_streak(db, user_id: str, contest_type: str) -> dict:
    """O(1) logic to maintain daily/weekly contest streaks."""
    profile = db.table("profiles_realtime").select("id, current_streak, last_contest_played_at").eq("id", user_id).execute()
    
    if not profile.data:
        return {"current_streak": 0}
        
    p_data = profile.data[0]
    current_streak = p_data.get("current_streak") or 0
    last_played = p_data.get("last_contest_played_at")
    
    now = datetime.utcnow()
    streak_awarded = False
    
    if not last_played:
        current_streak = 1
        streak_awarded = True
    else:
        last_played_date = datetime.fromisoformat(last_played).date()
        days_passed = (now.date() - last_played_date).days
        
        # If daily contest
        if contest_type == "daily":
            if days_passed == 1:
                current_streak += 1
                streak_awarded = True
            elif days_passed > 1:
                current_streak = 1 # Streak wiped
                streak_awarded = True
        
        # If weekly contest
        elif contest_type == "weekly":
            if days_passed <= 7 and days_passed > 0:
                current_streak += 1
                streak_awarded = True
            elif days_passed > 7:
                current_streak = 1
                streak_awarded = True
                
        # If monthly
        elif contest_type == "monthly":
            if days_passed <= 31 and days_passed > 0:
                current_streak += 1
                streak_awarded = True
            elif days_passed > 31:
                current_streak = 1
                streak_awarded = True
                
    if streak_awarded:
        db.table("profiles_realtime").update({
            "current_streak": current_streak,
            "last_contest_played_at": now.isoformat(),
            "updated_at": now.isoformat()
        }).eq("id", user_id).execute()
        
    return {"current_streak": current_streak, "streak_awarded": streak_awarded}


async def generate_contest(relationship_id: str, contest_type: str = "weekly", target_user_id: str = None) -> dict:
    """Generate a bonding contest integrating historical facts or custom user questions."""
    db = get_supabase()
    
    rel = db.table("relationships_realtime").select("*").eq("id", relationship_id).execute()
    if not rel.data:
        return {"error": "Relationship not found"}
    
    rel_data = rel.data[0]
    user_a = db.table("profiles_realtime").select("display_name").eq("id", rel_data["user_a_id"]).execute()
    user_b = db.table("profiles_realtime").select("display_name").eq("id", rel_data["user_b_id"]).execute()
    
    name_a = user_a.data[0]["display_name"] if user_a.data else "Partner A"
    name_b = user_b.data[0]["display_name"] if user_b.data else "Partner B"
    
    num_questions = 5 if contest_type == "custom" else {"daily": 3, "weekly": 5, "monthly": 10}.get(contest_type, 5)
    time_limit = {"daily": 5, "weekly": 10, "monthly": 20, "custom": 10}.get(contest_type, 10)
    
    now = datetime.utcnow()
    title = f"{name_a if target_user_id == rel_data['user_a_id'] else name_b}'s Custom Challenge" if contest_type == "custom" else f"{contest_type.capitalize()} Bond Challenge 💫"
    
    contest = db.table("contests_realtime").insert({
        "relationship_id": relationship_id,
        "contest_type": contest_type,
        "title": title,
        "description": f"Answer {num_questions} questions about each other!",
        "scheduled_at": now.isoformat(),
        "starts_at": now.isoformat(),
        "ends_at": (now + timedelta(minutes=time_limit)).isoformat(),
        "time_limit_minutes": time_limit,
        "status": "active",
        "max_points": num_questions * 10
    }).execute()
    
    if not contest.data:
        return {"error": "Failed to create contest"}
    
    contest_data = contest.data[0]
    questions = []
    
    if contest_type == "custom" and target_user_id:
        custom_qs = db.table("user_custom_questions_realtime").select("*").eq("user_id", target_user_id).execute()
        qs_data = custom_qs.data or []
        random.shuffle(qs_data)
        for i, q in enumerate(qs_data[:5]):
            correct_val = q["options"][q["correct_option_index"]] if q["options"] and len(q["options"]) > q["correct_option_index"] else "IDK"
            cq = db.table("contest_questions_realtime").insert({
                "contest_id": contest_data["id"],
                "question_text": q["question_text"],
                "question_type": "multiple_choice",
                "options": q["options"],
                "question_about_user": target_user_id,
                "correct_answer": correct_val,
                "confidence_score": 1.0,
                "points": 10,
                "question_order": i
            }).execute()
            if cq.data:
                questions.append(cq.data[0])
    else:
        facts_a = db.table("chat_facts_realtime").select("*").eq("user_id", rel_data["user_a_id"]).eq("relationship_id", relationship_id).eq("used_in_contest", False).execute()
        facts_b = db.table("chat_facts_realtime").select("*").eq("user_id", rel_data["user_b_id"]).eq("relationship_id", relationship_id).eq("used_in_contest", False).execute()
        
        used_categories = set()
        all_facts = (facts_a.data or []) + (facts_b.data or [])
        
        random.shuffle(all_facts)
        for fact in all_facts[:num_questions]:
            about_user = fact["user_id"]
            about_name = name_a if about_user == rel_data["user_a_id"] else name_b
            
            template = next((t for t in QUESTION_TEMPLATES if t["category"] == fact["fact_category"]),
                {"template": f"What did {about_name} mention about their {fact['fact_category']}?", "category": fact["fact_category"]}
            )
            
            q = db.table("contest_questions_realtime").insert({
                "contest_id": contest_data["id"],
                "question_text": template["template"].format(name=about_name),
                "question_type": "open",
                "question_about_user": about_user,
                "correct_answer": fact["fact_value"],
                "confidence_score": fact.get("confidence", 0.8),
                "points": 10,
                "question_order": len(questions)
            }).execute()
            
            if q.data:
                questions.append(q.data[0])
                used_categories.add(fact["fact_category"])
                db.table("chat_facts_realtime").update({"used_in_contest": True}).eq("id", fact["id"]).execute()
        
        remaining = num_questions - len(questions)
        if remaining > 0:
            available_templates = [t for t in QUESTION_TEMPLATES if t["category"] not in used_categories]
            random.shuffle(available_templates)
            for template in available_templates[:remaining]:
                about_user = random.choice([rel_data["user_a_id"], rel_data["user_b_id"]])
                about_name = name_a if about_user == rel_data["user_a_id"] else name_b
                
                q = db.table("contest_questions_realtime").insert({
                    "contest_id": contest_data["id"],
                    "question_text": template["template"].format(name=about_name),
                    "question_type": "open",
                    "question_about_user": about_user,
                    "points": 10,
                    "question_order": len(questions)
                }).execute()
                if q.data:
                    questions.append(q.data[0])
                    
    return {"contest": contest_data, "questions": questions, "time_limit_minutes": time_limit}


async def submit_answer(question_id: str, user_id: str, answer: str) -> dict:
    """Submit a contest answer."""
    db = get_supabase()
    
    question = db.table("contest_questions_realtime").select("*").eq("id", question_id).execute()
    if not question.data:
        return {"error": "Question not found"}
    
    q_data = question.data[0]
    contest = db.table("contests_realtime").select("*").eq("id", q_data["contest_id"]).execute()
    if not contest.data:
        return {"error": "Contest not found"}
        
    rel_data = db.table("relationships_realtime").select("*").eq("id", contest.data[0]["relationship_id"]).execute().data[0]
    
    is_user_a = user_id == rel_data["user_a_id"]
    ans_field, time_field, pts_field = ("user_a_answer", "user_a_answered_at", "user_a_points") if is_user_a else ("user_b_answer", "user_b_answered_at", "user_b_points")
    
    correct = (q_data.get("correct_answer") or "").lower().strip()
    user_answer = answer.lower().strip()
    
    points = 0
    if correct and user_answer:
        if user_answer == correct:
            points = q_data["points"]
        elif correct in user_answer or user_answer in correct:
            points = q_data["points"] // 2
            
    db.table("contest_questions_realtime").update({
        ans_field: answer,
        time_field: datetime.utcnow().isoformat(),
        pts_field: points
    }).eq("id", question_id).execute()
    
    return {"points_awarded": points, "is_correct": points == q_data["points"], "correct_answer": correct}


async def finish_contest(contest_id: str, user_id: str) -> dict:
    """Evaluate completion, handle streaks, and upsert leaderboards."""
    db = get_supabase()
    contest = db.table("contests_realtime").select("*").eq("id", contest_id).execute()
    
    if not contest.data:
        return {"error": "Contest not found"}
        
    c_data = contest.data[0]
    questions = db.table("contest_questions_realtime").select("user_a_points, user_b_points").eq("contest_id", contest_id).execute()
    
    a_total = sum(q.get("user_a_points") or 0 for q in questions.data or [])
    b_total = sum(q.get("user_b_points") or 0 for q in questions.data or [])
    
    db.table("contests_realtime").update({
        "status": "completed",
        "user_a_score": a_total,
        "user_b_score": b_total,
        "completed_at": datetime.utcnow().isoformat()
    }).eq("id", contest_id).execute()
    
    # Process Streaks
    rel = db.table("relationships_realtime").select("*").eq("id", c_data["relationship_id"]).execute().data[0]
    is_user_a = user_id == rel["user_a_id"]
    
    streak_data = await update_user_streak(db, user_id, c_data["contest_type"])
    
    # Award XP 
    user_score = a_total if is_user_a else b_total
    awarded = await award_xp(user_id, amount=user_score, source_type="contest", interaction_type="earned", source_id=contest_id)
    
    # Upsert to leaderboard_realtime
    from routers.contests import _update_leaderboard # Will implement in router
    await _update_leaderboard(db, user_id, c_data["contest_type"], user_score)
    
    return {
        "status": "completed",
        "user_a_score": a_total,
        "user_b_score": b_total,
        "streak_data": streak_data,
        "xp_awarded": awarded.get("amount") if awarded else 0
    }
