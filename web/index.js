import http from 'http';
import app from './app.js';
import config from './utils/config.js';
import SignalChannel from './utils/SignalChannel.js';
import createRegisterRouter from './routes/register.js';
import createCameraStatusRouter from './routes/camera-status.js';

const server = http.createServer(app);
const port = config.PORT || 8080;
const signalChannel = new SignalChannel(server);
const registerRouter = createRegisterRouter(signalChannel);
const cameraStatusRouter = createCameraStatusRouter(signalChannel);

app.use('/register', registerRouter);
app.use('/api/camera-status', cameraStatusRouter);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

signalChannel.initialize();

export default {
  signalChannel,
};
