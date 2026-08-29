/* Native build: recorded audio is already a real file in the app's cache
   directory, so there is nothing to stage in a chunk store. The web build
   replaces this module with `audioChunkStore.web.ts`, which keeps MediaRecorder
   chunks in IndexedDB - a browser has no file the app can point back at. */

export async function resetAudioChunks(): Promise<void> {}

export async function appendAudioChunk(_chunk: Blob): Promise<void> {}

export async function getAudioChunkCount(): Promise<number> {
  return 0;
}

export async function buildAudioBlobUrl(_mimeType: string): Promise<string | null> {
  return null;
}

export async function clearAudioChunks(): Promise<void> {}

export const supportsChunkRecovery = false;
