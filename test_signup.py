import asyncio
from realtime_communication.services.supabase_client import get_auth_client
import uuid

async def test_signup():
    auth = get_auth_client()
    random_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    print(f"Testing signup with new email: {random_email}")
    try:
        res = auth.auth.sign_up({
            "email": random_email,
            "password": "Password123!"
        })
        print("Success:", res)
    except Exception as e:
        print("Exception type:", type(e))
        print("Exception str:", str(e))

if __name__ == "__main__":
    asyncio.run(test_signup())
