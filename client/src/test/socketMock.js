import { vi } from "vitest";

// Creates a fake socket.io-client instance with real listener so tests can register handlers via on/once and simulate server events via __trigger, without ever opening a real connection.

// Use inside a vi.mock("../../socket", ...) factory so every hook under test gets this fake instead of the real singleton.

// Create Socket Mock
export function createSocketMock() {
  // Track listeners for each event type
  const listeners = new Map();

  // Helper to add a listener for an event
  const addListener = (event, handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
  };

  // Create the mock socket object
  const socket = {
    on: vi.fn((event, handler) => addListener(event, handler)),

    // Removes it after first call, but still allows manual off() to remove it before that
    once: vi.fn((event, handler) => {
      const wrapped = (...args) => {
        socket.off(event, wrapped);
        handler(...args);
      };
      addListener(event, wrapped);
    }),

    // Removes a listener for an event, or all listeners for that event if no handler is provided
    off: vi.fn((event, handler) => {
      if (!listeners.has(event)) return;
      if (handler) {
        listeners.get(event).delete(handler);
      } else {
        listeners.delete(event);
      }
    }),

    // Mocks for emit, connect, and disconnect methods
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),

    // Test-only helpers, not part of the real socket.io-client API.
    __trigger(event, payload) {
      const handlers = listeners.get(event);
      if (!handlers) return;
      [...handlers].forEach((handler) => handler(payload));
    },

    __listenerCount(event) {
      return listeners.get(event)?.size ?? 0;
    },

    __reset() {
      listeners.clear();
      socket.on.mockClear();
      socket.once.mockClear();
      socket.off.mockClear();
      socket.emit.mockClear();
      socket.connect.mockClear();
      socket.disconnect.mockClear();
    },
  };

  return socket;
}
