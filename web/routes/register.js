import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 } from 'uuid';
import { User, Camera } from '../mongo/index.js';
import { userService, cameraService } from '../services/index.js';

export default (signalChannel) => {
  const router = express.Router();

  router.get('/', (req, res) => {
  // If user is already logged in, redirect to home page.
    if (req.session.user && req.session.user.isLoggedIn) {
      return res.redirect('/');
    }

    // if user is already in registration process, redirect to camera setup page.
    if (req.session.inRegistrationProcess) {
      return res.redirect('/register/camera-setup');
    }

    return res.render('register');
  });

  router.get('/camera-setup', async (req, res) => {
  // If user is already logged in, redirect to home page.
    if (req.session.user && req.session.user.isLoggedIn) {
      return res.redirect('/');
    }

    // If user is not in registration process, redirect to login page.
    if (!req.session.inRegistrationProcess) {
      return res.redirect('/login');
    }

    // If registration session has expired, delete user and camera from database.
    if (Date.now() >= req.session.registrationEnd) {
      return res.redirect('/register/session-expired');
    }

    // generate and update token field of User
    const token = v4();
    const { cameraId, user: { username } } = req.session;

    // TODO: refactor to use userService
    await User.updateOne({ username }, { messageToken: token });

    return res.render('camera-setup', {
      cameraId,
      username,
      token,
      remainingTime: req.session.registrationEnd - Date.now(),
    });
  });

  router.post('/', [
    body('username')
      .isString()
      .withMessage('Username must be a string.')
      .trim()
      .escape()
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters.'),

    body('cameraId')
      .isString()
      .withMessage('Camera ID must be a string.')
      .trim()
      .escape()
      .isLength({ min: 1 })
      .withMessage('Camera ID must be at least 1 character.'),

    body('password')
      .isString()
      .withMessage('Password must be a string.')
      .isStrongPassword({
        minLength: 10,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
      .withMessage('Password does not meet requirements.')
      .custom((value) => !(/\s/.test(value)))
      .withMessage('Password cannot contain spaces.'),

    body('confirmPassword')
      .isString()
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match.'),

  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({ errors: errors.array() });
    }

    try {
      const { username, cameraId, password } = req.body;
      const existingUser = await User.findOne({ username });
      const existingCamera = await Camera.findOne({ cameraId });

      if (existingUser || existingCamera) {
        return res.status(409).send({ error: 'Username or camera already exists. Please try different credentials.' });
      }

      const camera = new Camera({ cameraId });
      const user = new User({ username, password, registeredCams: [camera] });
      camera.owner = user;

      await camera.save();
      await user.save();

      // Mark session as in registration process.
      // User is NOT logged in yet until they connect their camera.
      // Session will expire after 15 minutes.

      req.session.inRegistrationProcess = true;
      req.session.registrationEnd = Date.now() + 15 * 60 * 1000;
      req.session.cameraId = cameraId;
      req.session.user = {
        username,
        id: user.id,
        isLoggedIn: false,
      };

      req.session.save();
      return res.redirect('/register/camera-setup');
    } catch (error) {
      console.error(error);
      return res.status(500).send({ error: 'Something went wrong. Please try again.' });
    }
  });

  router.patch('/confirm', async (req, res) => {
    if (!req.session.inRegistrationProcess) {
      return res.status(400).send({ error: 'Bad request.' });
    }

    const { cameraId } = req.session;

    if (!signalChannel.isCameraConnected(cameraId)) {
      return res.status(400).send({ error: 'Camera not connected.' });
    }

    try {
      const { user } = req.session;

      await userService.updateUserByUsername(user.username, { verified: true });
      await cameraService.updateAllCamerasByOwnerId(user.id, { verified: true });

      req.session.regenerate((err) => {
        if (err) {
          console.error(err);
          return res.status(500).send({ error: 'Something went wrong. Please try again.' });
        }

        req.session.inRegistrationProcess = false;
        req.session.user = {
          ...user,
          isLoggedIn: true,
        };
        req.session.save();

        return res.redirect('/');
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ error: 'Something went wrong. Please try again.' });
    }

    return null;
  });

  router.delete('/cancel', async (req, res) => {
    if (req.session.inRegistrationProcess) {
      try {
        const { user: { username } } = req.session;

        if (req.query.expired === 'true' && Date.now() < req.session.registrationEnd) {
          return res.status(400).send({ error: 'Bad request.' });
        }

        await userService.deleteUserByUsername(username);

        req.session.destroy();

        return res.redirect('/register');
      } catch (error) {
        console.error(error);
        return res.status(500).send({ error: 'Something went wrong. Please try again.' });
      }
    }

    return res.status(400);
  });

  return router;
};
