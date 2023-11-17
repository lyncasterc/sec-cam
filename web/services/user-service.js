import { User, Camera } from '../mongo/index.js';

/**
 * Validates if the given token matches the message token of the user with the given username.
 * @param {string} username - The username of the user to validate.
 * @param {string} token - The token to validate.
 * @returns {Promise<boolean>} - A Promise that resolves to true if the token is valid,
 * false otherwise.
 */
async function validateUserMessageToken(username, token) {
  let user;
  try {
    user = await User.findOne({ username });
  } catch (error) {
    console.error('validateUserMessageToken error: ', error);
    return false;
  }

  if (!user || !token) {
    return false;
  }

  if (user.messageToken !== token) {
    return false;
  }

  return true;
}

/**
 * Deletes the user with the given username and all associated cameras.
 * @param {string} username - The username of the user to delete.
 * @returns {Promise<boolean>} - A Promise that resolves to true if the user was deleted,
 * false otherwise.
 */
async function deleteUserByUsername(username) {
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return false;
    }
    const result = await user.deleteOne();
    return result.deletedCount === 1;
  } catch (error) {
    console.error('deleteUserByUsername error: ', error);
    return false;
  }
}

/**
 * Updates the user with the given username with the provided update object.
 * @param {string} username - The username of the user to update.
 * @param {Object} update - The update object to apply to the user.
 * @returns {Promise<void>} - A Promise that resolves when the user is updated.
 * @throws {Error} - If the user is not found or not updated.
 */
async function updateUserByUsername(username, update) {
  const user = await User.findOneAndUpdate({ username }, update, { new: true });

  if (!user || (update.verified && !user.verified)) {
    throw new Error('User not found or not updated.');
  }
}

async function isUserAuthorizedForCamera(username, cameraId) {
  const user = await User.findOne({ username });
  const camera = await Camera.findOne({ cameraId });

  if (!user) {
    return false;
  }

  return user.registeredCams.map((id) => id.toString()).includes(camera.id);
}

export default {
  validateUserMessageToken,
  deleteUserByUsername,
  updateUserByUsername,
  isUserAuthorizedForCamera,
};
