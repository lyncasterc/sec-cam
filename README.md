# SecCam
Remotely accessible camera system using WebRTC.

SecCam is a test system designed for a college capstone project. It explores the security and applicability of [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) in camera surveillance systems, demonstrating a practical implementation of this technology.

## Application Concept
- A user "buys" one of our cameras. For testing purposes, we've developed a Python script compatible with any standard computer equipped with a camera, such as a Raspberry Pi with a camera module
- The user then registers an account on our website using a unique identifier for the camera, which is provided to them.
- After connecting the camera to a network, the user can log on from anywhere and activate the camera to remotely view the feed.
  
## Components 
I separate this application into 4 logical components:
 ### The frontend
 - The frontend is intentionally kept simple, focusing primarily on functionality rather than extensive design. It utilizes [EJS](https://ejs.co/) for straightforward templating and fairly minimal CSS styling. For a glimpse into the frontend design, see the [camera setup view](https://github.com/lyncasterc/sec-cam/blob/main/web/views/camera-setup.ejs).
- A significant portion of the frontend's capabilities is dedicated to handling the WebRTC logic. This is primarily executed in the JavaScript file located at [/web/public/js/index.js](https://github.com/lyncasterc/sec-cam/blob/main/web/public/js/index.js).
	- In this script, a WebSocket connection is established with the signal server. This connection is pivotal for initiating and managing the WebRTC negotiation process. The script sends a WebRTC offer to the camera via the signal server and also handles the exchange of [ICE candidates](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate) .
	- The script also includes functions to handle various aspects of WebRTC communication, such as setting the status of the cameras, managing the peer connection for receiving remote video tracks, and processing ICE candidates and session descriptions (offers and answers) received from the signal server. 
### The backend
- The backend was developed using Express and MongoDB. 
- Authentication is managed using [express-session](https://expressjs.com/en/resources/middleware/session.html) for session control and bcrypt for password hashing. This combination enhances security by safeguarding user credentials and maintaining session integrity. An example implementation can be viewed in the [login route](https://github.com/lyncasterc/sec-cam/blob/main/web/routes/login.js).
- Input validation is performed using [express-validator](https://express-validator.github.io/docs), which is integrated into routes like the login route to ensure that user inputs are correctly formatted and safe.
- The backend also interacts with [Open Relay's](https://www.metered.ca/tools/openrelay/) TURN server API, which is a crucial component for supporting WebRTC connections in environments where direct peer-to-peer communication is challenging.
### The [signal server](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#the_signaling_server) (aka signal channel).
- The `SignalChannel` class represents a WebSocket server essential for communication between users and cameras in the SecCam project. This server facilitates the initial connection necessary for establishing a WebRTC peer-to-peer communication.
- It has two main properties: `userClients` and `cameraClients`, which store the connected user and camera clients, respectively.
- The `initialize` method sets up the WebSocket server, listening for connections and handling incoming messages, errors, and disconnections.
- Key Message Types Handled by `SignalChannel`:
    - **Register**: Upon initial connection, both users and cameras send a `register` message. This is used to authenticate and store their WebSocket connection objects. A HMAC system is implemented to verify the legitimacy of these connections.
    - **Camera Setup**: This message type checks if a particular camera has been registered and communicates the status to the user.
    - **Ice Candidate**: Facilitates the relay of ICE candidates between the user and the camera.
    - **Offer and Answer**: Handles the exchange of WebRTC offers and answers between users and cameras. Offers are sent from users to cameras, and answers are sent from cameras to users.
- The class also includes methods for message handling (`onMessage`), connection closure (`onClose`), camera token validation (`validateCameraToken`), and checking camera connection status (`isCameraConnected`).
### The camera
- The camera component of the project is implemented in Python. The script uses several libraries, such as `aiortc` for WebRTC functionalities, `websockets` for communication with the signal server, and `asyncio` for asynchronous programming.
- The process begins with the camera establishing a WebSocket connection to the signal server. It registers itself using a unique camera ID and an HMAC signature for authentication.
- The script is designed to respond to specific message types sent by the signal server:
    - **Offer**: When an offer message is received from a user, the script sets up a WebRTC peer connection. This includes creating and sending an answer back to the user through the signal server.
    - **Ice Candidate**: The script handles the reception of ICE candidates from the user, adding them to the peer connection to facilitate the establishment of a peer-to-peer connection.
    - **Close WebRTC**: This message triggers the closing of the WebRTC connection.
- The script also includes a function to retrieve ICE servers from the Metered API, which are used in the WebRTC configuration.
