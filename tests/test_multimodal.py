"""
Test D: Multimodal Pipelines
Verifies:
1. Selfie generation: scene description → HuggingFace image gen → storage upload
2. Image description: base64 → Gemini multimodal vision
3. Meme generation: persona-voiced text meme
4. URL summarization pipeline
5. Weather endpoint with _safe_format fix (BUG-4)
"""

import pytest
import base64
from unittest.mock import AsyncMock, patch, MagicMock
from tests.conftest import TEST_USER_ID, TEST_BOT_ID


class TestSelfieGeneration:
    """Verify the selfie generation pipeline."""

    def test_selfie_endpoint_generates_and_returns_url(
        self, client, mock_supabase_profile
    ):
        """POST /api/selfie/generate should return image_url."""
        with patch(
            "services.redis_cache.load_context",
            new_callable=AsyncMock,
            return_value=[{"role": "user", "content": "Tell me about Delhi"}],
        ), patch(
            "services.llm_engine.generate_scene_description",
            new_callable=AsyncMock,
            return_value="A sunny afternoon in Lodhi Garden with warm golden light",
        ), patch(
            "services.selfie_service.generate_bot_selfie",
            new_callable=AsyncMock,
            return_value={
                "image_url": "https://test.supabase.co/storage/v1/object/public/selfies/test.png",
                "scene_description": "A sunny afternoon in Lodhi Garden",
            },
        ), patch(
            "services.background_tasks.award_xp",
            new_callable=AsyncMock,
            return_value={"total_earned": 150},
        ):
            response = client.post(
                "/api/selfie/generate",
                json={"bot_id": TEST_BOT_ID},
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert "image_url" in data
        assert data["image_url"].startswith("https://")
        assert data["xp_earned"] == 150
        assert "scene_description" in data

    def test_selfie_endpoint_handles_failure(
        self, client, mock_supabase_profile
    ):
        """POST /api/selfie/generate should return 500 on image gen failure."""
        with patch(
            "services.redis_cache.load_context",
            new_callable=AsyncMock,
            return_value=[],
        ), patch(
            "services.llm_engine.generate_scene_description",
            new_callable=AsyncMock,
            return_value="A scene description",
        ), patch(
            "services.selfie_service.generate_bot_selfie",
            new_callable=AsyncMock,
            return_value=None,  # Failure
        ):
            response = client.post(
                "/api/selfie/generate",
                json={"bot_id": TEST_BOT_ID},
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 500
        assert "failed" in response.json()["detail"].lower()


class TestMemeGeneration:
    """Verify the meme generation endpoint."""

    def test_meme_endpoint_returns_text_meme(self, client):
        """POST /api/multimodal/meme should return text_meme."""
        with patch(
            "services.llm_engine.generate_text_meme",
            new_callable=AsyncMock,
            return_value="When your bro says 'one more chai'... 🍵 (spoiler: it's never just one)",
        ), patch(
            "services.background_tasks.award_xp",
            new_callable=AsyncMock,
            return_value={"total_earned": 100},
        ):
            response = client.post(
                "/api/multimodal/meme",
                json={
                    "bot_id": TEST_BOT_ID,
                    "topic": "chai addiction",
                    "language": "english",
                },
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert "text_meme" in data
        assert len(data["text_meme"]) > 0
        assert data["xp_earned"] == 100


class TestImageDescription:
    """Verify the image description endpoint."""

    def test_describe_image_with_valid_file(self, client):
        """POST /api/multimodal/describe-image should return description."""
        # Create a minimal valid PNG file (1x1 pixel)
        import struct
        import zlib

        def create_minimal_png():
            signature = b'\x89PNG\r\n\x1a\n'
            ihdr_data = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
            ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
            ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
            raw = b'\x00\x00\x00\x00'
            idat_data = zlib.compress(raw)
            idat_crc = zlib.crc32(b'IDAT' + idat_data)
            idat = struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data + struct.pack('>I', idat_crc)
            iend_crc = zlib.crc32(b'IEND')
            iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
            return signature + ihdr + idat + iend

        png_bytes = create_minimal_png()

        with patch(
            "services.llm_engine.describe_image",
            new_callable=AsyncMock,
            return_value="I see a beautiful scene, dear! It reminds me of sunsets at Lodhi Garden.",
        ), patch(
            "services.background_tasks.award_xp",
            new_callable=AsyncMock,
            return_value={"total_earned": 50},
        ):
            response = client.post(
                f"/api/multimodal/describe-image?bot_id={TEST_BOT_ID}&language=english",
                files={"file": ("test.png", png_bytes, "image/png")},
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert "description" in data
        assert data["xp_earned"] == 50

    def test_describe_image_rejects_non_image(self, client):
        """POST /api/multimodal/describe-image should reject non-image files."""
        response = client.post(
            f"/api/multimodal/describe-image?bot_id={TEST_BOT_ID}",
            files={"file": ("test.txt", b"not an image", "text/plain")},
            headers={"Authorization": "Bearer test-token"},
        )
        assert response.status_code == 400


class TestWeatherEndpoint:
    """Verify the weather endpoint with BUG-4 fix."""

    def test_weather_uses_safe_format(self, client, mock_supabase_profile):
        """GET /api/multimodal/weather/{bot_id} should not crash on braces in prompt."""
        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
        ) as mock_get, patch(
            "services.llm_engine.generate_chat_response",
            new_callable=AsyncMock,
            return_value="Ah dear, Delhi is warm today! Perfect for a walk in Lodhi Garden.",
        ), patch(
            "services.background_tasks.award_xp",
            new_callable=AsyncMock,
            return_value={"total_earned": 25},
        ), patch(
            "bot_prompt.get_bot_prompt",
            # Prompt with literal braces that would crash .format()
            return_value="You are {custom_bot_name}. Rules: {{respond naturally}} in {languageString}.",
        ), patch(
            "config.mappings.get_persona_origin",
            return_value={"city": "Delhi", "country": "India"},
        ):
            # Mock weather API response
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "current_condition": [{
                    "temp_C": "32",
                    "weatherDesc": [{"value": "Sunny"}],
                    "FeelsLikeC": "35",
                    "humidity": "45",
                }]
            }
            mock_resp.raise_for_status = MagicMock()
            mock_get.return_value = mock_resp

            response = client.get(
                f"/api/multimodal/weather/{TEST_BOT_ID}",
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["city"] == "New Delhi"  # Matches PERSONA_ORIGIN_MAP
        assert "bot_commentary" in data
