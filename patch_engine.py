with open("services/llm_engine.py", "r") as f:
    text = f.read()
text = text.replace('logger.error(f"Dashboard insights generation failed: {e}")', 'logger.error(f"Dashboard insights generation failed: {e}")\n        logger.error(f"Raw text was: {raw_text if \'raw_text\' in locals() else \'None\'}")')
with open("services/llm_engine.py", "w") as f:
    f.write(text)
