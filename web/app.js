import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

export default app;
