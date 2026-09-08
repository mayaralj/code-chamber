// Local storage mock since local storage was not available in the test environment. This mock simulates the behavior of localStorage for testing purposes, allowing tests to run without relying on a browser environment.
export function createLocalStorageMock() {
  let store = {};

  return {
    getItem: (key) => (Object.hasOwn(store, key) ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}
