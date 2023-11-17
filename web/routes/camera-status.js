import express from 'express';

const router = express.Router();

export default (signalChannel) => {
  router.post('/', (req, res) => {
    if (req.session.user && req.session.user.isLoggedIn) {
      const { cameras } = req.body;

      const camerasStatuses = cameras.map(({ id }) => ({
        id,
        isConnected: signalChannel.isCameraConnected(id),
      }));

      return res.status(200).send(camerasStatuses);
    }

    return res.status(401).send({
      error: 'Unauthorized',
    });
  });

  return router;
};
