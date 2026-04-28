with open("realtime_communication/routers/friends.py", "r") as f:
    text = f.read()

text = text.replace('        if rel["status"] == "active":\n        return {"status": "already_friends"', '        if rel["status"] == "active":\n            return {"status": "already_friends"')

with open("realtime_communication/routers/friends.py", "w") as f:
    f.write(text)
