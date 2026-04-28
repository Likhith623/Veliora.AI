import sys

file_path = "realtime_communication/routers/friends.py"
with open(file_path, "r") as f:
    content = f.read()

import re

# Match the if visibility == "public" block to the end of the else block.
pattern = r"""    if visibility == "public":.*?return \{.*?\}
    else:
(.*?)        return \{.*?\}"""

replacement = r"""\1        return {
            "status": "pending",
            "message": f"Friend request sent to {target.data[0]['display_name']}!",
            "request": fr.data[0] if fr.data else None,
        }"""

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(file_path, "w") as f:
    f.write(new_content)

print("Updated friends.py")
