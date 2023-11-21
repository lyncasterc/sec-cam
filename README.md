# SecCam
Remotely accessible camera system using WebRTC.

This application was built as a test system to be used in larger college captsone project, which aims to investigate the security of the [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) technology and its potential to be used in camera surveillance systems.

## Application Concept
- A user "buys" one of our cameras (to simplify the project, I wrote a Python script that can be run on any computer with a camera, such as a Raspberry Pi with a camera module.)
- The user then registers an account on our website using a unique identifier for the camera, which is provided to them.
- The user connects the camera to a network.
- The user can log on from anywhere and activate the camera, allowing the user to view the camera's feed remotely.

### Components 
I seperate this appication into 4 logical components:
 #### The frontend
 - As the purpose of this application was not to develop a full-featured frontend, I kept it very simple, using [EJS](https://ejs.co/) for simple templating. Here's an [example](https://github.com/lyncasterc/sec-cam/blob/main/web/views/camera-setup.ejs).
 - 
#### The backend
#### The [signal server](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#the_signaling_server) (aka signal channel).
#### The camera
 
[README in progress]
