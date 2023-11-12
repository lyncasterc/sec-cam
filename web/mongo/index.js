import mongoose from 'mongoose';

/**
 * Connect to MongoDB
 * @param {string} uri
 */
const connect = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to: ', uri);
  } catch (error) {
    console.error('Error connecting to dev MongoDB: ', error.message);
  }
};

/**
 * Drop the entire database
*/
export const resetDatabase = async () => {
  try {
    await mongoose.connection.dropDatabase();
    console.log('Database dropped.');
  } catch (error) {
    console.error('Error dropping database: ', error.message);
  }
};

export default connect;
export { default as User } from './models/user.js';
export { default as Camera } from './models/camera.js';
