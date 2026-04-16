# speech_emotion.py
"""
Veliora.AI — Speech Emotion Recognition (HuBERT SUPERB-ER)

Model: superb/hubert-base-superb-er
Labels: 4 SUPERB emotion categories → ang, hap, neu, sad
        (Some checkpoint versions use: angry, happy, neutral, sad)
Output: {"label": str, "score": float}

The label is lowercased and passed directly to fusion.py's HUBERT_VALENCE map,
which handles both short (ang/hap/neu/sad) and long (angry/happy/neutral/sad)
forms to be robust against checkpoint version differences.

Thread safety:
- Model loaded once at startup via preload_speech_model()
- Inference is stateless (torch.no_grad + eval mode)
- Safe for concurrent ThreadPoolExecutor calls
- _lock protects lazy-init only; double-checked pattern is safe in CPython
  because the GIL prevents _model assignment tearing
"""

import numpy as np
import torch
import logging
import threading
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

logger = logging.getLogger(__name__)

_extractor = None
_model     = None
_lock      = threading.Lock()

# Minimum audio duration for reliable prosody analysis
MIN_AUDIO_SAMPLES = int(16000 * 0.5)   # 0.5 seconds at 16kHz

MODEL_ID = "superb/hubert-base-superb-er"


def preload_speech_model() -> None:
    """
    Load HuBERT SUPERB-ER model and feature extractor into memory.
    Call at server startup. Thread-safe double-checked locking.

    FIX: Both _extractor and _model are checked inside the lock before
    assignment to prevent partial-init races where _model is set but
    _extractor is not yet ready.
    """
    global _extractor, _model
    if _model is not None and _extractor is not None:
        return  # Fast path: already loaded, no lock needed
    with _lock:
        # Re-check inside lock (classic double-checked locking)
        if _model is not None and _extractor is not None:
            return
        try:
            ext = AutoFeatureExtractor.from_pretrained(MODEL_ID)
            mdl = AutoModelForAudioClassification.from_pretrained(MODEL_ID)
            mdl.eval()
            # Assign extractor first so that the outer fast-path check on _model
            # cannot succeed while _extractor is still None
            _extractor = ext
            _model     = mdl
            logger.info("HuBERT SUPERB-ER preloaded successfully.")
        except Exception as e:
            logger.error(f"Failed to preload HuBERT SUPERB-ER: {e}")
            raise


def get_speech_emotion(pcm_array: np.ndarray) -> dict:
    """
    Run speech emotion inference on a float32 PCM array at 16kHz.

    Args:
        pcm_array: 1D numpy float32 array, 16kHz mono.
                   The emotion_worker passes a 4-second rolling window.

    Returns:
        {"label": str, "score": float}
        e.g. {"label": "sad", "score": 0.731}

    Fallback:
        Returns {"label": "neutral", "score": 0.0} on error or insufficient audio,
        so the fusion confidence-weighting system can gracefully downweight this signal.
    """
    global _extractor, _model
    if _model is None or _extractor is None:
        preload_speech_model()

    # Guard: insufficient audio yields unreliable prosody
    if pcm_array is None or pcm_array.size < MIN_AUDIO_SAMPLES:
        return {"label": "neutral", "score": 0.0}

    try:
        inputs = _extractor(
            pcm_array,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True,
        )

        with torch.no_grad():
            logits = _model(**inputs).logits

        predicted_id = torch.argmax(logits, dim=-1).item()
        label        = _model.config.id2label[predicted_id]

        scores = torch.nn.functional.softmax(logits, dim=-1)
        score  = scores[0, predicted_id].item()

        all_speech_emotions = {
            _model.config.id2label[i].lower(): round(s.item() * 100, 2)
            for i, s in enumerate(scores[0])
        }

        return {
            "label": label.lower(),   # Normalize: HUBERT_VALENCE map handles both forms
            "score": round(score, 3),
            "all_emotions": all_speech_emotions
        }
    except Exception as e:
        logger.error(f"Speech emotion inference error: {e}")
        return {"label": "neutral", "score": 0.0}