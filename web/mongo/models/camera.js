/* eslint-disable no-param-reassign */
import mongoose from 'mongoose';

const cameraSchema = new mongoose.Schema({
  name: { type: String },
  cameraId: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verified: { type: Boolean, default: false },
});

cameraSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

export default mongoose.model('Camera', cameraSchema);
