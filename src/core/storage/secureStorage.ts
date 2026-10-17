import * as SecureStore from "expo-secure-store";
import type { KeyValueStorage } from "./KeyValueStorage";

const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const secureStorage: KeyValueStorage = {
  get: async (key) => {
    try {
      return await SecureStore.getItemAsync(key, options);
    } catch {
      return null;
    }
  },
  set: (key, value) => SecureStore.setItemAsync(key, value, options),
  remove: (key) => SecureStore.deleteItemAsync(key, options),
};
