"""
Test E: Game Lifecycle — Start, Action, End
Verifies:
1. Game start: Redis state set, game session created, opening message
2. Game action: turn increment, context building, auto-end at max_turns
3. Game end: Redis cleanup, DB session update, XP awards
4. Invalid game states: wrong session, no active game
"""

import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from tests.conftest import TEST_USER_ID, TEST_BOT_ID


MOCK_SESSION_ID = "abc123sessionid"


class TestGameStart:
    """Verify game start flow: validate → create session → set Redis → opening message."""

    def test_start_game_creates_session_and_redis_state(self, client, mock_redis):
        """POST /api/games/start should create DB session and set Redis state."""
        with patch(
            "services.redis_cache.get_game_state",
            new_callable=AsyncMock,
            return_value=None,  # No existing game
        ), patch(
            "services.redis_cache.set_game_state",
            new_callable=AsyncMock,
            return_value=True,
        ) as mock_set_state, patch(
            "services.supabase_client.create_game_session",
            new_callable=AsyncMock,
            return_value={"id": MOCK_SESSION_ID},
        ), patch(
            "services.llm_engine.generate_chat_response",
            new_callable=AsyncMock,
            return_value="Welcome to Wisdom Quest! Let me start with a question...",
        ), patch(
            "services.background_tasks.sync_message_to_db",
            new_callable=AsyncMock,
        ), patch(
            "services.background_tasks.award_xp",
            new_callable=AsyncMock,
            return_value={"total_earned": 50},
        ), patch(
            "bot_prompt.get_bot_prompt",
            return_value="You are {custom_bot_name}.",
        ), patch(
            "services.supabase_client.get_user_profile",
            new_callable=AsyncMock,
            return_value={"name": "TestUser", "gender": "male"},
        ):
            response = client.post(
                "/api/games/start",
                json={
                    "bot_id": TEST_BOT_ID,
                    "game_id": "mentor_wisdom_quest",
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["game_name"] == "Wisdom Quest"
        assert "opening_message" in data
        assert data["xp_earned"] == 50

        # Verify Redis game state was set
        mock_set_state.assert_awaited_once()
        state_arg = mock_set_state.call_args.args[1]
        assert state_arg["game_name"] == "Wisdom Quest"
        assert state_arg["turn"] == 1

    def test_start_game_rejects_invalid_game_id(self, client, mock_redis):
        """POST /api/games/start should 404 for nonexistent game."""
        with patch(
            "services.redis_cache.get_game_state",
            new_callable=AsyncMock,
            return_value=None,
        ):
            response = client.post(
                "/api/games/start",
                json={"bot_id": TEST_BOT_ID, "game_id": "nonexistent_game"},
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 404

    def test_start_game_rejects_if_game_already_active(self, client, mock_redis):
        """POST /api/games/start should 409 if user has an active game."""
        with patch(
            "services.redis_cache.get_game_state",
            new_callable=AsyncMock,
            return_value={"session_id": "existing", "game_name": "OldGame"},
        ):
            response = client.post(
                "/api/games/start",
                json={"bot_id": TEST_BOT_ID, "game_id": "mentor_wisdom_quest"},
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 409
        assert "already have an active game" in response.json()["detail"].lower()


class TestGameAction:
    """Verify game turn processing."""

    def test_game_action_increments_turn_count(self, client, mock_redis):
        """POST /api/games/action should increment turn and return response."""
        active_state = {
            "session_id": MOCK_SESSION_ID,
            "game_id": "mentor_wisdom_quest",
            "game_name": "Wisdom Quest",
            "bot_id": TEST_BOT_ID,
            "turn": 1,
            "max_turns": 10,
            "category": "philosophy",
            "description": "Answer life's big questions.",
            "total_xp": 50,
        }

        with patch(
            "services.redis_cache.get_game_state",
            new_callable=AsyncMock,
            return_value=active_state,
        ), patch(
            "services.redis_cache.set_game_state",
            new_callable=AsyncMock,
            return_value=True,
        ), patch(
            "services.llm_engine.generate_chat_response",
            new_callable=AsyncMock,
            return_value="Interesting perspective! Now consider this...",
        ), patch(
            "services.supabase_client.update_game_session",
            new_callable=AsyncMock,
            return_value={},
        ), patch(
            "services.background_tasks.sync_message_to_db",
            new_callable=AsyncMock,
        ), patch(
            "services.background_tasks.award_xp",
            new_callable=AsyncMock,
            return_value={"total_earned": 25},
        ), patch(
            "bot_prompt.get_bot_prompt",
            return_value="You are {custom_bot_name}.",
        ):
            response = client.post(
                "/api/games/action",
                json={
                    "bot_id": TEST_BOT_ID,
                    "session_id": MOCK_SESSION_ID,
                    "action": "I think wisdom comes from experience.",
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["turn_number"] == 2
        assert data["bot_response"] == "Interesting perspective! Now consider this..."
        assert data["is_game_over"] is False
        assert data["xp_earned"] == 25

    def test_game_action_auto_ends_at_max_turns(self, client, mock_redis):
        """POST /api/games/action should auto-end game at max_turns."""
        active_state = {
            "session_id": MOCK_SESSION_ID,
            "game_id": "mentor_wisdom_quest",
            "game_name": "Wisdom Quest",
            "bot_id": TEST_BOT_ID,
            "turn": 9,  # max_turns is 10, so turn 10 = last turn
            "max_turns": 10,
            "category": "philosophy",
            "description": "Answer life's big questions.",
            "total_xp": 200,
        }

        with patch(
            "services.redis_cache.get_game_state",
            new_callable=AsyncMock,
            return_value=active_state,
        ), patch(
            "services.redis_cache.set_game_state",
            new_callable=AsyncMock,
            return_value=True,
        ), patch(
            "services.redis_cache.clear_game_state",
            new_callable=AsyncMock,
            return_value=True,
        ) as mock_clear, patch(
            "services.llm_engine.generate_chat_response",
            new_callable=AsyncMock,
            return_value="Great journey! You've earned your wisdom.",
        ), patch(
            "services.supabase_client.update_game_session",
            new_callable=AsyncMock,
            return_value={},
        ), patch(
            "services.background_tasks.sync_message_to_db",
            new_callable=AsyncMock,
        ), patch(
            "services.background_tasks.award_xp",
            new_callable=AsyncMock,
            return_value={"total_earned": 250},
        ), patch(
            "bot_prompt.get_bot_prompt",
            return_value="You are {custom_bot_name}.",
        ):
            response = client.post(
                "/api/games/action",
                json={
                    "bot_id": TEST_BOT_ID,
                    "session_id": MOCK_SESSION_ID,
                    "action": "Final answer!",
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["is_game_over"] is True
        assert data["result"] == "completed"
        # Redis game state should be cleared
        mock_clear.assert_awaited_once()

    def test_game_action_rejects_wrong_session_id(self, client, mock_redis):
        """POST /api/games/action should 404 when session_id doesn't match."""
        active_state = {
            "session_id": "different_session",
            "game_id": "mentor_wisdom_quest",
            "turn": 1,
            "max_turns": 10,
        }

        with patch(
            "services.redis_cache.get_game_state",
            new_callable=AsyncMock,
            return_value=active_state,
        ):
            response = client.post(
                "/api/games/action",
                json={
                    "bot_id": TEST_BOT_ID,
                    "session_id": "wrong_session_id",
                    "action": "Test",
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 404

    def test_game_action_rejects_when_no_active_game(self, client, mock_redis):
        """POST /api/games/action should 404 when no active game in Redis."""
        with patch(
            "services.redis_cache.get_game_state",
            new_callable=AsyncMock,
            return_value=None,
        ):
            response = client.post(
                "/api/games/action",
                json={
                    "bot_id": TEST_BOT_ID,
                    "session_id": MOCK_SESSION_ID,
                    "action": "Hello",
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 404


class TestGameEnd:
    """Verify explicit game end (abandon) flow."""

    def test_end_game_cleans_up_redis_and_updates_db(self, client, mock_redis):
        """POST /api/games/end should clear Redis state and update DB."""
        active_state = {
            "session_id": MOCK_SESSION_ID,
            "game_id": "mentor_wisdom_quest",
            "game_name": "Wisdom Quest",
            "bot_id": TEST_BOT_ID,
            "turn": 3,
            "max_turns": 10,
            "total_xp": 125,
        }

        with patch(
            "services.redis_cache.get_game_state",
            new_callable=AsyncMock,
            return_value=active_state,
        ), patch(
            "services.redis_cache.clear_game_state",
            new_callable=AsyncMock,
            return_value=True,
        ) as mock_clear, patch(
            "services.supabase_client.update_game_session",
            new_callable=AsyncMock,
            return_value={},
        ):
            response = client.post(
                "/api/games/end",
                json={
                    "bot_id": TEST_BOT_ID,
                    "session_id": MOCK_SESSION_ID,
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == MOCK_SESSION_ID
        assert data["total_xp_earned"] == 125
        assert "Wisdom Quest" in data["summary"]
        assert "turn 3" in data["summary"]

        # Verify Redis was cleaned up
        mock_clear.assert_awaited_once()

    def test_end_game_rejects_wrong_session_id(self, client, mock_redis):
        """POST /api/games/end should 404 when session_id doesn't match."""
        with patch(
            "services.redis_cache.get_game_state",
            new_callable=AsyncMock,
            return_value={"session_id": "different", "turn": 1},
        ):
            response = client.post(
                "/api/games/end",
                json={
                    "bot_id": TEST_BOT_ID,
                    "session_id": "wrong_id",
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 404

    def test_end_game_rejects_when_no_active_game(self, client, mock_redis):
        """POST /api/games/end should 404 when no active game."""
        with patch(
            "services.redis_cache.get_game_state",
            new_callable=AsyncMock,
            return_value=None,
        ):
            response = client.post(
                "/api/games/end",
                json={
                    "bot_id": TEST_BOT_ID,
                    "session_id": MOCK_SESSION_ID,
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 404
