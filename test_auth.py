import asyncio
import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL", "")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

async def main():
    if not url or not key:
        return
    client = create_client(url, key)
    print(dir(client.auth.admin))

if __name__ == "__main__":
    asyncio.run(main())
