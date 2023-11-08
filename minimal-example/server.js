const express = require('express');
const Websocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new Websocket.Server({ server });

app.use(express.static('public'));

const mockUsers = [
  {
    id: 'user-1',
    authorizedCameras: ['camera-1']
  }
];  

const userClients = {};
const cameraClients = {};

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const parsedMessage = JSON.parse(message);
    const type = parsedMessage.type;

    if (type === 'register') {
      const { id, clientType } = parsedMessage.data;
    
      ws.clientType = clientType;
      ws.id = id;

      if (clientType === 'user') {
        userClients[id] = ws;
      } else if (clientType === 'camera') {
        cameraClients[id] = ws;
      }

      console.log('Registered client: ', id, clientType);
    } else if (type === 'offer' && ws.clientType === 'user') {
      const userID = ws.id;
      const { target: cameraID, sender } = parsedMessage;

      if (userID === sender && isUserAuthorizedForCamera(userID, cameraID)) {
        const camera = cameraClients[cameraID];

        if (!camera) {
          console.log('Camera not found: ', cameraID);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'camera not found'
          }));
          return;
        }

        console.log('Sending offer to camera: ', cameraID);
        camera.send(message);
      } else {
        console.log('Offer error - unauthorized: ', userID);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'unauthorized'
        }));
      }
    } else if (type === 'answer' && ws.clientType === 'camera') {
      const cameraID = ws.id;
      const { target: userID, sender } = parsedMessage;

      if (cameraID === sender && isUserAuthorizedForCamera(userID, cameraID)) {
        const user = userClients[userID];

        if (!user) {
          console.log('User not found: ', userID);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'user not found'
          }));
          return;
        }

        console.log('Sending answer to user: ', userID);
        console.log('parsedMessage answer: ', parsedMessage)
        console.log('message answer: ', message)
        user.send(JSON.stringify(parsedMessage));
      } else {
        console.log('Answer error - unauthorized: ', cameraID);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'unauthorized'
        }));
      }
    } else if (type === 'ice-candidate') {
      const { target, sender } = parsedMessage;
      const client = (
          ws.clientType === 'user' && 
          ws.id === sender && 
          isUserAuthorizedForCamera(ws.id, target)
        ) ? cameraClients[target] : userClients[target];
    
      if (!client) {
        console.log('Client not found: ', target);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'client not found'
        }));
        return;
      }

      console.log('Sending ice candidate to: ', target);
      client.send(message);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${ws.id}`);
    // Remove the client from the userClients or cameraClients object
    if (ws.clientType === 'user' && userClients[ws.id]) {
      delete userClients[ws.id];
    } else if (ws.clientType === 'camera' && cameraClients[ws.id]) {
      delete cameraClients[ws.id];
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error: ${error.message}`);
  });
});

server.listen(8080, () => {
  console.log('Server started on port 8080');
});

wss.on('listening', () => {
  console.log('WebSocket server is running');
});

function isUserAuthorizedForCamera(userId, cameraId) {
  const user = mockUsers.find((user) => user.id === userId);
  return user && user.authorizedCameras.includes(cameraId);
}