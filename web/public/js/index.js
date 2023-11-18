/* eslint-disable no-undef */

const ws = new WebSocket(`wss://${window.location.host}`);
const viewBtns = document.querySelectorAll('.view-btn');
const remoteVideo = document.querySelector('.remote-video');
const camerasContainer = document.querySelector('.cameras-container');
const config = {
  iceServers: [...turnIceServers, { urls: 'stun:stun.l.google.com:19302' }],
};
const loader = document.querySelector('.loader');
const logoutBtn = document.querySelector('.logout-btn');
const pc = new RTCPeerConnection(config);
let selectedCameraId;

/**
 * Sets the status of the cameras by making a POST request to the '/api/camera-status' endpoint
 * and updating the corresponding HTML elements with the status information.
 * @param {Array} cameras - An array of camera objects.
 * @returns {Promise<void>} - A Promise that resolves
 * when the status of all cameras has been updated.
 */
async function setCamerasStatuses(cameras) {
  try {
    const response = await fetch('/api/camera-status', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cameras }),
    });

    const camerasStatuses = await response.json();

    camerasStatuses.forEach((cameraStatus) => {
      const cameraStatusElement = document.querySelector(`.camera-container[data-cameraId="${cameraStatus.id}"] .camera-status`);

      if (cameraStatus.isConnected) {
        cameraStatusElement.classList.add('connected');
      } else {
        cameraStatusElement.classList.remove('connected');
      }
    });
  } catch (error) {
    console.error(error);
  }
}

// send a register message to the signal channel when the connection is opened
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({
    type: 'register',
    sender: user.username,
    target: 'server',
    clientType: 'user',
    data: {
      token: user.token,
      inRegistrationProcess: false,
      registeredCameras: cameras.map((camera) => camera.id),
    },
  }));
});

// setting the remoteVideo srcObject when a remote track is received
pc.ontrack = ({ track, streams }) => {
  console.log('Got remote track and streams:');

  if (remoteVideo.srcObject) {
    return;
  }

  [remoteVideo.srcObject] = streams;

  loader.classList.add('hide');
  remoteVideo.parentElement.classList.remove('hide');
  camerasContainer.classList.add('hide');
};

// sending ice candidates to the camera through the signal channel
pc.onicecandidate = ({ candidate }) => {
  if (candidate) {
    ws.send(JSON.stringify({
      type: 'ice-candidate',
      sender: user.username,
      target: selectedCameraId,
      clientType: 'user',
      data: candidate,
    }));
  }
};

// sending the offer to the camera through the signal channel,
// starting the WebRTC negotiation process
viewBtns.forEach((viewBtn) => {
  viewBtn.addEventListener('click', async () => {
    selectedCameraId = viewBtn.parentElement.dataset.cameraid;
    loader.classList.remove('hide');
    viewBtn.disabled = true;

    try {
      pc.addTransceiver('video', { direction: 'recvonly' });

      const offer = await pc.createOffer();

      await pc.setLocalDescription(offer);

      console.log('Sending offer to camera: ', selectedCameraId);

      ws.send(JSON.stringify({
        type: 'offer',
        sender: user.username,
        target: selectedCameraId,
        clientType: 'user',
        data: pc.localDescription,
      }));
    } catch (error) {
      console.error('Error creating offer: ', error);
    }
  });
});

logoutBtn.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok && response.redirected) {
      window.location.href = response.url;
    } else {
      console.error('Failed to logout');
    }
  } catch (error) {
    console.error(error);
  }
});

// handling answer or ice candidates from camera

ws.addEventListener('message', async (event) => {
  console.log('Got message from signaling server');

  const parsedData = JSON.parse(event.data);
  const { type } = parsedData;

  try {
    if (type === 'answer') {
      const { data } = parsedData;
      const answer = new RTCSessionDescription(data);
      await pc.setRemoteDescription(answer);
    } else if (type === 'ice-candidate') {
      const { data } = parsedData;
      const candidate = new RTCIceCandidate(data);
      await pc.addIceCandidate(candidate);
    } else {
      console.warn('Unrecognized message type:', type);
    }
  } catch (err) {
    console.error('Failed to handle message', err);
  }
});

setCamerasStatuses(cameras);

// setting the status of the cameras every 10 seconds
setInterval(async () => {
  await setCamerasStatuses(cameras);
}, 10000);
