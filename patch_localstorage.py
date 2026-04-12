import re

file_path = "temp_page.js"
with open(file_path, "r") as f:
    content = f.read()

# Replace the save-to-localStorage useEffect block.
# Since it contains `.setItem(\`chat_\${selectedBotId}\``
old_save_effect = r"""  // Save the messages to localStorage when they change
  useEffect\(\(\) => \{
    if \(messages\.length > 0\) \{
      localStorage\.setItem\(
        `chat_\$\{selectedBotId\}`.*?\}\, \[messages, selectedBotId\]\);"""

replaced = re.sub(old_save_effect, "// localStorage removed", content, flags=re.DOTALL)

with open(file_path, "w") as f:
    f.write(replaced)

