import http from 'http';
import app from './app.js';
import config from './utils/config.js';
import SignalChannel from './utils/SignalChannel.js';

const server = http.createServer(app);
const port = config.PORT || 8080;
const signalChannel = new SignalChannel(server);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

signalChannel.initialize();
