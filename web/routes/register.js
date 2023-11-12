import express from 'express';
import { body, validationResult } from 'express-validator';
import { User, Camera } from '../mongo/index.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('register');
});

router.get('/camera-setup', (req, res) => {
  res.render('camera-setup');
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
    req.session.cookie.maxAge = 15 * 60 * 1000;
    req.session.registrationEnd = Date.now() + 15 * 60 * 1000;
    return res.redirect('/register/camera-setup');
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: 'Something went wrong. Please try again.' });
  }
});

// router.post('/confirm', (req, res) => {

// });

export default router;
