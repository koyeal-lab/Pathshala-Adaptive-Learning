import { openDB } from "idb";

// One IndexedDB store for the cached question bank (so lessons work offline),
// one for attempts made while offline, queued until we can sync to the server.
const DB_NAME = "pathshala-offline";
const DB_VERSION = 1;

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("questionBank")) {
        db.createObjectStore("questionBank", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pendingAttempts")) {
        db.createObjectStore("pendingAttempts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("studentCache")) {
        db.createObjectStore("studentCache", { keyPath: "id" });
      }
    },
  });
}

export async function cacheQuestionBank(questions) {
  const db = await getDb();
  const tx = db.transaction("questionBank", "readwrite");
  for (const q of questions) await tx.store.put(q);
  await tx.done;
}

export async function getCachedQuestionBank() {
  const db = await getDb();
  return db.getAll("questionBank");
}

export async function queueAttempt(attempt) {
  const db = await getDb();
  await db.put("pendingAttempts", attempt);
}

export async function getPendingAttempts() {
  const db = await getDb();
  return db.getAll("pendingAttempts");
}

export async function clearSyncedAttempts(ids) {
  const db = await getDb();
  const tx = db.transaction("pendingAttempts", "readwrite");
  for (const id of ids) await tx.store.delete(id);
  await tx.done;
}

export async function cacheStudent(student) {
  const db = await getDb();
  await db.put("studentCache", student);
}

export async function getCachedStudent(id) {
  const db = await getDb();
  return db.get("studentCache", id);
}
