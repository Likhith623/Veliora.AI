with open("persona_frontend_main/chatbot-new-frontend/src/app/chat/page.js", "r") as f:
    text = f.read()

# Fix 1: GameStartResponse mapping
old_start = """      const activityMessage = {
        text: data.response,
        sender: "bot","""

new_start = """      const activityMessage = {
        text: data.opening_message || data.bot_response || data.response,
        sender: "bot","""

text = text.replace(old_start, new_start)

# Fix 2: GameActionResponse mapping
old_action = """      const botResponse = {
        text: data.response || "...",
        sender: "bot","""

new_action = """      const botResponse = {
        text: data.bot_response || data.response || "...",
        sender: "bot","""

text = text.replace(old_action, new_action)

with open("persona_frontend_main/chatbot-new-frontend/src/app/chat/page.js", "w") as f:
    f.write(text)

