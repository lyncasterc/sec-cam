from aiortc.contrib.media import MediaPlayer, MediaRecorder
import asyncio


async def test_camera():
    # this is macOS specific
    player = MediaPlayer('default:none', format='avfoundation', options={
        'video_size': '640x480', 
        'framerate': '30'
    })

    # Record a short clip to a file to test the camera
    recorder = MediaRecorder('test.mp4')
    
    video_stream = player.video
    if video_stream:
        recorder.addTrack(video_stream)
        
    await recorder.start()


    # Record for a few seconds then stop
    await asyncio.sleep(5)
    await recorder.stop()
    video_stream.stop()
    print("Test recording completed,check ./test.mp4")

asyncio.run(test_camera())