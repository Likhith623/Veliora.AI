import asyncio
import httpx

async def run_test():
    async with httpx.AsyncClient() as client:
        res = await client.post("http://localhost:8000/api/auth/login", json={"email": "kingjames.08623@gmail.com", "password": "Likhith@123"})
        token = res.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test profiles/me
        try:
            res = await client.get("http://localhost:8000/api/v1/profiles/me", headers=headers)
            print("Status GET /me:", res.status_code)
            print("Response:", res.text)
        except Exception as e:
            print(e)
            
        # Test contests/active
        try:
            res = await client.get("http://localhost:8000/api/v1/contests/active", headers=headers)
            print("\nStatus POST /contests/active:", res.status_code)
            print("Response:", res.text)
        except Exception as e:
            print(e)

asyncio.run(run_test())
