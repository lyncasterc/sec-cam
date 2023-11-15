import { Camera } from '../mongo/index.js';

/**
 * Updates all cameras owned by a specific user.
 *
 * @param {string} ownerId - The ID of the owner of the cameras to update.
 * @param {Object} update - The update object to apply to each camera.
 * @throws {Error} If no cameras are found for the specified owner.
 */
async function updateAllCamerasByOwnerId(ownerId, update) {
  const cameras = await Camera.find({ owner: ownerId });

  if (!cameras || cameras.length === 0) {
    throw new Error('No cameras found for owner');
  }

  cameras.forEach(async (camera) => {
    await camera.updateOne(update);
  });
}

export default {
  updateAllCamerasByOwnerId,
};
