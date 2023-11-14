import json
import asyncio
import websockets
from websockets.exceptions import ConnectionClosed
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, RTCIceServer, RTCIceCandidate
from aiortc.contrib.media import MediaPlayer
import traceback
import re
import os
from dotenv import load_dotenv
import hashlib
import hmac

load_dotenv()

shared_secret = os.getenv('SHARED_SECRET')
user_id = None
ws_server = 'ws://<SERVER_GOES_HERE>'
camera_id = os.getenv('CAMERA_ID')


import hmac
import hashlib

def create_hmac_signature(data, shared_secret):
    """
    Creates an HMAC signature for the given data using the specified shared secret.

    Args:
        data (str): The data to sign.
        shared_secret (str): The shared secret to use for signing.

    Returns:
        str: The HMAC signature as a hexadecimal string.
    """
    return hmac.new(shared_secret.encode('utf-8'), data.encode('utf-8'), hashlib.sha256).hexdigest()

async def main():
    # retrying initial WS connection every 5 seconds if it fails
    while True:
        try:
            async with websockets.connect(ws_server) as websocket:
                # register camera with ws server
                await websocket.send(json.dumps({
                    'type': 'register',
                    'sender': camera_id,
                    'target': 'server',
                    'clientType': 'camera',
                    'data': {
                        'token': create_hmac_signature(camera_id, shared_secret)
                    }
                }))
                response = await websocket.recv()
                response = json.loads(response)
                if response['type'] == 'camera-register-ack':
                    print('ack received. camera registered.')
                    while True:
                        try:
                            message = await websocket.recv()
                            parsed_message = json.loads(message)
                            request_type = parsed_message['type']
                        except ConnectionClosed:
                            print("connection closed")
                            break
        except Exception as e:
            print(f"connection failed: {e}")
            traceback.print_exc()
            await asyncio.sleep(5)

asyncio.run(main())
