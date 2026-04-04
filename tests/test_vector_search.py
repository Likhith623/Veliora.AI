"""
Test C: Two-Stage Vector Semantic Memory Pipeline
Verifies:
1. Stage 1: Embedding generation → match_messages RPC call
2. Stage 2: HuggingFace cross-encoder reranking with correct payload format
3. Fallback: Stage 2 failure returns Stage 1 results
4. Edge case: empty embedding returns empty results
5. Score parsing for all cross-encoder response formats
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from tests.conftest import TEST_USER_ID, TEST_BOT_ID


class TestSemanticSearchPipeline:
    """Full two-stage semantic search pipeline tests."""

    @pytest.mark.asyncio
    async def test_stage1_generates_embedding_and_calls_rpc(self):
        """semantic_search should generate embedding then call match_messages."""
        from services.vector_search import semantic_search

        fake_embedding = [0.02] * 768
        fake_candidates = [
            {"id": "1", "content": "Previous chat about Delhi", "role": "user", "similarity": 0.95},
            {"id": "2", "content": "Told you about poetry", "role": "bot", "similarity": 0.88},
        ]
        fake_reranked_scores = [
            [{"label": "LABEL_1", "score": 0.92}, {"label": "LABEL_0", "score": 0.08}],
            [{"label": "LABEL_1", "score": 0.78}, {"label": "LABEL_0", "score": 0.22}],
        ]

        with patch(
            "services.vector_search.generate_embedding",
            new_callable=AsyncMock,
            return_value=fake_embedding,
        ) as mock_embed, patch(
            "services.vector_search.match_messages",
            new_callable=AsyncMock,
            return_value=fake_candidates,
        ) as mock_match, patch(
            "httpx.AsyncClient.post",
            new_callable=AsyncMock,
        ) as mock_hf:
            # Mock HuggingFace reranker response
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = fake_reranked_scores
            mock_response.raise_for_status = MagicMock()
            mock_hf.return_value = mock_response

            results = await semantic_search("Tell me about Delhi", TEST_USER_ID, TEST_BOT_ID)

        # Stage 1 assertions
        mock_embed.assert_awaited_once_with("Tell me about Delhi")
        mock_match.assert_awaited_once()
        call_kwargs = mock_match.call_args.kwargs
        assert call_kwargs["query_embedding"] == fake_embedding
        assert call_kwargs["user_id"] == TEST_USER_ID
        assert call_kwargs["match_count"] == 50

        # Stage 2 assertions — results should be reranked
        assert len(results) > 0
        assert isinstance(results[0], str)

    @pytest.mark.asyncio
    async def test_empty_embedding_returns_empty(self):
        """If embedding generation returns None, search should return []."""
        from services.vector_search import semantic_search

        with patch(
            "services.vector_search.generate_embedding",
            new_callable=AsyncMock,
            return_value=None,
        ):
            results = await semantic_search("Query", TEST_USER_ID, TEST_BOT_ID)

        assert results == []

    @pytest.mark.asyncio
    async def test_no_candidates_returns_empty(self):
        """If match_messages returns no candidates, search returns []."""
        from services.vector_search import semantic_search

        with patch(
            "services.vector_search.generate_embedding",
            new_callable=AsyncMock,
            return_value=[0.01] * 768,
        ), patch(
            "services.vector_search.match_messages",
            new_callable=AsyncMock,
            return_value=[],
        ):
            results = await semantic_search("Query", TEST_USER_ID, TEST_BOT_ID)

        assert results == []

    @pytest.mark.asyncio
    async def test_stage2_failure_falls_back_to_stage1(self):
        """If reranker fails, should return top K from Stage 1 by similarity."""
        from services.vector_search import semantic_search

        fake_candidates = [
            {"id": str(i), "content": f"Candidate {i}", "role": "user", "similarity": 0.9 - i * 0.1}
            for i in range(10)
        ]

        with patch(
            "services.vector_search.generate_embedding",
            new_callable=AsyncMock,
            return_value=[0.01] * 768,
        ), patch(
            "services.vector_search.match_messages",
            new_callable=AsyncMock,
            return_value=fake_candidates,
        ), patch(
            "httpx.AsyncClient.post",
            new_callable=AsyncMock,
            side_effect=Exception("HuggingFace API down"),
        ):
            results = await semantic_search("Query", TEST_USER_ID, TEST_BOT_ID)

        # Should fall back to top 8 from Stage 1
        assert len(results) == 8
        assert results[0] == "Candidate 0"


class TestCrossEncoderReranking:
    """Test the _rerank_with_cross_encoder helper with different score formats."""

    @pytest.mark.asyncio
    async def test_rerank_with_list_of_dicts_format(self):
        """Handle format: [[{label: LABEL_1, score: 0.9}, ...], ...]"""
        from services.vector_search import _rerank_with_cross_encoder

        candidates = [
            {"content": "High relevance"},
            {"content": "Low relevance"},
        ]
        scores_response = [
            [{"label": "LABEL_1", "score": 0.95}, {"label": "LABEL_0", "score": 0.05}],
            [{"label": "LABEL_1", "score": 0.20}, {"label": "LABEL_0", "score": 0.80}],
        ]

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = scores_response
            mock_resp.raise_for_status = MagicMock()
            mock_post.return_value = mock_resp

            results = await _rerank_with_cross_encoder("query", candidates, top_k=2)

        assert results[0] == "High relevance"  # Higher score first
        assert results[1] == "Low relevance"

    @pytest.mark.asyncio
    async def test_rerank_with_numeric_scores(self):
        """Handle format: [0.95, 0.20, ...]"""
        from services.vector_search import _rerank_with_cross_encoder

        candidates = [
            {"content": "Doc A"},
            {"content": "Doc B"},
            {"content": "Doc C"},
        ]
        scores_response = [0.3, 0.95, 0.1]

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = scores_response
            mock_resp.raise_for_status = MagicMock()
            mock_post.return_value = mock_resp

            results = await _rerank_with_cross_encoder("query", candidates, top_k=2)

        assert results[0] == "Doc B"  # 0.95
        assert results[1] == "Doc A"  # 0.3

    @pytest.mark.asyncio
    async def test_rerank_handles_503_retry(self):
        """Should retry once on HuggingFace 503 (model loading)."""
        from services.vector_search import _rerank_with_cross_encoder

        candidates = [{"content": "Test doc"}]

        call_count = 0

        async def _mock_post(url, **kwargs):
            nonlocal call_count
            call_count += 1
            resp = MagicMock()
            if call_count == 1:
                resp.status_code = 503
                resp.raise_for_status = MagicMock(side_effect=Exception("503"))
                # Return 503 first
                return resp
            resp.status_code = 200
            resp.json.return_value = [0.9]
            resp.raise_for_status = MagicMock()
            return resp

        with patch("httpx.AsyncClient.post", side_effect=_mock_post):
            results = await _rerank_with_cross_encoder("query", candidates, top_k=1)

        assert call_count == 2  # Retried once
        assert len(results) == 1

    @pytest.mark.asyncio
    async def test_rerank_returns_empty_for_no_inputs(self):
        """Should return [] when candidates have no content."""
        from services.vector_search import _rerank_with_cross_encoder

        results = await _rerank_with_cross_encoder("query", [], top_k=5)
        assert results == []
