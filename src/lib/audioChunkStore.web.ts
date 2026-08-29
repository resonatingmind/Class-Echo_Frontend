/* MediaRecorder hands us the lecture as a stream of Blob fragments. They are
   written to IndexedDB as they arrive so that a tab refresh, a browser crash or
   a laptop sleep costs only the fragment in flight. localStorage cannot hold
   binary data at this size, which is why this is IndexedDB rather than the
   AsyncStorage used for the draft's metadata. */

const DB_NAME = 'classecho-audio';
const DB_VERSION = 1;
const STORE = 'chunks';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        // autoIncrement keys preserve arrival order, which is the only order in
        // which the fragments reassemble into playable audio.
        db.createObjectStore(STORE, { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open audio store'));
  });
  // A failed open must not be cached forever; the next call should retry.
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = work(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Audio store request failed'));
        tx.onabort = () => reject(tx.error ?? new Error('Audio store transaction aborted'));
      }),
  );
}

export async function resetAudioChunks(): Promise<void> {
  try {
    await runTransaction('readwrite', (store) => store.clear());
  } catch (e) {
    console.warn('[audioChunkStore] reset failed', e);
  }
}

export async function appendAudioChunk(chunk: Blob): Promise<void> {
  if (!chunk || chunk.size === 0) {
    return;
  }
  try {
    await runTransaction('readwrite', (store) => store.add(chunk));
  } catch (e) {
    // The in-memory recording is still fine; only the safety net is degraded.
    console.warn('[audioChunkStore] append failed', e);
  }
}

export async function getAudioChunkCount(): Promise<number> {
  try {
    return await runTransaction('readonly', (store) => store.count());
  } catch {
    return 0;
  }
}

/** Reassembles the stored fragments into one blob URL the player and uploader can use. */
export async function buildAudioBlobUrl(mimeType: string): Promise<string | null> {
  try {
    const parts = await runTransaction<Blob[]>('readonly', (store) => store.getAll() as IDBRequest<Blob[]>);
    const usable = (parts ?? []).filter((part) => part && part.size > 0);
    if (usable.length === 0) {
      return null;
    }
    return URL.createObjectURL(new Blob(usable, { type: mimeType }));
  } catch (e) {
    console.warn('[audioChunkStore] rebuild failed', e);
    return null;
  }
}

export async function clearAudioChunks(): Promise<void> {
  await resetAudioChunks();
}

export const supportsChunkRecovery = true;
