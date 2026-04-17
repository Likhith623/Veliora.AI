import re

with open("services/emotion_worker.py", "r") as f:
    code = f.read()

target = """                    if stored and stored.get("text_raw"):
                        text_res = {
                            "label": stored["text_raw"],
                            "score": stored.get("text_score", 0.0),
                        }"""

replacement = """                    if stored and stored.get("text_raw"):
                        text_res = {
                            "label": stored["text_raw"],
                            "score": stored.get("text_score", 0.0),
                            "all_emotions": stored.get("all_emotions", {})
                        }"""

if target in code:
    code = code.replace(target, replacement)
    with open("services/emotion_worker.py", "w") as f:
        f.write(code)
    print("SUCCESS")
else:
    print("FAILED")
