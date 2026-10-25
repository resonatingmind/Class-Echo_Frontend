/* Turns the backend's error_reason into something a teacher can act on: one
   plain sentence and one primary action. The reasons are written by
   Class-Echo-Backend app/tasks/llm_tasks.py (_classify_error and the stuck-job
   sweep) and app/routers/teacher.py; matching is on stable phrases in them. */

export type FailureAction = 'retry' | 'replace';

export type FailureMessage = {
  title: string;
  body: string;
  action: FailureAction;
};

type Rule = { match: RegExp; message: FailureMessage };

const RULES: Rule[] = [
  {
    match: /could not transcribe|too little speech|no speech/i,
    message: {
      title: "We couldn't hear enough of the lesson.",
      body: 'Place the phone closer to you next time. If you have a clearer recording of this class, upload it instead.',
      action: 'replace',
    },
  },
  {
    match: /could not be found|unsupported format|corrupted|failed to download/i,
    message: {
      title: "We couldn't read this audio file.",
      body: 'Upload the recording again, or record a new one.',
      action: 'replace',
    },
  },
  {
    match: /quota/i,
    message: {
      title: "Today's analysis limit has been reached.",
      body: 'Try again tomorrow. Your recording is saved.',
      action: 'retry',
    },
  },
  {
    match: /administrator|not configured|not available/i,
    message: {
      title: "Analysis isn't working right now.",
      body: 'Please let your school admin know. Your recording is saved.',
      action: 'retry',
    },
  },
  {
    match: /interrupted|could not be reached|unavailable|timed out|rate-limited|unreadable|retrying/i,
    message: {
      title: 'Analysis was interrupted.',
      body: 'Your recording is saved. Try the analysis again.',
      action: 'retry',
    },
  },
];

const FALLBACK: FailureMessage = {
  title: 'Something went wrong while analysing this lecture.',
  body: 'Your recording is saved. Try the analysis again.',
  action: 'retry',
};

export function describeFailure(errorReason: string | null | undefined): FailureMessage {
  if (!errorReason) return FALLBACK;
  return RULES.find((r) => r.match.test(errorReason))?.message ?? FALLBACK;
}
