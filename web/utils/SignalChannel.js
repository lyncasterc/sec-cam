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
          * clientType: 'user' | 'camera'
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
    * - *ice-candidate*
    *    - purpose: Relays ice candidates to the other client
    *    - message: {
    *       type: 'ice-candidate',
    *       sender: string,
    *       target: 'user' | 'camera',
    *       clientType: 'user' | 'camera',
    *       data: { candidate }
    *   }
    *
    * - *offer*
    *     - purpose: Relays offers from users to cameras
      *  - message: {
      *      type: 'offer',
      *       sender: string,
      *       target: string,
      *       clientType: 'user',
      *       data: { offer }
      *   }

  * - *answer*
  *     - purpose: Relays answers from cameras to users
    *   - message: {
    *     type: 'answer',
    *     sender: string,
    *     target: string,
    *     clientType: 'camera',
    *     data: { answer }
    *   }
   * @param {*} ws
   * @param {*} message
   */
  async onMessage(ws, message) {
    const parsedMessage = JSON.parse(message);
    const {
      type, sender, clientType, target,
    } = parsedMessage;

    if (type === 'register') {
      if (clientType === 'user') {
        const { token } = parsedMessage.data;
        const isUserMessageTokenValid = await userService.validateUserMessageToken(sender, token);

        if (isUserMessageTokenValid) {
          ws.clientType = clientType;
          ws.id = sender;
          ws.verified = !parsedMessage.data.inRegistrationProcess;
          ws.registeredCameras = parsedMessage.data.registeredCameras;
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
      const camera = this.cameraClients[cameraId];

      if (isUserMessageTokenValid) {
        let responseType;

        if (camera) {
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
    } else {
      // drop connections if connection hasn't been registered/verified
      // eslint-disable-next-line no-lonely-if
      if (!ws.id || !ws.id === sender) {
        console.log('Message error - unauthorized');
        ws.close();
        // eslint-disable-next-line no-useless-return
        return;
      }

      // handling the rest of the message types.
      // connections past this point can be assumed to be verified

      switch (type) {
        case 'ice-candidate': {
          let targetClient;

          // if the sender is a user, the target must be a camera and vice versa
          if (clientType === 'user') {
            try {
              if (await userService.isUserAuthorizedForCamera(sender, target)) {
                targetClient = this.cameraClients[target];
              }
            } catch (error) {
              console.error('Ice candidate error: ', error);
            }
          } else if (clientType === 'camera') {
            targetClient = this.userClients[target];
          }

          if (!targetClient) {
            console.log('Target client not found: ', target);
            return;
          }

          console.log('Sending ice candidate to target: ', target);

          targetClient.send(message);
          break;
        }

        case 'offer': {
          // only users should be able to send offers but we'll check anyway
          if (clientType === 'user') {
            try {
              if (await userService.isUserAuthorizedForCamera(sender, target)) {
                const camera = this.cameraClients[target];

                if (!camera) {
                  console.log('Camera not found: ', target);
                  return;
                }

                console.log('Sending offer to camera: ', target);
                camera.send(message);
              } else {
                console.log('Offer error - unauthorized: ', sender);
              }
            } catch (error) {
              console.error('Offer error: ', error);
            }
          }

          break;
        }

        case 'answer': {
          // only cameras should be able to send answers but we'll check anyway
          if (clientType === 'camera') {
            try {
              if (await userService.isUserAuthorizedForCamera(target, sender)) {
                const user = this.userClients[target];

                if (!user) {
                  console.log('User not found: ', target);
                  return;
                }

                console.log('Sending answer to user: ', target);

                user.send(JSON.stringify(parsedMessage));
              } else {
                console.log('Answer error - unauthorized: ', sender);
              }
            } catch (error) {
              console.error('Answer error: ', error);
            }
          }

          break;
        }

        default: {
          console.log('Message error - unknown type');
          ws.close();
        }
      }
    }
  }

  onClose(ws) {
    return () => {
      console.log(`Client disconnected: ${ws.id ?? 'unknown'}`);

      if (ws.clientType === 'user') {
        // close all of the user's camera connections
        if (ws.registeredCameras) {
          ws.registeredCameras.forEach((cameraId) => {
            const camera = this.cameraClients[cameraId];

            if (camera) {
              camera.send(JSON.stringify({
                type: 'close-webrtc',
                sender: 'server',
                target: cameraId,
              }));
            }
          });
        }

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
