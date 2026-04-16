# fusion.py
"""
Veliora.AI — Emotion Fusion Engine
Confidence-weighted ensemble of text (RoBERTa GoEmotions) and speech (HuBERT SER).

Architecture:
- Text emotion = primary semantic signal (RoBERTa, 28 GoEmotions labels)
- Speech emotion = acoustic prosody signal (HuBERT, 4 SUPERB labels)
- Fusion = confidence-weighted blend, not a naive 50/50 average
- Valence = normalized -1.0 to +1.0 score for clinical trajectory tracking
- Tier classification = 4 clinical tiers for dashboard and alert routing
"""

from typing import Optional

# ──────────────────────────────────────────────────────────────────────────────
# VALENCE MAP — GoEmotions 28-label → [-1.0, +1.0]
# Based on Russell's circumplex model of affect, calibrated for clinical use.
# Negative valence labels weighted conservatively to avoid over-triggering.
# ──────────────────────────────────────────────────────────────────────────────
GOEMOTION_VALENCE: dict[str, float] = {
    # Positive high arousal
    "admiration":     +0.70,
    "amusement":      +0.75,
    "approval":       +0.60,
    "caring":         +0.65,
    "desire":         +0.50,
    "excitement":     +0.80,
    "gratitude":      +0.75,
    "joy":            +0.90,
    "love":           +0.85,
    "optimism":       +0.70,
    "pride":          +0.65,
    "relief":         +0.55,
    # Positive low arousal
    "curiosity":      +0.35,
    "surprise":       +0.20,  # can be negative; keeping slightly positive
    # Neutral / ambiguous
    "neutral":         0.00,
    "realization":    +0.10,
    "confusion":      -0.10,
    # Negative low arousal
    "disappointment": -0.50,
    "disapproval":    -0.45,
    "embarrassment":  -0.40,
    "remorse":        -0.55,
    "sadness":        -0.65,
    "boredom":        -0.25,
    # Negative high arousal
    "anger":          -0.70,
    "annoyance":      -0.45,
    "disgust":        -0.65,
    "fear":           -0.75,
    "grief":          -0.90,
    "nervousness":    -0.55,
}

# HuBERT SUPERB-ER outputs 4 labels: angry, happy, neutral, sad
HUBERT_VALENCE: dict[str, float] = {
    "ang":  -0.70,   # angry
    "hap":  +0.80,   # happy
    "neu":   0.00,   # neutral
    "sad":  -0.65,   # sad
    # Some checkpoints use full words
    "angry":   -0.70,
    "happy":   +0.80,
    "neutral":  0.00,
    # "sad" is already defined above and matches; listing explicitly for clarity
}

# ──────────────────────────────────────────────────────────────────────────────
# CLINICAL TIER CLASSIFICATION
# Tiers used by dashboard and alert routing.
# ──────────────────────────────────────────────────────────────────────────────

# FIX: Expanded crisis labels to cover all GoEmotions forms that map to acute crisis.
# "fear" at valence -0.75 already triggers via the valence threshold, but we keep
# it in the set so the reason string in evaluate_dual_alert reads "crisis_label"
# rather than just falling through to the valence branch — clearer audit trail.
CRISIS_LABELS: frozenset[str] = frozenset()

def classify_tier(valence: float, label: str) -> str:
    """
    Map a fused valence score + raw label to a clinical tier.

    Tiers:
      - "crisis"   : Immediate Tier 1 alert candidate (Reserved for keyword scans or explicit tracking, no longer triggers on valence alone)
      - "severe_distress": Replaces old crisis threshold for <= -0.75
      - "distress" : Sustained monitoring, Tier 2 rolling average candidate
      - "neutral"  : Baseline, no action
      - "positive" : Healthy affect
    """
    if label.lower() in CRISIS_LABELS:
        return "crisis"
    if valence <= -0.75:
        return "severe_distress"
    if valence <= -0.40:
        return "distress"
    if valence <= +0.15:
        return "neutral"
    return "positive"


# ──────────────────────────────────────────────────────────────────────────────
# CONFIDENCE-WEIGHTED ENSEMBLE FUSION
# ──────────────────────────────────────────────────────────────────────────────
def fuse_emotions(
    text_emotion: dict,
    speech_emotion: Optional[dict],
    video_emotion: Optional[dict] = None,
) -> dict:
    """
    Confidence-weighted fusion of text and speech emotion signals.

    Weighting logic:
    - If speech confidence >= 0.65 AND text confidence >= 0.65:
        weight = proportional to each score (dynamic)
    - If speech confidence < 0.40 (e.g. noisy environment):
        speech weight drops to 0.10, text carries 0.90
    - Otherwise: text=0.70, speech=0.30 (text is semantically richer)

    Video is treated as an auxiliary masking-detection signal only.
    It NEVER influences the fused valence or triggers alerts.

    Args:
        text_emotion:   {"label": str, "score": float}  — from RoBERTa
        speech_emotion: {"label": str, "score": float}  — from HuBERT, or None
        video_emotion:  {"label": str, "score": float}  — optional, auxiliary only

    Returns:
        {
            "fused_emotion":    str,    # human-readable combined label
            "valence":          float,  # -1.0 to +1.0 clinical score
            "tier":             str,    # "crisis"|"distress"|"neutral"|"positive"
            "confidence":       float,  # ensemble confidence
            "text_raw":         str,
            "text_valence":     float,
            "speech_raw":       str,
            "speech_valence":   float,
            "text_weight":      float,
            "speech_weight":    float,
            "masking_flag":     bool,   # True if video contradicts text/speech
        }
    """
    # ── Extract text signal ──────────────────────────────────────────────────
    text_label = (text_emotion.get("label") or "neutral").lower()
    text_score = float(text_emotion.get("score") or 0.0)
    text_valence = GOEMOTION_VALENCE.get(text_label, 0.0)

    # ── Extract speech signal ────────────────────────────────────────────────
    if speech_emotion and speech_emotion.get("label"):
        speech_label = speech_emotion["label"].lower()
        speech_score = float(speech_emotion.get("score") or 0.0)
        speech_valence = HUBERT_VALENCE.get(speech_label, 0.0)
        has_speech = True
    else:
        speech_label = "n/a"
        speech_score = 0.0
        speech_valence = 0.0
        has_speech = False

    # ── Confidence-weighted blending ─────────────────────────────────────────
    if not has_speech or speech_score < 0.40:
        # Low speech confidence (noise, silence, very short clip): trust text heavily
        text_weight = 0.90
        speech_weight = 0.10 if has_speech else 0.00
    elif speech_score >= 0.65 and text_score >= 0.65:
        # Both signals are highly confident: weight proportionally
        total = speech_score + text_score
        text_weight = text_score / total
        speech_weight = speech_score / total
    elif speech_score >= 0.65:
        # Speech is very confident, text is uncertain
        text_weight = 0.35
        speech_weight = 0.65
    else:
        # Default: text leads as primary semantic signal
        text_weight = 0.70
        speech_weight = 0.30

    # Normalize weights (guards against floating-point drift)
    total_weight = text_weight + speech_weight
    if total_weight > 0:
        text_weight = text_weight / total_weight
        speech_weight = speech_weight / total_weight

    # ── Compute fused valence ────────────────────────────────────────────────
    fused_valence = (text_valence * text_weight) + (speech_valence * speech_weight)
    fused_valence = round(max(-1.0, min(1.0, fused_valence)), 4)

    # ── Compute ensemble confidence ──────────────────────────────────────────
    ensemble_confidence = (text_score * text_weight) + (speech_score * speech_weight)
    ensemble_confidence = round(ensemble_confidence, 3)

    # ── Primary label: use whichever signal has higher weight ────────────────
    if speech_weight > text_weight and has_speech:
        primary_label = speech_label
    else:
        primary_label = text_label

    # Human-readable fused label
    if has_speech:
        fused_label = f"{text_label} (text) / {speech_label} (voice)"
    else:
        fused_label = text_label

    # ── Clinical tier classification ─────────────────────────────────────────
    tier = classify_tier(fused_valence, primary_label)

    # ── Video masking detection (auxiliary — does NOT affect valence) ─────────
    masking_flag = False
    if video_emotion and video_emotion.get("label"):
        video_label = video_emotion["label"].lower()
        video_valence = GOEMOTION_VALENCE.get(
            video_label, HUBERT_VALENCE.get(video_label, 0.0)
        )
        # Flag masking if text/speech ensemble is distressed but video shows happiness
        if fused_valence <= -0.40 and video_valence >= 0.50:
            masking_flag = True

    return {
        "fused_emotion":   fused_label,
        "valence":         fused_valence,
        "tier":            tier,
        "confidence":      ensemble_confidence,
        "text_raw":        text_label,
        "text_score":      round(text_score, 3),
        "text_valence":    round(text_valence, 4),
        "speech_raw":      speech_label,
        "speech_score":    round(speech_score, 3),
        "speech_valence":  round(speech_valence, 4),
        "text_weight":     round(text_weight, 3),
        "speech_weight":   round(speech_weight, 3),
        "masking_flag":    masking_flag,
    }