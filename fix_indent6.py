with open("realtime_communication/routers/friends.py", "r") as f:
    text = f.read()

text = text.replace('        \\"message\\": f"You are now friends with the sender!",', '        "message": f"You are now friends with the sender!",')
text = text.replace('        }!', '        }')

with open("realtime_communication/routers/friends.py", "w") as f:
    f.write(text)
