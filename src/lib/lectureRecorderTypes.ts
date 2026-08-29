/* One recorder interface, two engines behind it.

   Native uses expo-audio, which writes straight to a file. Web drives
   MediaRecorder directly instead of going through expo-audio, because the web
   build needs the individual chunks as they arrive in order to stage them for
   crash recovery - expo-audio's web recorder only surfaces the audio once, at
   stop(), which is exactly too late. See `useLectureRecorder.web.ts`. */

export type LectureRecorderStatus = {
  isRecording: boolean;
  isPaused: boolean;
  /** Time actually captured. Paused time is excluded on every platform. */
  durationMillis: number;
  /** Input level in dBFS (roughly -60 to 0), or undefined before the first sample. */
  metering?: number;
};

export type LectureRecording = {
  uri: string;
  mimeType: string;
  durationMillis: number;
};

/* Where the audio captured so far is being held, so the crash-recovery draft can
   record it while the lecture is still running. Structurally the same shape as
   `RecordingDraftAudio`, kept separate so the engines do not depend on the
   persistence layer. */
export type StagedAudio = {
  kind: 'chunks' | 'file';
  uri?: string;
  mimeType: string;
};

export type LectureRecorder = {
  status: LectureRecorderStatus;
  requestPermission: () => Promise<boolean>;
  /** Prepares the engine and begins a fresh capture, discarding any staged audio. */
  start: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  /** Finalises the capture. Returns null when there was nothing to finalise. */
  stop: () => Promise<LectureRecording | null>;
  /** Tears the engine down and throws the audio away. */
  discard: () => Promise<void>;
  /**
   * Where the audio captured so far lives, or null before anything is captured.
   * Called while recording so a draft written mid-lecture already points at the
   * audio - waiting until stop() would leave a crashed lecture with no trail.
   */
  stagedAudio: () => StagedAudio | null;
  /** True when audio staged by a previous app session can be recovered. */
  canRecoverAudio: boolean;
};
