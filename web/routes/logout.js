import express from 'express';

const router = express.Router();

if (process.env.NODE_ENV === 'development') {
  router.get('/', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
      } else {
        res.redirect('/register');
      }
    });
  });
}

router.post('/', (req, res) => {
  if (req.session.user && req.session.user.isLoggedIn) {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
        return res.status(500).send({
          error: 'Something went wrong. Please try again later.',
        });
      }

      return res.redirect('/login');
    });
  }

  return res.status(400);
});

export default router;
