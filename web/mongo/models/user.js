/* eslint-disable no-param-reassign */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  registeredCams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Camera' }],
  verified: { type: Boolean, default: false },
});

// Hashing password before saving to database
userSchema.pre('save', async function hashPassword(next) {
  const user = this;
  if (user.isModified('password') || user.isNew) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(user.password, salt);
    user.password = hash;
  }
  next();
});

// Method for comparing password
userSchema.methods.comparePassword = async function comparePassword(password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

userSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

export default mongoose.model('User', userSchema);
