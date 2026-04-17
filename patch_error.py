import re

with open("services/llm_engine.py", "r") as f:
    text = f.read()

text = text.replace(
    'return fallback',
    'fallback["narrative"] = f"LLM Error: {e.__class__.__name__} - {str(e)}"; return fallback'
)

# Fix the first 'return fallback' inside try block to not crash if 'e' is not defined
text = text.replace(
    'fallback["narrative"] = f"LLM Error: {e.__class__.__name__} - {str(e)}"; return fallback\n\n    except Exception as e:',
    'fallback["narrative"] = f"JSON Validation Error: Missing required JSON keys (narrative, prediction, suggestions) from Gemini output. Raw: {raw_text}"; return fallback\n\n    except Exception as e:'
)

with open("services/llm_engine.py", "w") as f:
    f.write(text)
