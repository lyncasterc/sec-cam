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
import requests

load_dotenv()

shared_secret = os.getenv('SHARED_SECRET')
server = os.getenv('SERVER')
metered_api_key = os.getenv('METERED_API_KEY')
ws_server = f'ws://{server}'
camera_id = os.getenv('CAMERA_ID')

def get_ice_servers():
    """
    Retrieves ICE servers from the Metered API and returns them as a list of RTCIceServer objects.
    """
    response = requests.get(f'https://sec-cam.metered.live/api/v1/turn/credentials?apiKey={metered_api_key}')
    data = response.json()
    
    ice_servers = [RTCIceServer(urls='stun:stun.l.google.com:19302')]
    
    for ice_server in data:
        ice_servers.append(RTCIceServer(
            urls=ice_server.get('urls'),
            credential=ice_server.get('credential'),
            username=ice_server.get('username')
        ))
    
    return ice_servers

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

def parse_ice_candidate(candidate_string):
    """
    Parses an ICE candidate string and returns a dictionary with its components.

    Args:
        candidate_string (str): The ICE candidate string to parse.

    Returns:
        dict: A dictionary with the following keys:
            - foundation (int): The candidate's foundation.
            - component (int): The candidate's component ID.
            - protocol (str): The candidate's transport protocol.
            - priority (int): The candidate's priority value.
            - ip (str): The candidate's IP address.
            - port (int): The candidate's port number.
            - type (str): The candidate's type (host, srflx, prflx, relay).

    Raises:
        ValueError: If the candidate string is invalid.
    """
    pattern = re.compile(
        r'candidate:(?P<foundation>\d+) '
        r'(?P<component>\d+) '
        r'(?P<protocol>\S+) '
        r'(?P<priority>\d+) '
        r'(?P<ip>\S+) '
        r'(?P<port>\d+) '
        r'typ (?P<type>\S+)'
    )
    match = pattern.match(candidate_string)
    if match:
        return match.groupdict()
    else:
        raise ValueError("Invalid ICE candidate string")
    
def create_peer_connection(config, websocket, user_id, camera_id):
    """
    Creates a new RTCPeerConnection object with the given configuration and sets up event handlers for
    icecandidate and track events. When an icecandidate event is fired, the function sends the candidate
    to the server via a websocket. When a track event is fired, the function prints a message to the console.
    
    Args:
        config (RTCConfiguration): An RTCConfiguration object containing the configuration options for the peer connection.
        websocket (WebSocket): A WebSocket object used to send ICE candidates to the server.
        user_id (str): A string representing the user ID of the camera.
        camera_id (str): A string representing the ID of the camera.
    
    Returns:
        RTCPeerConnection: An RTCPeerConnection object with the specified configuration and event handlers.
    """
    pc = RTCPeerConnection(configuration=config)
    
    @pc.on("icecandidate")
    async def on_icecandidate(event):
        if event.candidate:
            await websocket.send(json.dumps({
                'type': 'ice-candidate',
                'target': user_id,
                'sender': camera_id,
                'clientType': 'camera',
                'data': event.candidate
            }))
            print("sent ice candidate")
    
    # this shouldn't be necessary since we are only sending video
    @pc.on("track")
    def on_track(track):
        print(f"Track {track.kind} received")
    
    return pc

async def main():
    config = RTCConfiguration(iceServers=get_ice_servers())
    pc = None
    user_id = None
    
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
                # TODO: should camera also check if server sends back the correct HMAC signature?
                if response['type'] == 'camera-register-ack':
                    print('ack received. camera registered.')
                    
                    # this loop keeps the ws connection alive and listens for incoming messages
                    while True:
                        try:
                            message = await websocket.recv()
                            parsed_message = json.loads(message)
                            request_type = parsed_message['type']
                            
                            if request_type == 'offer':
                                # macOS specific - needs to be changed on other platforms
                                player = MediaPlayer('default:none', format='avfoundation', options={
                                    'video_size': '640x480', 
                                    'framerate': '30'
                                })
                                
                                offer = RTCSessionDescription(sdp=parsed_message['data']['sdp'], type='offer')
                                
                                if not user_id:
                                    user_id = parsed_message['sender']
                                
                                if not pc:
                                    pc = create_peer_connection(config, websocket, user_id, camera_id)
                                    print('created peer connection')

                                print("received offer, ", parsed_message['data'])
                                
                                if player:
                                    pc.addTrack(player.video)
                                    
                                # setting remote description
                                try:
                                    await pc.setRemoteDescription(offer)
                                    print("set remote description")
                                except Exception as e:
                                    print(f"error setting remote description: {e}")
                                    traceback.print_exc()
                                    break

                                #  answer
                                try:
                                    answer = await pc.createAnswer()
                                    print("created answer", answer)
                                except Exception as e:
                                    print(f"error creating answer: {e}")
                                    traceback.print_exc()
                                    break
                                
                                # setting local description
                                try: 
                                    await pc.setLocalDescription(answer)
                                    print("set local description")
                                except Exception as e:
                                    print(f"error setting local description: {e}")
                                    traceback.print_exc()
                                    break
                                
                                # send answer
                                
                                try:  
                                    await websocket.send(json.dumps({
                                        'type': 'answer',
                                        'target': user_id,
                                        'sender': camera_id,
                                        'clientType': 'camera',
                                        'data': {
                                            'sdp': pc.localDescription.sdp,
                                            'type': pc.localDescription.type
                                        }
                                    }))
                                    
                                    print("sent answer") 
                                except Exception as e: 
                                    print(f"error sending answer: {e}")
                                    traceback.print_exc()
                                    break
                                
                            elif request_type == 'ice-candidate':
                                candidate_data = parsed_message['data']
                                parsed_candidate_info = parse_ice_candidate(candidate_data['candidate'])
                                
                                if not user_id:
                                    user_id = parsed_message['sender']
                                
                                if not pc:
                                    pc = create_peer_connection(config, websocket, user_id, camera_id)
                                    print('created peer connection')

                                print("received ice candidate", parsed_candidate_info)
                                
                                ice_candidate = RTCIceCandidate(
                                    sdpMid=candidate_data['sdpMid'],
                                    sdpMLineIndex=candidate_data['sdpMLineIndex'],
                                    foundation=parsed_candidate_info['foundation'],
                                    component=int(parsed_candidate_info['component']),
                                    protocol=parsed_candidate_info['protocol'],
                                    priority=int(parsed_candidate_info['priority']),
                                    ip=parsed_candidate_info['ip'],
                                    port=int(parsed_candidate_info['port']),
                                    type=parsed_candidate_info['type'],
                                )
                                
                                # adding ice candidates
                                try :
                                    await pc.addIceCandidate(ice_candidate)
                                    print("added ice candidate")
                                except Exception as e:
                                    print(f"error adding ice candidate: {e}")
                                    traceback.print_exc()
                                    break
                        
                            elif request_type == 'close-webrtc':
                                if pc:
                                    await pc.close()
                                    pc = None
                                    print("closing webrtc")

                        except ConnectionClosed:
                            print("connection closed")
                            break
                    
                    if pc:
                        await pc.close()
                        pc = None
        except Exception as e:
            print(f"connection failed: {e}")
            traceback.print_exc()
            
            print("retrying in 5 seconds...")
            await asyncio.sleep(5)

asyncio.run(main())
