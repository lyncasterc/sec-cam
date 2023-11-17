import dotenv from 'dotenv';

dotenv.config();

const {
  DEV_MONGODB_URI,
  PORT,
  SESSION_SECRET,
  SHARED_SECRET,
  METERED_API_KEY,
} = process.env;

export default {
  DEV_MONGODB_URI,
  PORT,
  SESSION_SECRET,
  SHARED_SECRET,
  METERED_API_KEY,
};
