import os
import glob
import re

table_map = {
    "profiles": "profiles_realtime",
    "privacy_settings": "privacy_settings_realtime",
    "user_languages": "user_languages_realtime",
    "friend_requests": "friend_requests_realtime",
    "relationships": "relationships_realtime",
    "relationship_milestones": "relationship_milestones_realtime",
    "realtime_xp": "realtime_xp_realtime",
    "xp_transactions": "xp_transactions_realtime",
    "verification_records": "verification_records_realtime",
    "family_rooms": "family_rooms_realtime",
    "polls": "polls_realtime",
    "poll_votes": "poll_votes_realtime",
    "messages": "messages_realtime_comunicatio_realtime",
    "chat_facts": "chat_facts_realtime",
    "user_questions": "user_questions_realtime",
    "matching_queue": "matching_queue_realtime",
    "contests": "contests_realtime",
    "contest_questions": "contest_questions_realtime",
    "games": "games_realtime_communication",
    "game_sessions": "game_sessions_realtime",
    "family_room_members": "family_room_members_realtime",
    "family_room_messages": "family_room_messages_realtime",
    "family_room_join_codes": "family_room_join_codes_realtime",
    "cultural_potlucks": "cultural_potlucks_realtime",
    "notifications": "notifications_realtime",
    "achievements": "achievements_realtime",
    "user_achievements": "user_achievements_realtime",
    "reports": "reports_realtime",
    "moderation_queue": "moderation_queue_realtime",
    "exit_surveys": "exit_surveys_realtime",
    "time_capsules": "time_capsules_realtime",
    "gratitude_entries": "gratitude_entries_realtime"
}

python_files = glob.glob('realtime_communication/**/*.py', recursive=True)

for file in python_files:
    with open(file, 'r') as f:
        content = f.read()

    new_content = content
    for old, new in table_map.items():
        pattern = r'\.table\("' + old + r'"\)'
        new_content = re.sub(pattern, f'.table("{new}")', new_content)
        pattern2 = r"\.table\('" + old + r"'\)"
        new_content = re.sub(pattern2, f".table('{new}')", new_content)

    if new_content != content:
        with open(file, 'w') as f:
            f.write(new_content)
        print(f"Updated {file}")
