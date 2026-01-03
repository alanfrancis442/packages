import { RealtimeEvents } from "@elevenlabs/client";
import type { RealtimeConnection } from "@elevenlabs/client";
import type { Ref } from "vue";
import type {
  PartialTranscriptMessage,
  CommittedTranscriptMessage,
  CommittedTranscriptWithTimestampsMessage,
  ScribeErrorMessage,
  ScribeAuthErrorMessage,
  ScribeQuotaExceededErrorMessage,
  ScribeCommitThrottledErrorMessage,
  ScribeTranscriberErrorMessage,
  ScribeUnacceptedTermsErrorMessage,
  ScribeRateLimitedErrorMessage,
  ScribeInputErrorMessage,
  ScribeQueueOverflowErrorMessage,
  ScribeResourceExhaustedErrorMessage,
  ScribeSessionTimeLimitExceededErrorMessage,
  ScribeChunkSizeExceededErrorMessage,
  ScribeInsufficientAudioActivityErrorMessage,
} from "@elevenlabs/client";

import {
  ScribeStatus,
  ScribeCallbacks,
  TranscriptSegment,
} from "../types/scribe";

interface EventHandlerState {
  status: Ref<ScribeStatus>;
  partialTranscript: Ref<string>;
  committedTranscripts: Ref<TranscriptSegment[]>;
  error: Ref<string | null>;
}

/**
 * Sets up all event handlers for a Scribe connection
 */
export function setupScribeEventHandlers(
  connection: RealtimeConnection,
  state: EventHandlerState,
  callbacks: ScribeCallbacks
): void {
  const { status, partialTranscript, committedTranscripts, error } = state;

  // Session started
  connection.on(RealtimeEvents.SESSION_STARTED, () => {
    status.value = "connected";
    callbacks.onSessionStarted?.();
  });

  // Partial transcript
  connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data: unknown) => {
    const message = data as PartialTranscriptMessage;
    partialTranscript.value = message.text;
    status.value = "transcribing";
    callbacks.onPartialTranscript?.(message);
  });

  // Committed transcript
  connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data: unknown) => {
    const message = data as CommittedTranscriptMessage;
    const segment: TranscriptSegment = {
      id: `${Date.now()}-${Math.random()}`,
      text: message.text,
      timestamp: Date.now(),
      isFinal: true,
    };
    committedTranscripts.value = [...committedTranscripts.value, segment];
    partialTranscript.value = "";
    callbacks.onCommittedTranscript?.(message);
  });

  // Committed transcript with timestamps
  connection.on(
    RealtimeEvents.COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS,
    (data: unknown) => {
      const message = data as CommittedTranscriptWithTimestampsMessage;
      const segment: TranscriptSegment = {
        id: `${Date.now()}-${Math.random()}`,
        text: message.text,
        timestamp: Date.now(),
        isFinal: true,
        words: message.words,
      };
      committedTranscripts.value = [...committedTranscripts.value, segment];
      partialTranscript.value = "";
      callbacks.onCommittedTranscriptWithTimestamps?.(message);
    }
  );

  // General error handler
  connection.on(RealtimeEvents.ERROR, (err: unknown) => {
    const message = err as ScribeErrorMessage;
    error.value = message.error;
    status.value = "error";
    callbacks.onError?.(new Error(message.error));
  });

  // Specific error handlers - all follow the same pattern
  const setupErrorHandler = <T extends { error: string }>(
    event: RealtimeEvents,
    callback?: (data: T) => void
  ) => {
    connection.on(event, (data: unknown) => {
      const message = data as T;
      error.value = message.error;
      status.value = "error";
      callback?.(message);
      callbacks.onError?.(new Error(message.error));
    });
  };

  setupErrorHandler<ScribeAuthErrorMessage>(
    RealtimeEvents.AUTH_ERROR,
    callbacks.onAuthError
  );
  setupErrorHandler<ScribeQuotaExceededErrorMessage>(
    RealtimeEvents.QUOTA_EXCEEDED,
    callbacks.onQuotaExceededError
  );
  setupErrorHandler<ScribeCommitThrottledErrorMessage>(
    RealtimeEvents.COMMIT_THROTTLED,
    callbacks.onCommitThrottledError
  );
  setupErrorHandler<ScribeTranscriberErrorMessage>(
    RealtimeEvents.TRANSCRIBER_ERROR,
    callbacks.onTranscriberError
  );
  setupErrorHandler<ScribeUnacceptedTermsErrorMessage>(
    RealtimeEvents.UNACCEPTED_TERMS,
    callbacks.onUnacceptedTermsError
  );
  setupErrorHandler<ScribeRateLimitedErrorMessage>(
    RealtimeEvents.RATE_LIMITED,
    callbacks.onRateLimitedError
  );
  setupErrorHandler<ScribeInputErrorMessage>(
    RealtimeEvents.INPUT_ERROR,
    callbacks.onInputError
  );
  setupErrorHandler<ScribeQueueOverflowErrorMessage>(
    RealtimeEvents.QUEUE_OVERFLOW,
    callbacks.onQueueOverflowError
  );
  setupErrorHandler<ScribeResourceExhaustedErrorMessage>(
    RealtimeEvents.RESOURCE_EXHAUSTED,
    callbacks.onResourceExhaustedError
  );
  setupErrorHandler<ScribeSessionTimeLimitExceededErrorMessage>(
    RealtimeEvents.SESSION_TIME_LIMIT_EXCEEDED,
    callbacks.onSessionTimeLimitExceededError
  );
  setupErrorHandler<ScribeChunkSizeExceededErrorMessage>(
    RealtimeEvents.CHUNK_SIZE_EXCEEDED,
    callbacks.onChunkSizeExceededError
  );
  setupErrorHandler<ScribeInsufficientAudioActivityErrorMessage>(
    RealtimeEvents.INSUFFICIENT_AUDIO_ACTIVITY,
    callbacks.onInsufficientAudioActivityError
  );

  // Connection events
  connection.on(RealtimeEvents.OPEN, () => {
    callbacks.onConnect?.();
  });

  // Note: CLOSE event should be handled separately in the composable
  // to allow updating connectionRef. This function only handles the callback.
}
