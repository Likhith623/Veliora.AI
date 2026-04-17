with open("api/games.py", "r") as f:
    text = f.read()

# Fix 1: GM Prompt
lines = text.split('\n')
for i, line in enumerate(lines):
    if "Game Description: {game['description']}" in line:
        # Check if the next line is the Current Turn
        if "Current Turn" in lines[i+1]:
            lines.insert(i+1, "        f\"Game Setup / Topic provided by User: {game.get('topic', 'No specific topic')}\\n\"")
            break

text2 = '\n'.join(lines)

# Fix 2: Start game_state
lines = text2.split('\n')
for i, line in enumerate(lines):
    if '"description": game["description"]' in line and '"category"' in lines[i-1]:
        # we're in the start_game dict
        lines.insert(i+1, "        \"topic\": getattr(request, 'topic', 'No specific topic'),")
        break

text3 = '\n'.join(lines)

# Fix 3: Action game_info
lines = text3.split('\n')
for i, line in enumerate(lines):
    if '"category": game_state["category"]' in line and '"description"' in lines[i-1]:
        # we're in the action dict
        lines.insert(i+1, "        \"topic\": game_state.get('topic', 'No specific topic'),")
        break

with open("api/games.py", "w") as f:
    f.write('\n'.join(lines))
print("done")
