"""
Test F: Auth & Profile — Signup, Login, Streak, XP
Verifies:
1. Signup flow: Supabase auth → profile creation → welcome XP
2. Login flow: streak calculation, daily login XP
3. Profile CRUD: get, update
4. Auth guard: unauthorized access blocked
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from tests.conftest import TEST_USER_ID, TEST_EMAIL, TEST_USER_NAME, MockSettings


class TestSignupFlow:
    """Verify user registration pipeline."""

    def test_signup_creates_auth_and_profile(self, client):
        """POST /api/auth/signup should return AuthResponse with tokens + user."""
        mock_user = MagicMock()
        mock_user.id = TEST_USER_ID
        mock_user.email = TEST_EMAIL

        mock_session = MagicMock()
        mock_session.access_token = "fresh-access-token"
        mock_session.refresh_token = "fresh-refresh-token"

        with patch(
            "services.supabase_client.sign_up_user",
            new_callable=AsyncMock,
            return_value={"user": mock_user, "session": mock_session},
        ), patch(
            "services.supabase_client.create_user_profile",
            new_callable=AsyncMock,
            return_value={"id": TEST_USER_ID, "name": TEST_USER_NAME},
        ) as mock_profile, patch(
            "services.background_tasks.award_xp",
            new_callable=AsyncMock,
            return_value={"total_earned": 500},
        ):
            response = client.post(
                "/api/auth/signup",
                json={
                    "email": TEST_EMAIL,
                    "password": "StrongP@ss123!",
                    "name": TEST_USER_NAME,
                    "username": "testuser",
                    "age": 25,
                    "gender": "male",
                    "location": "Test City",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "fresh-access-token"
        assert data["refresh_token"] == "fresh-refresh-token"
        assert data["user"]["id"] == TEST_USER_ID
        assert data["user"]["name"] == TEST_USER_NAME

        # Profile creation should have been called
        mock_profile.assert_awaited_once()
        profile_data = mock_profile.call_args.args[1]
        assert profile_data["email"] == TEST_EMAIL
        assert profile_data["name"] == TEST_USER_NAME

    def test_signup_fails_gracefully_on_error(self, client):
        """POST /api/auth/signup should return 500 for unexpected errors."""
        with patch(
            "services.supabase_client.sign_up_user",
            new_callable=AsyncMock,
            side_effect=Exception("User already registered"),
        ):
            response = client.post(
                "/api/auth/signup",
                json={
                    "email": TEST_EMAIL,
                    "password": "StrongP@ss123!",
                    "name": TEST_USER_NAME,
                    "username": "testuser",
                    "age": 25,
                    "gender": "male",
                },
            )

        assert response.status_code == 500


class TestLoginFlow:
    """Verify login and streak tracking."""

    def test_login_returns_tokens_and_profile(self, client):
        """POST /api/auth/login should return AuthResponse."""
        mock_user = MagicMock()
        mock_user.id = TEST_USER_ID
        mock_user.email = TEST_EMAIL

        mock_session = MagicMock()
        mock_session.access_token = "login-access-token"
        mock_session.refresh_token = "login-refresh-token"

        with patch(
            "services.supabase_client.sign_in_user",
            new_callable=AsyncMock,
            return_value={"user": mock_user, "session": mock_session},
        ), patch(
            "services.supabase_client.get_user_profile",
            new_callable=AsyncMock,
            return_value={
                "id": TEST_USER_ID,
                "email": TEST_EMAIL,
                "name": TEST_USER_NAME,
                "username": "testuser",
                "age": 25,
                "gender": "male",
                "streak_days": 3,
                "last_login_date": "2026-04-03",
                "total_xp": 5000,
            },
        ), patch(
            "services.supabase_client.update_user_streak",
            new_callable=AsyncMock,
            return_value={},
        ) as mock_streak, patch(
            "services.background_tasks.award_xp",
            new_callable=AsyncMock,
            return_value={"total_earned": 50},
        ):
            response = client.post(
                "/api/auth/login",
                json={
                    "email": TEST_EMAIL,
                    "password": "StrongP@ss123!",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "login-access-token"
        assert data["user"]["name"] == TEST_USER_NAME

    def test_login_rejects_invalid_credentials(self, client):
        """POST /api/auth/login should 401 for wrong password."""
        with patch(
            "services.supabase_client.sign_in_user",
            new_callable=AsyncMock,
            side_effect=Exception("Invalid login credentials"),
        ):
            response = client.post(
                "/api/auth/login",
                json={
                    "email": TEST_EMAIL,
                    "password": "wrong-password",
                },
            )

        assert response.status_code == 401


class TestProfileCRUD:
    """Verify profile retrieval and update."""

    def test_get_profile_returns_user_data(self, client):
        """GET /api/auth/profile should return UserProfileResponse."""
        with patch(
            "services.supabase_client.get_user_profile",
            new_callable=AsyncMock,
            return_value={
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
            },
        ):
            response = client.get(
                "/api/auth/profile",
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == TEST_USER_NAME
        assert data["email"] == TEST_EMAIL
        assert data["streak_days"] == 3

    def test_get_profile_returns_404_if_missing(self, client):
        """GET /api/auth/profile should 404 if profile doesn't exist."""
        with patch(
            "services.supabase_client.get_user_profile",
            new_callable=AsyncMock,
            return_value=None,
        ):
            response = client.get(
                "/api/auth/profile",
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 404

    def test_update_profile_persists_changes(self, client):
        """PUT /api/auth/profile should update and return profile."""
        with patch(
            "services.supabase_client.get_user_profile",
            new_callable=AsyncMock,
            return_value={
                "id": TEST_USER_ID, "email": TEST_EMAIL,
                "name": TEST_USER_NAME, "username": "testuser",
                "age": 25, "gender": "male", "total_xp": 0,
                "streak_days": 0,
            },
        ), patch(
            "services.supabase_client.update_user_profile",
            new_callable=AsyncMock,
            return_value={
                "id": TEST_USER_ID, "bio": "Updated bio",
                "name": TEST_USER_NAME, "email": TEST_EMAIL,
                "username": "testuser", "age": 25, "gender": "male",
            },
        ) as mock_update:
            response = client.put(
                "/api/auth/profile",
                json={"bio": "Updated bio"},
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        mock_update.assert_awaited_once()


class TestAuthGuard:
    """Verify auth middleware rejects unauthorized requests."""

    def test_protected_endpoint_rejects_no_token(self):
        """Endpoints should return 403 without auth header."""
        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def _test_lifespan(app):
            yield

        with patch("main.lifespan", _test_lifespan), \
             patch("config.settings.get_settings", return_value=MockSettings()):
            from fastapi.testclient import TestClient
            from main import app
            app.router.lifespan_context = _test_lifespan

            with TestClient(app) as c:
                response = c.get("/api/auth/profile")
                # HTTPBearer returns 403 when no Authorization header is present
                assert response.status_code == 403
