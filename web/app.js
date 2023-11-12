import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import MongoStore from 'connect-mongo';
import session from 'express-session';
import morgan from 'morgan';
import connect from './mongo/index.js';
import config from './utils/config.js';
import registerRouter from './routes/register.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

connect(config.DEV_MONGODB_URI);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express session
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: config.DEV_MONGODB_URI }),
  cookie: { secure: true, maxAge: 24 * 60 * 60 * 1000, httpOnly: true }, // 1 day
}));

// Routes
app.use('/register', registerRouter);

app.use(morgan('dev'));
export default app;
