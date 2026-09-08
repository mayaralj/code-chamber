// Imports
import { vi } from "vitest";

// Creates a mock for the react-hot-toast library with vi.fn() functions for toast, toast.error, toast.success, and toast.dismiss. Each function returns a unique string identifier for the toast.
export function createToastMock() {
  let nextId = 1;
  const toastFn = vi.fn(() => `toast-${nextId++}`);
  toastFn.error = vi.fn(() => `toast-${nextId++}`);
  toastFn.success = vi.fn(() => `toast-${nextId++}`);
  toastFn.dismiss = vi.fn();
  return toastFn;
}
