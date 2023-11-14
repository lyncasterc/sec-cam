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
 * Drop all documents from all collections in the database.
*/
export const resetDatabase = async () => {
  const collections = Object.keys(mongoose.connection.collections);
  for (let i = 0; i < collections.length; i += 1) {
    const collection = collections[i];
    try {
      // eslint-disable-next-line no-await-in-loop
      await mongoose.connection.collections[collection].deleteMany({});
    } catch (error) {
      console.error('Error dropping collection: ', collection);
    }
  }

  console.log('Database reset.');
};

export default connect;
export { default as User } from './models/user.js';
export { default as Camera } from './models/camera.js';
