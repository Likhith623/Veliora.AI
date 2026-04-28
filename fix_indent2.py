with open("realtime_communication/routers/friends.py", "r") as f:
    text = f.read()
import re
text = re.sub(r'        # PRIVATE: create pending request\n', r'    # PRIVATE: create pending request\n', text)
text = re.sub(r'        fr = db.table', r'    fr = db.table', text)
text = re.sub(r'            \"sender_id\":', r'        \"sender_id\":', text)
text = re.sub(r'            \"receiver_id\":', r'        \"receiver_id\":', text)
text = re.sub(r'            \"status\": \"pending\",', r'        \"status\": \"pending\",', text)
text = re.sub(r'            \"message\":', r'        \"message\":', text)
text = re.sub(r'        \}\)\.execute\(\)', r'    }).execute()', text)
text = re.sub(r'        await send_notification\(', r'    await send_notification(', text)
text = re.sub(r'            target_id, \"friend_request_received\",', r'        target_id, \"friend_request_received\",', text)
text = re.sub(r'            data=\{\"request_id\": fr\.data', r'        data={\"request_id\": fr.data', text)
text = re.sub(r'            sender=sender_name\n        \)', r'        sender=sender_name\n    )', text)
text = re.sub(r'        return \{\n            \"status\": \"pending\",\n            \"message\": f\"Friend request sent to \{target\.data\[0\]\[\'display_name\'\]\}\!\",\n            \"request\": fr\.data\[0\] if fr\.data else None,\n        \}', r'    return {\n        \"status\": \"pending\",\n        \"message\": f\"Friend request sent to {target.data[0][\'display_name\']}!\",\n        \"request\": fr.data[0] if fr.data else None,\n    }', text)
with open("realtime_communication/routers/friends.py", "w") as f:
    f.write(text)
