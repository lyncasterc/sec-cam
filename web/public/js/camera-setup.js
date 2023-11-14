/* eslint-disable no-alert */
/* eslint-disable no-undef */

if (remainingTime > 0) {
  setTimeout(() => {
    window.location.href = '/register/session-expired';
  }, remainingTime);
} else {
  window.location.href = '/register/session-expired';
}

const ws = new WebSocket(`wss://${window.location.host}`);
const testBtn = document.querySelector('.test-btn');
const cameraStatus = document.querySelector('.camera-status');
const nextBtn = document.querySelector('.next-btn');
const cancelBtn = document.querySelector('.cancel-btn');
const cameraStatusMessage = document.querySelector('.camera-status-message');

/**
 * Sends a request to the server to cancel the registration process.
 * If the request is successful, the user is redirected to the registration page.
 *
 * @returns {Promise<void>}
 */
async function cancelRegistration() {
  const response = await fetch('/register/cancel', {
    method: 'DELETE',
    credentials: 'include',
  });

  if (response.redirected) {
    window.location.href = response.url;
  }
}

// send a register message to the signal channel when the connection is opened
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({
    type: 'register',
    sender: username,
    target: 'server',
    clientType: 'user',
    data: {
      token,
      inRegistrationProcess: true,
    },
  }));
});

// send the camera-setup message to the signal channel
testBtn.addEventListener('click', () => {
  cameraStatus.classList.add('loading');

  ws.send(JSON.stringify({
    type: 'camera-setup',
    sender: username,
    target: 'server',
    data: {
      cameraId,
      token,
    },
  }));
});

// handle cancel button click.
cancelBtn.addEventListener('click', async () => {
  // confirm cancel

  // eslint-disable-next-line no-restricted-globals
  if (confirm('If you cancel now, you will have to start the registration process over. Are you sure you want to cancel?')) {
    await cancelRegistration();
  }
});

// handle next button click.
// this completes the registration process.
nextBtn.addEventListener('click', async () => {
  const response = await fetch('/register/confirm', {
    method: 'POST',
    credentials: 'include',
    data: {
      cameraId,
      username,
    },
  });

  if (response.redirected) {
    window.location.href = response.url;
  }

  // if response is not redirected, show alert, cancel registration

  alert('Something went wrong. Please try registering again.');

  await cancelRegistration();
});

// handle messages from the signal channel
ws.addEventListener('message', (event) => {
  const parsedMessage = JSON.parse(event.data);
  const { type } = parsedMessage;

  if (type === 'camera-setup-success') {
    cameraStatus.classList.remove('loading');
    cameraStatus.classList.add('connected');
    cameraStatusMessage.textContent = 'Camera connected!';
    nextBtn.classList.add('show');
    testBtn.disabled = true;
  } else if (type === 'camera-setup-error') {
    cameraStatus.classList.remove('loading');
    cameraStatusMessage.textContent = 'Camera not found.';
    nextBtn.classList.remove('show');
  }
});
