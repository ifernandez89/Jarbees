import { openDB } from 'idb';

const DB_NAME = 'jarbees-db';
const STORE_CONV = 'conversations';
const STORE_PREF = 'preferences';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_CONV)) {
        db.createObjectStore(STORE_CONV, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PREF)) {
        db.createObjectStore(STORE_PREF);
      }
    },
  });
}

export async function saveConversation(id: string, messages: unknown[]) {
  const db = await getDB();
  return db.put(STORE_CONV, { id, messages, updatedAt: Date.now() });
}

export async function loadConversation(id: string) {
  const db = await getDB();
  return db.get(STORE_CONV, id);
}

export async function savePreference(key: string, value: unknown) {
  const db = await getDB();
  return db.put(STORE_PREF, value, key);
}

export async function loadPreference(key: string) {
  const db = await getDB();
  return db.get(STORE_PREF, key);
}

export async function listConversations() {
  const db = await getDB();
  return db.getAll(STORE_CONV);
}

// avoid anonymous default export to satisfy lint rules
export const db = { saveConversation, loadConversation, savePreference, loadPreference, listConversations };
