import express from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../mongo/index.js';

const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user && req.session.user.isLoggedIn) {
    return res.redirect('/');
  }

  if (req.session.inRegistrationProcess) {
    return res.redirect('/register/camera-setup');
  }

  return res.render('login');
});

router.post('/', [
  body('username')
    .isString()
    .withMessage('Username must be a string.')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Username cannot be empty.'),
  body('password')
    .isString()
    .withMessage('Password must be a string.')
    .trim()
    .notEmpty()
    .withMessage('Password cannot be empty.'),
], async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).send({
      errors: errors.array(),
    });
  }

  const { username, password } = req.body;

  let user;

  try {
    user = await User.findOne({ username });
    const isUserValid = user && user.verified && await user.comparePassword(password);

    if (!isUserValid) {
      return res.status(400).send({
        error: 'Invalid username or password.',
      });
    }
  } catch (error) {
    console.error('login error: ', error);
    return res.status(500).send({
      error: 'Something went wrong. Please try again later.',
    });
  }

  req.session.user = {
    isLoggedIn: true,
    username,
    id: user.id,
  };

  req.session.save();

  return res.redirect('/');
});

export default router;
