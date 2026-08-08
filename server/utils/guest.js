// Imports
import { randomUUID } from "node:crypto";

// Config
const SUFFIX_LENGTH = 4;
let guestIdToUsername = new Map();
let usernameToGuestId = new Map();
let deleteGuestUsernameTimeouts = new Map();
const GUEST_USERNAME_REMOVE_TIMEOUT = 60000;

// helper to generate guest suffix
const generateGuestSuffix = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

// Helper to get guest id
export const getGuestId = (socket) => {
  // Reuse guest id from client if it exists
  const providedGuestId = socket.handshake.auth?.guestId;
  console.log("Provided guest ID:", providedGuestId);
  const guestId = providedGuestId?.startsWith("guest-")
    ? providedGuestId
    : `guest-${randomUUID()}`;
  return guestId;
};

// Helper to cancel guest username timeout
export const cancelGuestUsernameTimeout = (guestId) => {
  if (deleteGuestUsernameTimeouts.has(guestId)) {
    clearTimeout(deleteGuestUsernameTimeouts.get(guestId));
    deleteGuestUsernameTimeouts.delete(guestId);
  }
};

// Helper to get guest username
export const getGuestUsername = (guestId) => {
  // Check if guest username already exists
  let guestUsername = guestIdToUsername.get(guestId);

  // Check if someone else has this name with a different id
  if (
    guestUsername &&
    usernameToGuestId.get(guestUsername.toLowerCase()) !== guestId
  ) {
    guestUsername = null;
  }
  // Generate new
  if (!guestUsername) {
    guestUsername = `Guest-${generateGuestSuffix()}`;
    while (usernameToGuestId.has(guestUsername.toLowerCase())) {
      guestUsername = `Guest-${generateGuestSuffix()}`;
    }
  } else {
    // Make the first letter uppercase for display name
    guestUsername =
      guestUsername.charAt(0).toUpperCase() + guestUsername.slice(1);
  }

  // Add to set
  guestIdToUsername.set(guestId, guestUsername.toLowerCase());
  usernameToGuestId.set(guestUsername.toLowerCase(), guestId);

  return guestUsername;
};

// Helper to remove guest username after timeout
export const scheduleGuestUsernameDeletion = (guestId) => {
  const deleteGuestUsernameTimeout = setTimeout(() => {
    guestIdToUsername.delete(guestId);
    usernameToGuestId.delete(guestIdToUsername.get(guestId));
    deleteGuestUsernameTimeouts.delete(guestId);
  }, GUEST_USERNAME_REMOVE_TIMEOUT);
  deleteGuestUsernameTimeouts.set(guestId, deleteGuestUsernameTimeout);
};
