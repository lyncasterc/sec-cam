import express from 'express';
import { Camera } from '../mongo/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  if (req.session.user && req.session.user.isLoggedIn) {
    const cameras = await Camera.find({ owner: req.session.user.id });

    if (cameras && cameras.length > 0) {
      const camerasInfo = cameras.map((camera) => ({
        id: camera.cameraId,
        name: camera.name,
        owner: camera.owner,
      }));

      return res.render('index', { user: req.session.user, cameras: camerasInfo });
    }

    return res.status(500).send({
      error: 'Something went wrong. Please try again later.',
    });
  }

  if (req.session.inRegistrationProcess) {
    return res.redirect('/register/camera-setup');
  }

  return res.redirect('/login');
});

export default router;
