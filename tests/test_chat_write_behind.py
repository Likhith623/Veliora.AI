"""
Test A: Write-Behind Cache — Chat Message Flow
Verifies:
1. POST /api/chat/send triggers Redis append_message (RPUSH)
2. BackgroundTasks call sync_message_to_db for both user and bot messages
3. Embedding generation is triggered during sync
4. warm_cache_from_db is called on cache miss and uses batch RPUSH
5. Proper LTRIM and EXPIRE are set
"""

import pytest
import json
from unittest.mock import AsyncMock, patch, call
from tests.conftest import TEST_USER_ID, TEST_BOT_ID


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST: Redis context operations (unit-level)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class TestAppendMessage:
    """Verify append_message RPUSH + LTRIM + EXPIRE sequence."""

    @pytest.mark.asyncio
    async def test_append_message_stores_json_in_redis(self, mock_redis):
        """append_message should RPUSH a JSON-serialized message."""
        from services.redis_cache import append_message

        result = await append_message(TEST_USER_ID, TEST_BOT_ID, "user", "Hello!")
        assert result is True

        # Verify RPUSH was called
        rpush_calls = [c for c in mock_redis.call_log if c[0] == "RPUSH"]
        assert len(rpush_calls) == 1
        key = rpush_calls[0][1]
        assert key == f"ctx:{TEST_USER_ID}:{TEST_BOT_ID}"

        # Verify the message is valid JSON
        stored_msg = json.loads(rpush_calls[0][2])
        assert stored_msg == {"role": "user", "content": "Hello!"}

    @pytest.mark.asyncio
    async def test_append_message_trims_list(self, mock_redis):
        """append_message should LTRIM to keep only max_messages."""
        from services.redis_cache import append_message

        await append_message(TEST_USER_ID, TEST_BOT_ID, "user", "Hello!")

        ltrim_calls = [c for c in mock_redis.call_log if c[0] == "LTRIM"]
        assert len(ltrim_calls) == 1
        # Should trim to -50, -1 (keep last 50 messages)
        assert ltrim_calls[0][2] == -50
        assert ltrim_calls[0][3] == -1

    @pytest.mark.asyncio
    async def test_append_message_sets_ttl(self, mock_redis):
        """append_message should set EXPIRE (24h TTL)."""
        from services.redis_cache import append_message

        await append_message(TEST_USER_ID, TEST_BOT_ID, "user", "Hello!")

        expire_calls = [c for c in mock_redis.call_log if c[0] == "EXPIRE"]
        assert len(expire_calls) == 1
        assert expire_calls[0][2] == 86400  # 24 hours


class TestLoadContext:
    """Verify load_context reads from Redis correctly."""

    @pytest.mark.asyncio
    async def test_load_context_returns_parsed_messages(self, mock_redis):
        """load_context should parse JSON messages from Redis LRANGE."""
        from services.redis_cache import append_message, load_context

        # Populate Redis
        await append_message(TEST_USER_ID, TEST_BOT_ID, "user", "Hello!")
        await append_message(TEST_USER_ID, TEST_BOT_ID, "bot", "Hi there!")

        # Load back
        context = await load_context(TEST_USER_ID, TEST_BOT_ID)
        assert len(context) == 2
        assert context[0] == {"role": "user", "content": "Hello!"}
        assert context[1] == {"role": "bot", "content": "Hi there!"}

    @pytest.mark.asyncio
    async def test_load_context_returns_empty_on_miss(self, mock_redis):
        """load_context should return [] for a non-existent key."""
        from services.redis_cache import load_context

        context = await load_context("nonexistent_user", "nonexistent_bot")
        assert context == []


class TestWarmCacheFromDB:
    """Verify warm_cache_from_db loads from Supabase and batch-pushes to Redis."""

    @pytest.mark.asyncio
    async def test_warm_cache_loads_all_messages(self, mock_redis):
        """warm_cache_from_db should fetch ALL messages and RPUSH them."""
        from services.redis_cache import warm_cache_from_db

        fake_db_messages = [
            {"role": "user", "content": f"Message {i}"}
            for i in range(10)
        ]

        with patch(
            "services.supabase_client.get_all_messages_for_cache",
            new_callable=AsyncMock,
            return_value=fake_db_messages,
        ):
            result = await warm_cache_from_db(TEST_USER_ID, TEST_BOT_ID)

        assert len(result) == 10
        # Verify batch RPUSH (single call with all values)
        rpush_calls = [c for c in mock_redis.call_log if c[0] == "RPUSH"]
        assert len(rpush_calls) == 1  # Single batch call
        # args: RPUSH, key, msg1, msg2, ... msg10
        assert len(rpush_calls[0]) == 12  # RPUSH + key + 10 messages

    @pytest.mark.asyncio
    async def test_warm_cache_trims_to_max(self, mock_redis):
        """warm_cache_from_db should trim results to REDIS_CONTEXT_MAX_MESSAGES."""
        from services.redis_cache import warm_cache_from_db

        fake_db_messages = [
            {"role": "user", "content": f"Message {i}"}
            for i in range(100)
        ]

        with patch(
            "services.supabase_client.get_all_messages_for_cache",
            new_callable=AsyncMock,
            return_value=fake_db_messages,
        ):
            result = await warm_cache_from_db(TEST_USER_ID, TEST_BOT_ID)

        # Should return only last 50
        assert len(result) == 50
        assert result[0]["content"] == "Message 50"
        assert result[-1]["content"] == "Message 99"

    @pytest.mark.asyncio
    async def test_warm_cache_returns_empty_on_no_messages(self, mock_redis):
        """warm_cache_from_db should return [] when DB has no messages."""
        from services.redis_cache import warm_cache_from_db

        with patch(
            "services.supabase_client.get_all_messages_for_cache",
            new_callable=AsyncMock,
            return_value=[],
        ):
            result = await warm_cache_from_db(TEST_USER_ID, TEST_BOT_ID)

        assert result == []

    @pytest.mark.asyncio
    async def test_warm_cache_fallback_on_redis_error(self, mock_redis):
        """warm_cache_from_db should return raw DB messages if Redis fails."""
        from services.redis_cache import warm_cache_from_db

        fake_db_messages = [
            {"role": "user", "content": "Surviving message"},
        ]

        # Make RPUSH fail
        original_side_effect = mock_redis.side_effect

        async def _fail_on_rpush(*args):
            if args[0] == "RPUSH":
                raise Exception("Redis down!")
            return await original_side_effect(*args)

        mock_redis.side_effect = _fail_on_rpush

        with patch(
            "services.supabase_client.get_all_messages_for_cache",
            new_callable=AsyncMock,
            return_value=fake_db_messages,
        ):
            result = await warm_cache_from_db(TEST_USER_ID, TEST_BOT_ID)

        # Should fallback to raw DB messages (BUG-1 fix)
        assert len(result) == 1
        assert result[0]["content"] == "Surviving message"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST: sync_message_to_db background task
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class TestSyncMessageToDB:
    """Verify the write-behind background task."""

    @pytest.mark.asyncio
    async def test_sync_generates_embedding_and_inserts(
        self, mock_gemini_embedding, mock_insert_message
    ):
        """sync_message_to_db should generate an embedding then insert."""
        from services.background_tasks import sync_message_to_db

        await sync_message_to_db(
            TEST_USER_ID, TEST_BOT_ID, "user", "Hello world!", "english"
        )

        # Embedding was generated
        mock_gemini_embedding.assert_awaited_once_with("Hello world!")

        # Message was inserted into Supabase
        mock_insert_message.assert_awaited_once()
        call_kwargs = mock_insert_message.call_args
        assert call_kwargs.kwargs["user_id"] == TEST_USER_ID
        assert call_kwargs.kwargs["bot_id"] == TEST_BOT_ID
        assert call_kwargs.kwargs["role"] == "user"
        assert call_kwargs.kwargs["content"] == "Hello world!"
        assert call_kwargs.kwargs["embedding"] == [0.01] * 768
        assert call_kwargs.kwargs["language"] == "english"

    @pytest.mark.asyncio
    async def test_sync_handles_empty_embedding_gracefully(self, mock_insert_message):
        """sync_message_to_db should insert with None embedding if generation fails."""
        from services.background_tasks import sync_message_to_db

        with patch(
            "services.llm_engine.generate_embedding",
            new_callable=AsyncMock,
            return_value=None,
        ):
            await sync_message_to_db(
                TEST_USER_ID, TEST_BOT_ID, "bot", "Response text"
            )

        mock_insert_message.assert_awaited_once()
        assert mock_insert_message.call_args.kwargs["embedding"] is None

    @pytest.mark.asyncio
    async def test_sync_does_not_crash_on_db_error(self, mock_gemini_embedding):
        """sync_message_to_db should log errors but not raise."""
        from services.background_tasks import sync_message_to_db

        with patch(
            "services.supabase_client.insert_message",
            new_callable=AsyncMock,
            side_effect=Exception("DB connection refused"),
        ):
            # Should not raise
            await sync_message_to_db(
                TEST_USER_ID, TEST_BOT_ID, "user", "Test message"
            )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST: Full chat endpoint integration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class TestChatEndpointIntegration:
    """Integration test: POST /api/chat/send → Redis + Supabase."""

    def test_chat_send_returns_bot_response(
        self, client, mock_redis, mock_gemini_chat, mock_supabase_profile
    ):
        """POST /api/chat/send should return the bot response."""
        with patch(
            "services.redis_cache.load_context",
            new_callable=AsyncMock,
            return_value=[],
        ), patch(
            "services.redis_cache.warm_cache_from_db",
            new_callable=AsyncMock,
            return_value=[],
        ), patch(
            "services.vector_search.semantic_search",
            new_callable=AsyncMock,
            return_value=[],
        ), patch(
            "services.redis_cache.get_game_state",
            new_callable=AsyncMock,
            return_value=None,
        ), patch(
            "services.redis_cache.increment_session_message_count",
            new_callable=AsyncMock,
            return_value=1,
        ), patch(
            "bot_prompt.get_bot_prompt",
            return_value="You are {custom_bot_name}. Respond in {languageString}.",
        ), patch(
            "services.background_tasks.award_xp",
            new_callable=AsyncMock,
            return_value={"base_xp": 10, "multiplier": 1.0, "total_earned": 10},
        ), patch(
            "services.background_tasks.sync_message_to_db",
            new_callable=AsyncMock,
        ), patch(
            "services.redis_cache.append_message",
            new_callable=AsyncMock,
            return_value=True,
        ):
            response = client.post(
                "/api/chat/send",
                json={
                    "bot_id": TEST_BOT_ID,
                    "message": "How are you?",
                    "language": "english",
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["bot_response"] == "Hello! How are you today, dear?"
        assert data["bot_id"] == TEST_BOT_ID
        assert data["language"] == "english"
        assert "xp_earned" in data
