import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import MongoStore from 'connect-mongo';
import session from 'express-session';
import morgan from 'morgan';
import connect, { resetDatabase } from './mongo/index.js';
import config from './utils/config.js';
import logoutRouter from './routes/logout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

(async () => {
  await connect(config.DEV_MONGODB_URI);

  if (process.env.NODE_ENV === 'development') {
    await resetDatabase();
  }
}
)();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);

// express-session middleware
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: config.DEV_MONGODB_URI }),
  cookie: {
    secure: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: true,
  },
}));

app.use(morgan('dev'));

// Routes
app.use('/logout', logoutRouter);

export default app;
