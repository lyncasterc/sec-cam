import dotenv from 'dotenv';

dotenv.config();

const {
  DEV_MONGODB_URI,
  PORT,
  SESSION_SECRET,
} = process.env;

export default {
  DEV_MONGODB_URI,
  PORT,
  SESSION_SECRET,
};
