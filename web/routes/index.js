/* eslint-disable no-await-in-loop */
import express from 'express';
import { v4 } from 'uuid';
import { Camera } from '../mongo/index.js';
import { userService } from '../services/index.js';
import config from '../utils/config.js';

const router = express.Router();

router.get('/', async (req, res) => {
  if (req.session.user && req.session.user.isLoggedIn) {
    try {
      const cameras = await Camera.find({ owner: req.session.user.id });

      if (cameras && cameras.length > 0) {
        const camerasInfo = cameras.map((camera) => ({
          id: camera.cameraId,
          name: camera.name,
          owner: camera.owner,
        }));

        let iceServers = null;
        let attempts = 0;

        // attempt to fetch TURN server credentials 3 times
        while (attempts < 3) {
          const response = await fetch(`https://sec-cam.metered.live/api/v1/turn/credentials?apiKey=${config.METERED_API_KEY}`);

          if (response.ok) {
            iceServers = await response.json();
            break;
          } else {
            // eslint-disable-next-line no-plusplus
            attempts++;
            console.error(`Attempt ${attempts} to fetch TURN server credentials failed. Retrying...`);
          }
        }

        if (!iceServers) {
          throw new Error('Failed to fetch TURN server credentials after 3 attempts');
        }

        const token = v4();

        await userService.updateUserByUsername(
          req.session.user.username,
          { messageToken: token },
        );

        return res.render('index', {
          user: {
            ...req.session.user,
            token,
          },
          cameras: camerasInfo,
          iceServers,
        });
      }

      return res.status(500).send({
        error: 'Something went wrong. Please try again later.',
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send({
        error: 'Something went wrong. Please try again later.',
      });
    }
  }

  if (req.session.inRegistrationProcess) {
    return res.redirect('/register/camera-setup');
  }

  return res.redirect('/login');
});

export default router;
