import json
import asyncio
import websockets
from websockets.exceptions import ConnectionClosed
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, RTCIceServer, RTCIceCandidate
from aiortc.contrib.media import MediaPlayer
import traceback
import re

camera_id = 'camera-1'
user_id = None
ws_server = 'ws://<SERVER_GOES_HERE>'
stun_server = RTCIceServer(urls='stun:stun.l.google.com:19302')
config = RTCConfiguration(iceServers=[stun_server])


# Parse the ICE candidate components
def parse_ice_candidate(candidate_string):
    # Example candidate string:
    # candidate:4073744545 1 udp 2113937151 a5841d0f-51d8-4e53-9c4a-57b85568c764.local 61583 typ host generation 0 ufrag qRmg network-cost 999
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
    

async def start_ws_connection():
    pc = RTCPeerConnection(config)
    
    @pc.on("icecandidate")
    async def on_icecandidate(event):
        if event.candidate:
            await websocket.send(json.dumps({
                'type': 'ice-candidate',
                'target': user_id,
                'sender': camera_id,
                'data': event.candidate
            }))
            print("sent ice candidate")
    
    # this shouldn't be necessary since we are only sending video
    @pc.on("track")
    def on_track(track):
        print(f"Track {track.kind} received")
    
    try:
        async with websockets.connect(ws_server) as websocket:
            # register camera with ws server
            await websocket.send(json.dumps({
                'type': 'register',
                'data': {
                    'id': camera_id,
                    'clientType': 'camera'
                }
            }))
            
            print("registered camera")
            
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
                        user_id = parsed_message['sender']
                        print("received offer, ", parsed_message['data'])
                        
                        
                        if player:
                            pc.addTrack(player.video)
                        
                        await pc.setRemoteDescription(offer)
                        print("set remote description")
                        
                        #creating answer
                        
                        try:
                            answer = await pc.createAnswer()
                            print("created answer", answer)
                        except Exception as e:
                            print(f"error creating answer: {e}")
                            traceback.print_exc()
                            break
                            
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
                        
                        await pc.addIceCandidate(ice_candidate)
                        print("added ice candidate")
                except ConnectionClosed:
                    print(f"conenction closed")
                    break
                    
    except Exception as e:
        print(f"error: {e}")
        traceback.print_exc()
        
    await pc.close()
        

asyncio.run(start_ws_connection())
