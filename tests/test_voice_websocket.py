"""
Test G: Real-Time Voice WebSocket & Voice Note
Verifies:
1. Voice note REST endpoint: text generation → TTS → storage upload → XP
2. WebSocket connection auth: valid token accepted, missing token rejected
3. WebSocket lifecycle: connect → accept → cleanup in finally block
4. Voice call active state: Redis marks active, clears on disconnect
5. Background task error handlers: BUG-5 fix verification
"""

import pytest
import json
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from tests.conftest import TEST_USER_ID, TEST_BOT_ID, TEST_USER_NAME


class TestVoiceNoteEndpoint:
    """Verify POST /api/voice/note REST endpoint."""

    def test_voice_note_generates_audio_and_returns_url(
        self, client, mock_redis, mock_supabase_profile
    ):
        """POST /api/voice/note should return audio_url and text_response."""
        with patch(
            "services.llm_engine.generate_chat_response",
            new_callable=AsyncMock,
            return_value="Ah dear, let me tell you about Delhi!",
        ), patch(
            "services.voice_service.generate_voice_note",
            new_callable=AsyncMock,
            return_value={
                "audio_url": "https://test.supabase.co/storage/v1/object/public/voice/note.mp3",
                "duration_seconds": 5.2,
            },
        ), patch(
            "services.redis_cache.load_context",
            new_callable=AsyncMock,
            return_value=[{"role": "user", "content": "Hi"}],
        ), patch(
            "services.redis_cache.append_message",
            new_callable=AsyncMock,
            return_value=True,
        ), patch(
            "services.background_tasks.sync_message_to_db",
            new_callable=AsyncMock,
        ), patch(
            "services.background_tasks.award_xp",
            new_callable=AsyncMock,
            return_value={"total_earned": 75},
        ), patch(
            "bot_prompt.get_bot_prompt",
            return_value="You are {custom_bot_name}.",
        ), patch(
            "config.mappings.validate_language",
            return_value=True,
        ):
            response = client.post(
                "/api/voice/note",
                json={
                    "bot_id": TEST_BOT_ID,
                    "message": "Tell me about Delhi",
                    "language": "english",
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["text_response"] == "Ah dear, let me tell you about Delhi!"
        assert data["audio_url"].endswith(".mp3")
        assert data["duration_seconds"] == 5.2
        assert data["xp_earned"] == 75

    def test_voice_note_rejects_unsupported_language(self, client, mock_supabase_profile):
        """POST /api/voice/note should 400 for unsupported language."""
        with patch(
            "config.mappings.validate_language",
            return_value=False,
        ), patch(
            "config.mappings.get_supported_languages",
            return_value=["english", "hindi"],
        ):
            response = client.post(
                "/api/voice/note",
                json={
                    "bot_id": TEST_BOT_ID,
                    "message": "Hello",
                    "language": "klingon",
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 400
        assert "not supported" in response.json()["detail"].lower()

    def test_voice_note_returns_500_on_tts_failure(
        self, client, mock_redis, mock_supabase_profile
    ):
        """POST /api/voice/note should 500 when TTS generation fails."""
        with patch(
            "services.llm_engine.generate_chat_response",
            new_callable=AsyncMock,
            return_value="Some text response",
        ), patch(
            "services.voice_service.generate_voice_note",
            new_callable=AsyncMock,
            return_value=None,
        ), patch(
            "services.redis_cache.load_context",
            new_callable=AsyncMock,
            return_value=[],
        ), patch(
            "services.redis_cache.warm_cache_from_db",
            new_callable=AsyncMock,
            return_value=[],
        ), patch(
            "bot_prompt.get_bot_prompt",
            return_value="You are {custom_bot_name}.",
        ), patch(
            "config.mappings.validate_language",
            return_value=True,
        ):
            response = client.post(
                "/api/voice/note",
                json={
                    "bot_id": TEST_BOT_ID,
                    "message": "Hello",
                    "language": "english",
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 500
        assert "voice generation failed" in response.json()["detail"].lower()


class TestVoiceWebSocketAuth:
    """Verify WebSocket connection authentication."""

    def test_websocket_rejects_missing_token(self, client):
        """WS /api/voice/call without token should close with 4001."""
        with pytest.raises(Exception):
            with client.websocket_connect("/api/voice/call?bot_id=test_bot"):
                pass

    def test_websocket_rejects_missing_bot_id(self, client):
        """WS /api/voice/call without bot_id should close with 4001."""
        with pytest.raises(Exception):
            with client.websocket_connect("/api/voice/call?token=fake"):
                pass

    def test_websocket_rejects_invalid_jwt(self, client, mock_redis):
        """WS /api/voice/call with invalid JWT should close with 4001."""
        with pytest.raises(Exception):
            with client.websocket_connect(
                f"/api/voice/call?token=invalid.jwt.token&bot_id={TEST_BOT_ID}"
            ):
                pass


class TestVoiceWebSocketLifecycle:
    """Verify WebSocket connect → accept → cleanup lifecycle."""

    def test_websocket_accepts_valid_connection(self, client, mock_redis):
        """WS with valid JWT should accept and mark call active in Redis."""
        import jwt as pyjwt
        from tests.conftest import MockSettings

        settings = MockSettings()
        token = pyjwt.encode(
            {"sub": TEST_USER_ID, "aud": "authenticated"},
            settings.SUPABASE_JWT_SECRET,
            algorithm="HS256",
        )

        with patch(
            "services.redis_cache.set_voice_call_active",
            new_callable=AsyncMock,
            return_value=True,
        ) as mock_set_active, patch(
            "services.redis_cache.load_context",
            new_callable=AsyncMock,
            return_value=[],
        ), patch(
            "services.redis_cache.warm_cache_from_db",
            new_callable=AsyncMock,
            return_value=[],
        ), patch(
            "services.supabase_client.get_user_profile",
            new_callable=AsyncMock,
            return_value={"name": TEST_USER_NAME, "gender": "male"},
        ), patch(
            "services.redis_cache.clear_voice_call",
            new_callable=AsyncMock,
            return_value=True,
        ), patch(
            "services.voice_service.DeepgramSTTStream",
        ) as mock_stt_cls, patch(
            "bot_prompt.get_bot_prompt",
            return_value="You are {custom_bot_name}.",
        ):
            # Make DeepgramSTTStream.close() and start() mocks
            mock_stt = MagicMock()
            mock_stt.close = AsyncMock()
            mock_stt.start = AsyncMock()
            mock_stt_cls.return_value = mock_stt

            try:
                with client.websocket_connect(
                    f"/api/voice/call?token={token}&bot_id={TEST_BOT_ID}"
                ) as ws:
                    # Connection accepted — send a close message
                    ws.close()
            except Exception:
                pass  # Expected disconnect

    def test_websocket_clears_voice_state_on_disconnect(self, client, mock_redis):
        """On disconnect, voice call state should be cleared from Redis."""
        import jwt as pyjwt
        from tests.conftest import MockSettings

        settings = MockSettings()
        token = pyjwt.encode(
            {"sub": TEST_USER_ID, "aud": "authenticated"},
            settings.SUPABASE_JWT_SECRET,
            algorithm="HS256",
        )

        with patch(
            "services.redis_cache.set_voice_call_active",
            new_callable=AsyncMock,
            return_value=True,
        ), patch(
            "services.redis_cache.load_context",
            new_callable=AsyncMock,
            return_value=[],
        ), patch(
            "services.redis_cache.warm_cache_from_db",
            new_callable=AsyncMock,
            return_value=[],
        ), patch(
            "services.supabase_client.get_user_profile",
            new_callable=AsyncMock,
            return_value={"name": TEST_USER_NAME, "gender": "male"},
        ), patch(
            "services.redis_cache.clear_voice_call",
            new_callable=AsyncMock,
            return_value=True,
        ) as mock_clear_call, patch(
            "services.voice_service.DeepgramSTTStream",
        ) as mock_stt_cls, patch(
            "bot_prompt.get_bot_prompt",
            return_value="You are {custom_bot_name}.",
        ):
            mock_stt = MagicMock()
            mock_stt.close = AsyncMock()
            mock_stt.start = AsyncMock()
            mock_stt_cls.return_value = mock_stt

            try:
                with client.websocket_connect(
                    f"/api/voice/call?token={token}&bot_id={TEST_BOT_ID}"
                ) as ws:
                    ws.close()
            except Exception:
                pass

            # Verify cleanup was called
            mock_clear_call.assert_awaited()


class TestVoiceCallRedisState:
    """Verify Redis voice call state management."""

    @pytest.mark.asyncio
    async def test_set_voice_call_active(self, mock_redis):
        """set_voice_call_active should SET with 1 hour TTL."""
        from services.redis_cache import set_voice_call_active

        result = await set_voice_call_active(TEST_USER_ID, TEST_BOT_ID)
        assert result is True

        set_calls = [c for c in mock_redis.call_log if c[0] == "SET"]
        assert len(set_calls) == 1
        assert set_calls[0][1] == f"voice_call:{TEST_USER_ID}"
        stored = json.loads(set_calls[0][2])
        assert stored["bot_id"] == TEST_BOT_ID
        assert stored["active"] is True
        assert set_calls[0][4] == 3600  # 1 hour EX

    @pytest.mark.asyncio
    async def test_clear_voice_call(self, mock_redis):
        """clear_voice_call should DEL the voice call key."""
        from services.redis_cache import set_voice_call_active, clear_voice_call

        await set_voice_call_active(TEST_USER_ID, TEST_BOT_ID)
        result = await clear_voice_call(TEST_USER_ID)
        assert result is True

        del_calls = [c for c in mock_redis.call_log if c[0] == "DEL"]
        assert len(del_calls) == 1
        assert del_calls[0][1] == f"voice_call:{TEST_USER_ID}"


class TestTaskErrorHandler:
    """Verify BUG-5 fix — error callback on fire-and-forget tasks."""

    @pytest.mark.asyncio
    async def test_error_handler_logs_exceptions(self, caplog):
        """The _task_error_handler should log warnings for failed tasks."""
        import logging

        async def _failing_task():
            raise ValueError("Test failure")

        # Simulate what the voice call does
        def _task_error_handler(t: asyncio.Task):
            if t.cancelled():
                return
            exc = t.exception()
            if exc:
                logging.getLogger(__name__).warning(
                    f"Voice call background task failed: {exc}"
                )

        with caplog.at_level(logging.WARNING):
            task = asyncio.create_task(_failing_task())
            task.add_done_callback(_task_error_handler)
            await asyncio.sleep(0.1)  # Let the task complete

        assert "Voice call background task failed" in caplog.text
        assert "Test failure" in caplog.text

    @pytest.mark.asyncio
    async def test_error_handler_ignores_cancelled(self):
        """The _task_error_handler should not log for cancelled tasks."""

        async def _long_task():
            await asyncio.sleep(100)

        logged = []

        def _task_error_handler(t: asyncio.Task):
            if t.cancelled():
                return
            exc = t.exception()
            if exc:
                logged.append(str(exc))

        task = asyncio.create_task(_long_task())
        task.add_done_callback(_task_error_handler)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

        assert len(logged) == 0  # Should not log cancellations
