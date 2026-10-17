import type { KeyValueStorage } from "./KeyValueStorage";

export const secureStorage: KeyValueStorage = {
  get: async (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
  },
  remove: async (key) => {
    localStorage.removeItem(key);
  },
};
