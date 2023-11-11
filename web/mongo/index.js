import mongoose from 'mongoose';

const connect = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to: ', uri);
  } catch (error) {
    console.error('Error connecting to dev MongoDB: ', error.message);
  }
};

export default connect;
export { default as User } from './models/user.js';
export { default as Camera } from './models/camera.js';
