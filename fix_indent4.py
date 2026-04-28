with open("realtime_communication/routers/friends.py", "r") as f:
    text = f.read()

text = text.replace('        \\"status\\": \\"pending\\",', '        "status": "pending",')
text = text.replace('        \\"message\\": f\\"Friend request sent to {target.data[0][\\\'display_name\\\']}!\\",', '        "message": f"Friend request sent to {target.data[0][\'display_name\']}!",')
text = text.replace('        \\"request\\": fr.data[0] if fr.data else None,', '        "request": fr.data[0] if fr.data else None,')

with open("realtime_communication/routers/friends.py", "w") as f:
    f.write(text)
