import glob
import re

tables = [
    "profiles", "privacy_settings", "user_languages", "friend_requests",
    "relationships", "relationship_milestones", "realtime_xp",
    "xp_transactions", "verification_records", "family_rooms", "polls",
    "poll_votes", "messages", "chat_facts", "user_questions",
    "matching_queue", "contests", "contest_questions", "games",
    "game_sessions", "family_room_members", "family_room_messages",
    "family_room_join_codes", "cultural_potlucks", "notifications",
    "achievements", "user_achievements", "reports", "moderation_queue",
    "exit_surveys", "time_capsules", "gratitude_entries"
]

def replace_selects(match):
    content = match.group(0)
    for table in tables:
        suffix = "realtime_communication" if table == "games" else ("realtime_comunicatio_realtime" if table == "messages" else f"{table}_realtime")
        
        # Replace table(
        content = re.sub(rf'\b{table}\(', f'{suffix}(', content)
        # Replace :table(
        content = re.sub(rf':{table}\(', f':{suffix}(', content)
    return content

files = glob.glob('realtime_communication/**/*.py', recursive=True)
for file in files:
    with open(file, 'r') as f:
        text = f.read()
    
    new_text = re.sub(r'\.select\([^\)]+\)', replace_selects, text)
    if new_text != text:
        with open(file, 'w') as f:
            f.write(new_text)
        print(f"Fixed selects in {file}")

