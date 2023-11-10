import http from 'http';
import app from './app.js';
import config from './utils/config.js';

const server = http.createServer(app);
const port = config.PORT || 8080;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
