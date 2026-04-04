"""
Veliora.AI — Shared Test Fixtures
Provides: mock settings, mock auth, test client, and common test data.
All external services (Supabase, Redis, Gemini, HuggingFace) are mocked.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
import uuid


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MOCK SETTINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class MockSettings:
    """Mock settings that don't require a .env file."""
    APP_NAME = "Veliora.AI-Test"
    APP_VERSION = "1.0.0-test"
    DEBUG = True
    CORS_ORIGINS = "*"
    SUPABASE_URL = "https://test.supabase.co"
    SUPABASE_KEY = "test-anon-key"
    SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    SUPABASE_JWT_SECRET = "test-jwt-secret-must-be-at-least-32-chars-long"
    UPSTASH_REDIS_URL = "https://test-redis.upstash.io"
    UPSTASH_REDIS_TOKEN = "test-redis-token"
    GEMINI_API_KEY = "test-gemini-key"
    GEMINI_MODEL = "gemini-1.5-flash"
    GEMINI_EMBEDDING_MODEL = "text-embedding-004"
    GEMINI_EMBEDDING_DIMENSIONS = 768
    DEEPGRAM_API_KEY = "test-deepgram-key"
    CARTESIA_API_KEY = "test-cartesia-key"
    CARTESIA_MODEL = "sonic-2"
    HF_API_TOKEN = "test-hf-token"
    HF_RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    HF_IMAGE_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
    VECTOR_TOP_K = 50
    RERANK_TOP_K = 8
    REDIS_CONTEXT_TTL = 86400
    REDIS_GAME_STATE_TTL = 7200
    REDIS_CONTEXT_MAX_MESSAGES = 50
    XP_FLUSH_INTERVAL = 60
    DIARY_CRON_HOUR = 0


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST DATA
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEST_USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
TEST_BOT_ID = "delhi_mentor_male"
TEST_EMAIL = "test@veliora.ai"
TEST_USER_NAME = "TestUser"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FIXTURES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@pytest.fixture(autouse=True)
def mock_settings():
    """Auto-mock settings for ALL tests — no .env required."""
    with patch("config.settings.get_settings", return_value=MockSettings()):
        yield MockSettings()


@pytest.fixture
def mock_auth():
    """
    Mock the JWT auth dependency so all endpoints accept requests.
    Returns a fake current_user dict.
    """
    fake_user = {"user_id": TEST_USER_ID, "email": TEST_EMAIL}
    return fake_user


@pytest.fixture
def client(mock_auth):
    """
    Create a FastAPI TestClient with auth mocked out via dependency_overrides.
    This is the canonical FastAPI way to bypass auth in tests.
    """
    from contextlib import asynccontextmanager
    from api.auth import get_current_user

    @asynccontextmanager
    async def _test_lifespan(app):
        yield  # No startup/shutdown workers

    with patch("main.lifespan", _test_lifespan):
        with patch("config.settings.get_settings", return_value=MockSettings()):
            from main import app

            # FastAPI dependency override — the CORRECT way to mock Depends()
            async def _override_auth():
                return mock_auth

            app.dependency_overrides[get_current_user] = _override_auth
            app.router.lifespan_context = _test_lifespan

            with TestClient(app) as c:
                yield c

            # Cleanup
            app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def mock_redis():
    """
    Mock the _redis_command function to simulate Upstash REST API responses.
    Returns a dict tracking all commands issued.
    """
    call_log = []
    storage = {}  # Simple in-memory Redis simulation

    async def _fake_redis(*args):
        call_log.append(list(args))
        cmd = args[0].upper() if args else ""

        if cmd == "RPUSH":
            key = args[1]
            vals = list(args[2:])
            storage.setdefault(key, []).extend(vals)
            return {"result": len(storage[key])}

        elif cmd == "LRANGE":
            key = args[1]
            start, end = int(args[2]), int(args[3])
            items = storage.get(key, [])
            # Handle negative indices like Redis
            length = len(items)
            if start < 0:
                start = max(length + start, 0)
            if end < 0:
                end = length + end
            return {"result": items[start:end + 1]}

        elif cmd == "LTRIM":
            key = args[1]
            start, end = int(args[2]), int(args[3])
            items = storage.get(key, [])
            length = len(items)
            if start < 0:
                start = max(length + start, 0)
            if end < 0:
                end = length + end
            storage[key] = items[start:end + 1]
            return {"result": "OK"}

        elif cmd == "SET":
            key = args[1]
            value = args[2]
            storage[key] = value
            return {"result": "OK"}

        elif cmd == "GET":
            key = args[1]
            return {"result": storage.get(key)}

        elif cmd == "DEL":
            key = args[1]
            storage.pop(key, None)
            return {"result": 1}

        elif cmd == "INCR":
            key = args[1]
            storage[key] = storage.get(key, 0) + 1
            return {"result": storage[key]}

        elif cmd == "HINCRBY":
            key = args[1]
            field = args[2]
            amount = int(args[3])
            storage.setdefault(key, {})
            if isinstance(storage[key], dict):
                storage[key][field] = storage[key].get(field, 0) + amount
                return {"result": storage[key][field]}
            return {"result": 0}

        elif cmd == "HGETALL":
            key = args[1]
            data = storage.get(key, {})
            if isinstance(data, dict):
                flat = []
                for k, v in data.items():
                    flat.extend([k, str(v)])
                return {"result": flat}
            return {"result": []}

        elif cmd == "HDEL":
            key = args[1]
            field = args[2]
            if isinstance(storage.get(key), dict):
                storage[key].pop(field, None)
            return {"result": 1}

        elif cmd == "EXPIRE":
            return {"result": 1}

        return {"result": None}

    mock = patch(
        "services.redis_cache._redis_command",
        side_effect=_fake_redis,
    )
    with mock as m:
        m.call_log = call_log
        m.storage = storage
        yield m


@pytest.fixture
def mock_supabase_profile():
    """Mock get_user_profile to return a test profile."""
    profile = {
        "id": TEST_USER_ID,
        "email": TEST_EMAIL,
        "name": TEST_USER_NAME,
        "username": "testuser",
        "age": 25,
        "gender": "male",
        "location": "Test City",
        "bio": "Test bio",
        "avatar_url": None,
        "total_xp": 100,
        "streak_days": 3,
        "last_login_date": "2026-04-03",
    }
    with patch(
        "services.supabase_client.get_user_profile",
        new_callable=AsyncMock,
        return_value=profile,
    ) as m:
        yield m


@pytest.fixture
def mock_gemini_chat():
    """Mock the Gemini chat response."""
    with patch(
        "services.llm_engine.generate_chat_response",
        new_callable=AsyncMock,
        return_value="Hello! How are you today, dear?",
    ) as m:
        yield m


@pytest.fixture
def mock_gemini_embedding():
    """Mock the Gemini embedding generation to return a 768-dim vector."""
    fake_embedding = [0.01] * 768
    with patch(
        "services.llm_engine.generate_embedding",
        new_callable=AsyncMock,
        return_value=fake_embedding,
    ) as m:
        yield m


@pytest.fixture
def mock_insert_message():
    """Mock Supabase message insertion."""
    with patch(
        "services.supabase_client.insert_message",
        new_callable=AsyncMock,
        return_value={"id": str(uuid.uuid4())},
    ) as m:
        yield m
