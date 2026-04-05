#!/bin/bash
BASE_URL="http://localhost:8000"
EMAIL="kingjames.08623@gmail.com"
PASSWORD="Likhith@123"

# ... Login block ...
LOGIN_RES=$(curl -s -X POST "$BASE_URL/api/auth/login" \
     -H "Content-Type: application/json" \
     -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RES" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "TOKEN: ${TOKEN:0:15}..."

echo "========================================"
echo "2. Setting User Role (Realtime)"
curl -s -X POST "$BASE_URL/api/v1/profiles/me/role" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"offering_role\": \"mentor\"}"

echo -e "\n========================================"
echo "3. Getting My Profile (Realtime)"
curl -s -X GET "$BASE_URL/api/v1/profiles/me" \
     -H "Authorization: Bearer $TOKEN" | head -c 500

echo -e "\n\n========================================"
echo "4. Testing Privacy Settings"
curl -s -X GET "$BASE_URL/api/v1/privacy/settings" \
     -H "Authorization: Bearer $TOKEN" | head -c 200

echo -e "\n\n========================================"
echo "5. Testing Realtime Matching Queue"
curl -s -X GET "$BASE_URL/api/v1/matching/browse-all" \
     -H "Authorization: Bearer $TOKEN"

echo -e "\n\n========================================"
echo "6. Testing Questions/Icebreakers"
curl -s -X GET "$BASE_URL/api/v1/questions/random" \
     -H "Authorization: Bearer $TOKEN"

echo -e "\n\n========================================"
echo "7. Testing Contests"
curl -s -X GET "$BASE_URL/api/v1/contests/schedule/configuration" \
     -H "Authorization: Bearer $TOKEN"

