# text_emotion.py
"""
Veliora.AI — Text Emotion Analysis (RoBERTa GoEmotions)

Model: SamLowe/roberta-base-go_emotions
Labels: 28 GoEmotions categories (see fusion.py for full valence mapping)
Output: {"label": str, "score": float}

Thread safety:
- Models are loaded once at startup via preload_text_model()
- All inference is stateless (torch.no_grad + eval mode)
- Safe to call from multiple ThreadPoolExecutor threads concurrently
- _lock protects the lazy-init path only, not inference itself
"""

import torch
import logging
import threading
from transformers import AutoTokenizer, AutoModelForSequenceClassification

logger = logging.getLogger(__name__)

# Module-level model cache — loaded once, reused across all requests
_tokenizer = None
_model     = None
_lock      = threading.Lock()


def preload_text_model() -> None:
    """
    Load RoBERTa GoEmotions model and tokenizer into memory.
    Call at server startup to eliminate first-call latency.
    Thread-safe: uses a double-checked lock.
    """
    global _tokenizer, _model
    with _lock:
        if _model is not None:
            return
        try:
            model_id   = "SamLowe/roberta-base-go_emotions"
            _tokenizer = AutoTokenizer.from_pretrained(model_id)
            _model     = AutoModelForSequenceClassification.from_pretrained(model_id)
            _model.eval()   # Disable dropout and training-only layers
            logger.info("✅ RoBERTa GoEmotions preloaded successfully.")
        except Exception as e:
            logger.error(f"Failed to preload RoBERTa GoEmotions: {e}")
            raise


def get_text_emotion(text: str) -> dict:
    """
    Run inference on a text string and return the dominant emotion.

    Args:
        text: Raw user message string (up to 512 tokens; truncated if longer)

    Returns:
        {"label": str, "score": float}
        e.g. {"label": "sadness", "score": 0.842}

    Fallback:
        Returns {"label": "neutral", "score": 0.0} on any error, ensuring
        the fusion pipeline always receives a valid input.
    """
    global _tokenizer, _model
    if _model is None or _tokenizer is None:
        preload_text_model()

    if not text or not text.strip():
        return {"label": "neutral", "score": 0.0}

    try:
        inputs = _tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=False,
        )

        with torch.no_grad():
            logits = _model(**inputs).logits

        predicted_id = torch.argmax(logits, dim=-1).item()
        label        = _model.config.id2label[predicted_id]

        scores = torch.nn.functional.softmax(logits, dim=-1)
        score  = scores[0, predicted_id].item()

        return {
            "label": label.lower(),   # Normalize to lowercase for fusion map lookup
            "score": round(score, 3),
        }
    except Exception as e:
        logger.error(f"Text emotion inference error: {e}")
        return {"label": "neutral", "score": 0.0}