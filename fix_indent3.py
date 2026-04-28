with open("realtime_communication/routers/friends.py", "r") as f:
    text = f.read()
import re
text = re.sub(r'    return \{\n        \"status\": \"pending\",\n        \"message\": f\"Friend request sent to \{target\.data\[0\]\[\'display_name\'\]\}\!\",\n        \"request\": fr\.data\[0\] if fr\.data else None,\n        \}\!\",\n        \"request\": fr\.data\[0\] if fr\.data else None,\n        \}', r'    return {\n        \"status\": \"pending\",\n        \"message\": f\"Friend request sent to {target.data[0][\'display_name\']}!\",\n        \"request\": fr.data[0] if fr.data else None,\n    }', text)
with open("realtime_communication/routers/friends.py", "w") as f:
    f.write(text)
