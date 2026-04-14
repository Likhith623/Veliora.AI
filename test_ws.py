import asyncio
import websockets

async def test():
    uri = "ws://localhost:8000/api/v1/games/live/ws/c818ac01-bcd1-4644-857c-e6482747f0c6/ebb16af5-e510-443b-b21c-71d7c51c73b1"
    try:
        async with websockets.connect(uri) as ws:
            print("Connected!")
            res = await ws.recv()
            print("RECV1:", res)
            await ws.send('{"type": "ready"}')
            res2 = await ws.recv()
            print("RECV2:", res2)
    except Exception as e:
        print("EXCEPTION:", str(e))

asyncio.run(test())
