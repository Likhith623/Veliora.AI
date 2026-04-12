import re

prompt_file = ".github/prompts/plan-chatHistoryAndMediaOverhaul.prompt.md"
dest_file = "persona_frontend_main/chatbot-new-frontend/src/components/PlayAudio.jsx"

with open(prompt_file, "r") as f:
    content = f.read()

# extract the code block for PlayAudio.jsx
# it starts at `// PlayAudio.jsx` and ends at the end of the file.
start_idx = content.find("// PlayAudio.jsx")
code = content[start_idx:]

with open(dest_file, "w") as f:
    f.write(code)

