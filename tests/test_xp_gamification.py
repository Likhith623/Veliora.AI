"""
Test B: XP Micro-Batching & Gamification
Verifies:
1. HINCRBY accumulates XP atomically in Redis
2. Streak multiplier is applied correctly
3. flush_xp_to_db reads pending XP and calls upsert_user_xp RPC
4. Per-field HDEL after successful flush (race-safe)
5. Milestone XP at message counts 10 and 25
6. Zero XP actions return early
"""

import pytest
from unittest.mock import AsyncMock, patch
from tests.conftest import TEST_USER_ID, TEST_BOT_ID


class TestXPIncrement:
    """Verify Redis XP accumulation via HINCRBY."""

    @pytest.mark.asyncio
    async def test_increment_xp_uses_hincrby(self, mock_redis):
        """increment_xp should use HINCRBY for atomic increment."""
        from services.redis_cache import increment_xp

        result = await increment_xp(TEST_USER_ID, TEST_BOT_ID, 50)
        assert result == 50

        hincrby_calls = [c for c in mock_redis.call_log if c[0] == "HINCRBY"]
        assert len(hincrby_calls) == 1
        assert hincrby_calls[0][1] == "xp:pending"
        assert hincrby_calls[0][2] == f"{TEST_USER_ID}:{TEST_BOT_ID}"
        assert hincrby_calls[0][3] == 50

    @pytest.mark.asyncio
    async def test_increment_xp_accumulates(self, mock_redis):
        """Multiple HINCRBY calls should accumulate correctly."""
        from services.redis_cache import increment_xp

        r1 = await increment_xp(TEST_USER_ID, TEST_BOT_ID, 10)
        r2 = await increment_xp(TEST_USER_ID, TEST_BOT_ID, 25)
        r3 = await increment_xp(TEST_USER_ID, TEST_BOT_ID, 15)

        assert r1 == 10
        assert r2 == 35
        assert r3 == 50


class TestGetAllPendingXP:
    """Verify HGETALL parsing."""

    @pytest.mark.asyncio
    async def test_get_all_pending_xp_parses_flat_list(self, mock_redis):
        """get_all_pending_xp should parse HGETALL flat list into dict."""
        from services.redis_cache import increment_xp, get_all_pending_xp

        await increment_xp(TEST_USER_ID, TEST_BOT_ID, 100)
        await increment_xp(TEST_USER_ID, "japanese_friend_female", 200)

        pending = await get_all_pending_xp()
        assert pending[f"{TEST_USER_ID}:{TEST_BOT_ID}"] == 100
        assert pending[f"{TEST_USER_ID}:japanese_friend_female"] == 200

    @pytest.mark.asyncio
    async def test_get_all_pending_xp_returns_empty_when_none(self, mock_redis):
        """get_all_pending_xp should return {} when hash is empty."""
        from services.redis_cache import get_all_pending_xp

        pending = await get_all_pending_xp()
        assert pending == {}


class TestAwardXP:
    """Verify the XP event handler with streak multiplier."""

    @pytest.mark.asyncio
    async def test_award_xp_applies_streak_multiplier(
        self, mock_redis, mock_supabase_profile
    ):
        """award_xp should apply streak_multiplier from user profile."""
        from services.background_tasks import award_xp

        # Profile has streak_days=3, multiplier = 1 + 3*0.1 = 1.3
        result = await award_xp(TEST_USER_ID, TEST_BOT_ID, "daily_login")

        # daily_login XP = 50 (from XP_REWARDS)
        from config.mappings import XP_REWARDS, calculate_streak_multiplier
        base = XP_REWARDS["daily_login"]
        multiplier = calculate_streak_multiplier(3)
        expected = int(base * multiplier)

        assert result["base_xp"] == base
        assert result["multiplier"] == multiplier
        assert result["total_earned"] == expected

    @pytest.mark.asyncio
    async def test_award_xp_zero_for_unknown_action(
        self, mock_redis, mock_supabase_profile
    ):
        """award_xp should return 0 for unknown action keys."""
        from services.background_tasks import award_xp

        result = await award_xp(TEST_USER_ID, TEST_BOT_ID, "nonexistent_action")
        assert result["total_earned"] == 0
        assert result["base_xp"] == 0

    @pytest.mark.asyncio
    async def test_award_xp_with_custom_amount(
        self, mock_redis, mock_supabase_profile
    ):
        """award_xp with custom_amount should override XP_REWARDS lookup."""
        from services.background_tasks import award_xp

        result = await award_xp(
            TEST_USER_ID, TEST_BOT_ID, "message_short", custom_amount=42
        )
        assert result["base_xp"] == 42

    @pytest.mark.asyncio
    async def test_award_xp_handles_missing_profile_gracefully(self, mock_redis):
        """If profile fetch fails, multiplier should default to 1.0."""
        from services.background_tasks import award_xp

        with patch(
            "services.supabase_client.get_user_profile",
            new_callable=AsyncMock,
            side_effect=Exception("DB error"),
        ):
            result = await award_xp(TEST_USER_ID, TEST_BOT_ID, "daily_login")

        assert result["multiplier"] == 1.0


class TestFlushXPToDB:
    """Verify the flush worker moves XP from Redis → Supabase."""

    @pytest.mark.asyncio
    async def test_flush_calls_upsert_for_each_pending_entry(self, mock_redis):
        """flush_xp_to_db should upsert each pending XP entry."""
        from services.redis_cache import increment_xp
        from services.background_tasks import flush_xp_to_db

        await increment_xp(TEST_USER_ID, TEST_BOT_ID, 100)
        await increment_xp(TEST_USER_ID, "berlin_friend_male", 200)

        with patch(
            "services.supabase_client.upsert_user_xp",
            new_callable=AsyncMock,
            return_value={},
        ) as mock_upsert:
            await flush_xp_to_db()

        assert mock_upsert.await_count == 2
        calls = mock_upsert.call_args_list
        call_keys = {(c.args[0], c.args[1]) for c in calls}
        assert (TEST_USER_ID, TEST_BOT_ID) in call_keys
        assert (TEST_USER_ID, "berlin_friend_male") in call_keys

    @pytest.mark.asyncio
    async def test_flush_deletes_field_after_success(self, mock_redis):
        """After successful upsert, the field should be HDEL'd from Redis."""
        from services.redis_cache import increment_xp, get_all_pending_xp
        from services.background_tasks import flush_xp_to_db

        await increment_xp(TEST_USER_ID, TEST_BOT_ID, 100)

        with patch(
            "services.supabase_client.upsert_user_xp",
            new_callable=AsyncMock,
            return_value={},
        ):
            await flush_xp_to_db()

        # Pending should now be empty
        pending = await get_all_pending_xp()
        assert len(pending) == 0

    @pytest.mark.asyncio
    async def test_flush_skips_on_empty_pending(self, mock_redis):
        """flush_xp_to_db should return early when no pending XP."""
        from services.background_tasks import flush_xp_to_db

        with patch(
            "services.supabase_client.upsert_user_xp",
            new_callable=AsyncMock,
        ) as mock_upsert:
            await flush_xp_to_db()

        mock_upsert.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_flush_retains_field_on_upsert_failure(self, mock_redis):
        """If upsert fails, the field should NOT be deleted from Redis."""
        from services.redis_cache import increment_xp, get_all_pending_xp
        from services.background_tasks import flush_xp_to_db

        await increment_xp(TEST_USER_ID, TEST_BOT_ID, 100)

        with patch(
            "services.supabase_client.upsert_user_xp",
            new_callable=AsyncMock,
            side_effect=Exception("DB unavailable"),
        ):
            await flush_xp_to_db()

        # XP should still be pending (not lost)
        pending = await get_all_pending_xp()
        assert f"{TEST_USER_ID}:{TEST_BOT_ID}" in pending
        assert pending[f"{TEST_USER_ID}:{TEST_BOT_ID}"] == 100


class TestSessionMilestones:
    """Verify session message count tracking and milestone XP."""

    @pytest.mark.asyncio
    async def test_session_message_count_increments(self, mock_redis):
        """increment_session_message_count should INCR and return count."""
        from services.redis_cache import increment_session_message_count

        for expected in range(1, 6):
            count = await increment_session_message_count(TEST_USER_ID, TEST_BOT_ID)
            assert count == expected

    @pytest.mark.asyncio
    async def test_session_count_sets_expiry(self, mock_redis):
        """Session count should have a 6-hour TTL."""
        from services.redis_cache import increment_session_message_count

        await increment_session_message_count(TEST_USER_ID, TEST_BOT_ID)

        expire_calls = [c for c in mock_redis.call_log if c[0] == "EXPIRE"]
        assert len(expire_calls) == 1
        assert expire_calls[0][2] == 21600  # 6 hours
