"""
Veliora.AI — Two-Stage Vector Search (Semantic Memory)
Stage 1: pgvector HNSW via Supabase RPC (O(log N), top 50)
Stage 2: HuggingFace cross-encoder reranking (O(K), top 8)
"""

import httpx
import logging
from typing import Optional
from config.settings import get_settings
from services.llm_engine import generate_embedding
from services.supabase_client import match_messages

logger = logging.getLogger(__name__)


async def semantic_search(
    user_query: str,
    user_id: str,
    bot_id: str,
) -> list[str]:
    """
    Perform two-stage semantic memory retrieval.
    
    Stage 1: Generate query embedding → HNSW search for top 50 candidates
    Stage 2: Rerank candidates using HuggingFace cross-encoder → return top K
    
    Returns: list of relevant past message texts
    """
    settings = get_settings()

    # ─── Stage 1: Generate embedding and HNSW search ───
    try:
        query_embedding = await generate_embedding(user_query)
        if not query_embedding:
            logger.warning("Empty embedding generated, skipping vector search")
            return []

        candidates = await match_messages(
            query_embedding=query_embedding,
            user_id=user_id,
            bot_id=bot_id,
            match_count=settings.VECTOR_TOP_K,
        )

        if not candidates:
            logger.info("No vector search candidates found")
            return []

        logger.info(f"Stage 1: Retrieved {len(candidates)} HNSW candidates")

    except Exception as e:
        logger.error(f"Stage 1 vector search failed: {e}")
        return []

    # ─── Stage 2: Cross-encoder reranking via HuggingFace Serverless ───
    try:
        reranked = await _rerank_with_cross_encoder(
            user_query, candidates, settings.RERANK_TOP_K
        )
        logger.info(f"Stage 2: Reranked to {len(reranked)} results")
        return reranked

    except Exception as e:
        logger.warning(f"Stage 2 reranking failed, falling back to Stage 1 results: {e}")
        # Fallback: return top K from Stage 1 by similarity score
        return [c["content"] for c in candidates[: settings.RERANK_TOP_K]]


async def _rerank_with_cross_encoder(
    query: str,
    candidates: list[dict],
    top_k: int,
) -> list[str]:
    """
    Rerank candidates using HuggingFace Serverless API
    with cross-encoder/ms-marco-MiniLM-L-6-v2.
    
    The cross-encoder compares query-document pairs word-by-word
    for precise semantic relevance scoring.
    """
    settings = get_settings()

    # Build input pairs for the cross-encoder
    # Format: [[query, document], [query, document], ...]
    inputs = [[query, c["content"]] for c in candidates if c.get("content")]

    if not inputs:
        return []

    url = f"https://api-inference.huggingface.co/models/{settings.HF_RERANKER_MODEL}"
    headers = {"Authorization": f"Bearer {settings.HF_API_TOKEN}"}

    payload = {"inputs": inputs}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)

        # Handle HuggingFace model loading (cold start)
        if response.status_code == 503:
            logger.info("HuggingFace model loading, retrying in 10s...")
            import asyncio
            await asyncio.sleep(10)
            response = await client.post(url, headers=headers, json=payload)

        response.raise_for_status()
        scores = response.json()

    # The cross-encoder returns scores for each pair
    # Higher score = more relevant
    scored_candidates = []

    if isinstance(scores, list) and len(scores) > 0:
        for i, score_data in enumerate(scores):
            if i < len(candidates):
                # Handle both list-of-dicts and list-of-lists formats
                if isinstance(score_data, list):
                    # Format: [[{"label": "LABEL_1", "score": 0.95}, ...]]
                    relevance_score = max(
                        (s["score"] for s in score_data if s.get("label") == "LABEL_1"),
                        default=0.0,
                    )
                elif isinstance(score_data, dict):
                    relevance_score = score_data.get("score", 0.0)
                elif isinstance(score_data, (int, float)):
                    relevance_score = float(score_data)
                else:
                    relevance_score = 0.0

                scored_candidates.append({
                    "content": candidates[i]["content"],
                    "score": relevance_score,
                })

    # Sort by score descending and take top K
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    return [c["content"] for c in scored_candidates[:top_k]]
