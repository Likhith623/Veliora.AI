#!/bin/bash
BASE_URL="http://localhost:8000"
EMAIL="kingjames.08623@gmail.com"
PASSWORD="Likhith@123"
BOT_ID="delhi_mentor_female"

echo "========================================"
echo "1. Logging in..."
LOGIN_RES=$(curl -s -X POST "$BASE_URL/api/auth/login" \
     -H "Content-Type: application/json" \
     -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

# Extract token using basic grep/cut to avoid jq dependency issues
TOKEN=$(echo "$LOGIN_RES" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Login failed! Response: $LOGIN_RES"
    exit 1
fi
echo "Login successful."

echo ""
echo "========================================"
echo "2. Sending 5 texts to bot..."
for i in {1..5}; do
    MSG="This is test message number $i. Please remember the number $i."
    echo " -> Sending: $MSG"
    curl -s -X POST "$BASE_URL/api/chat/send" \
         -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -d "{\"bot_id\": \"$BOT_ID\", \"message\": \"$MSG\", \"language\": \"english\"}" | grep -o '"reply":"[^"]*'
    echo ""
done

echo ""
echo "========================================"
echo "3. Ending chat..."
curl -s -X POST "$BASE_URL/api/chat/end-chat" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\"}"
echo -e "\nEnd chat triggered."

echo ""
echo "========================================"
echo "4. Starting new chat and checking context..."
MSG="What were the 5 numbers I just asked you to remember?"
echo " -> Sending: $MSG"
curl -s -X POST "$BASE_URL/api/chat/send" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\", \"message\": \"$MSG\", \"language\": \"english\"}" | grep -o '"reply":"[^"]*'
echo ""

echo ""
echo "========================================"
echo "5. Ending chat again..."
curl -s -X POST "$BASE_URL/api/chat/end-chat" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\"}"
echo -e "\nEnd chat triggered. (Check supabase manually for redis logic)."

echo ""
echo "========================================"
echo "6. Starting chat to load data into redis..."
MSG="Hello again! Let's play some games."
echo " -> Sending: $MSG"
curl -s -X POST "$BASE_URL/api/chat/send" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\", \"message\": \"$MSG\", \"language\": \"english\"}" | grep -o '"reply":"[^"]*'
echo ""

echo ""
echo "========================================"
echo "7. Games: mentor_culture_trivia"
START_RES=$(curl -s -X POST "$BASE_URL/api/games/start" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\", \"game_id\": \"mentor_culture_trivia\"}")

S_ID=$(echo "$START_RES" | grep -o '"session_id":"[^"]*' | cut -d'"' -f4)
echo " -> Game Started. Session ID: $S_ID"
echo " -> Intro: $(echo "$START_RES" | grep -o '"bot_intro":"[^"]*' | cut -d'"' -f4)"

echo " -> Sending Action..."
curl -s -X POST "$BASE_URL/api/games/action" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\", \"session_id\": \"$S_ID\", \"action\": \"I will guess the first option for culture trivia.\"}" | grep -o '"reply":"[^"]*'
echo ""

echo " -> Ending Game..."
curl -s -X POST "$BASE_URL/api/games/end" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\", \"session_id\": \"$S_ID\"}"
echo ""

echo ""
echo "========================================"
echo "8. Games: mentor_life_simulator"
START_RES2=$(curl -s -X POST "$BASE_URL/api/games/start" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\", \"game_id\": \"mentor_life_simulator\"}")

S_ID2=$(echo "$START_RES2" | grep -o '"session_id":"[^"]*' | cut -d'"' -f4)
echo " -> Game Started. Session ID: $S_ID2"

echo " -> Sending Action..."
curl -s -X POST "$BASE_URL/api/games/action" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\", \"session_id\": \"$S_ID2\", \"action\": \"I want to invest in a business in the life simulator.\"}" | grep -o '"reply":"[^"]*'
echo ""

echo " -> Ending Game..."
curl -s -X POST "$BASE_URL/api/games/end" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\", \"session_id\": \"$S_ID2\"}"
echo ""

echo ""
echo "========================================"
echo "9. Voice Endpoint..."
V_MSG="Send me a short voice note about what you think about my business investment."
echo " -> Sending Voice Note request..."
curl -s -X POST "$BASE_URL/api/voice/note" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\", \"message\": \"$V_MSG\", \"language\": \"english\"}" | grep -o '"text_reply":"[^"]*'
echo ""

echo ""
echo "========================================"
echo "10. Chat Endpoint to check context..."
MSG="What games did we just play? And what did I do in the life simulator?"
echo " -> Sending: $MSG"
curl -s -X POST "$BASE_URL/api/chat/send" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\", \"message\": \"$MSG\", \"language\": \"english\"}" | grep -o '"reply":"[^"]*'
echo ""

echo ""
echo "========================================"
echo "11. Selfie Generation..."
echo " -> Requesting Selfie..."
curl -s -X POST "$BASE_URL/api/selfie/generate" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\", \"include_user\": false}" | grep -o '"image_url":"[^"]*'
echo ""

echo ""
echo "========================================"
echo "12. Multimodal Summarize URL..."
echo " -> Sending URL..."
curl -s -X POST "$BASE_URL/api/multimodal/summarize-url" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"url\": \"https://en.wikipedia.org/wiki/Artificial_intelligence\", \"bot_id\": \"$BOT_ID\", \"language\": \"english\"}" | grep -o '"summary":"[^"]*'
echo ""

echo ""
echo "========================================"
echo "13. Multimodal Weather..."
echo " -> Getting Weather..."
curl -s -X GET "$BASE_URL/api/multimodal/weather/$BOT_ID" \
     -H "Authorization: Bearer $TOKEN" | grep -o '"weather_info":"[^"]*'
echo ""

echo ""
echo "========================================"
echo "14. Final End Chat..."
curl -s -X POST "$BASE_URL/api/chat/end-chat" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot_id\": \"$BOT_ID\"}"
echo -e "\nFinal End chat triggered. Review Supabase for successful delta write-through."

