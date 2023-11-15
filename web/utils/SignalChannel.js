/* eslint-disable no-param-reassign */
import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import userService from '../services/user-service.js';
import config from './config.js';

/**
 * SignalChannel class represents a WebSocket server
 * that handles communication between users and cameras.
 * @class SignalChannel
 * @property {WebSocketServer} wss - The WebSocket server instance.
 * @property {Object} userClients - An object containing connected user clients.
 * @property {Object} cameraClients - An object containing connected camera clients.
 */
class SignalChannel {
  constructor(server) {
    this.wss = new WebSocketServer({ server });
    this.userClients = {};
    this.cameraClients = {};
  }

  initialize() {
    this.wss.on('connection', this.onConnection.bind(this));
    this.wss.on('listening', () => {
      console.log('Signal channel listening...');
    });
  }

  onConnection(ws) {
    ws.on('message', this.onMessage.bind(this, ws));
    ws.on('close', this.onClose(ws));
    ws.on('error', (error) => {
      console.error(`WebSocket error: ${error.message}`);
    });
  }

  /**
   * Message types:
   * - *camera-setup*
   *    - purpose: Finds and communicates to user if their camera has already been registered
   *    - message: {
          * type: 'camera-setup',
          * sender: string,
          * target: 'server',
          * clientType: 'user',
          * data: {
            * cameraId,
            * token,
        * }
   *  }
   *    - response: { type, sender, target }
   *      -  response types: camera-setup-success, camera-setup-error
   *
   *
   * - *register*
   *    - purpose: Registers a user or camera upon first connection
   *    - userMessage: {
          * type: 'register'
          * sender: string
          * target: 'server'
          * clientType: string
          * data: {
            * token: string
            * inRegistrationProcess: boolean
        * }
        *}
        *
        * - cameraMessage: {
          * type: 'register'
          * sender: string
          * target: 'server'
          * clientType: 'camera'
          * data: {
            * token: string
          }
        }
   * @param {*} ws
   * @param {*} message
   */
  async onMessage(ws, message) {
    const parsedMessage = JSON.parse(message);
    const { type, sender, clientType } = parsedMessage;

    if (type === 'register') {
      if (clientType === 'user') {
        const { token } = parsedMessage.data;
        const isUserMessageTokenValid = await userService.validateUserMessageToken(sender, token);

        if (isUserMessageTokenValid) {
          ws.clientType = clientType;
          ws.id = sender;
          ws.verified = !parsedMessage.data.inRegistrationProcess;
          this.userClients[sender] = ws;

          console.log('Registered user: ', sender);
        } else {
          // close connection
          console.log('User registration error - unauthorized: ', sender);
          ws.close();
        }
      } else if (clientType === 'camera') {
        const { token } = parsedMessage.data;

        if (this.validateCameraToken(sender, token)) {
          ws.clientType = clientType;
          ws.id = sender;
          this.cameraClients[sender] = ws;

          console.log('Registered camera: ', sender);

          // send ack to camera

          const response = {
            type: 'camera-register-ack',
            sender: 'server',
            target: sender,
          };

          console.log('Sending camera register ack: ', response);

          ws.send(JSON.stringify(response));
        } else {
          // close connection
          console.log('Camera registration error - unauthorized: ', sender);
          ws.close();
        }
      }
    } else if (type === 'camera-setup') {
      const { cameraId, token } = parsedMessage.data;
      const isUserMessageTokenValid = await userService.validateUserMessageToken(sender, token);

      if (isUserMessageTokenValid) {
        let responseType;

        if (this.cameraClients[cameraId]) {
          responseType = 'camera-setup-success';
        } else {
          responseType = 'camera-setup-error';
        }

        const response = {
          type: responseType,
          sender: 'server',
          target: sender,
        };

        console.log('Sending camera setup response: ', response);
        ws.send(JSON.stringify(response));
      } else {
        // close unauthorized connection
        console.log('Camera setup error - unauthorized: ', sender);
        ws.close();
      }
    }
  }

  onClose(ws) {
    return () => {
      console.log(`Client disconnected: ${ws.id}`);

      if (ws.clientType === 'user') {
        delete this.userClients[ws.id];
      } else if (ws.clientType === 'camera') {
        delete this.cameraClients[ws.id];
      }
    };
  }

  /**
   * Validates the camera token.
   * @param {string} cameraId - The ID of the camera.
   * @param {string} token - The token to be validated.
   * @returns {boolean} - Returns true if the token is valid, false otherwise.
   */
  // eslint-disable-next-line class-methods-use-this
  validateCameraToken(cameraId, token) {
    const hmac = crypto.createHmac('sha256', config.SHARED_SECRET);
    hmac.update(cameraId);

    const expectedToken = hmac.digest('hex');

    return token === expectedToken;
  }

  /**
   * Checks if a camera is connected.
   * @param {string} cameraId - The ID of the camera to check.
   * @returns {boolean} Returns true if the camera is connected, false otherwise.
   */
  isCameraConnected(cameraId) {
    return !!this.cameraClients[cameraId];
  }
}

export default SignalChannel;
