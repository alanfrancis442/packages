import { ref, onUnmounted, computed, watch, type Ref } from "vue";
import { Scribe, RealtimeEvents } from "@elevenlabs/client";
import type { RealtimeConnection } from "@elevenlabs/client";
import type {
  ScribeHookOptions,
  UseScribeReturn,
  ScribeStatus,
  TranscriptSegment,
} from "./types/scribe";
import { setupScribeEventHandlers } from "./utils/scribeEventHandlers";
import {
  createScribeConnection,
  mergeScribeOptions,
} from "./utils/scribeConnection";

// Re-export types
export type {
  ScribeStatus,
  WordTimestamp,
  TranscriptSegment,
  ScribeCallbacks,
  ScribeHookOptions,
  UseScribeReturn,
} from "./types/scribe";

// ============= Composable Implementation =============

export function useScribe(options: ScribeHookOptions = {}): UseScribeReturn {
  const {
    // Callbacks
    onSessionStarted,
    onPartialTranscript,
    onCommittedTranscript,
    onCommittedTranscriptWithTimestamps,
    onError,
    onAuthError,
    onQuotaExceededError,
    onCommitThrottledError,
    onTranscriberError,
    onUnacceptedTermsError,
    onRateLimitedError,
    onInputError,
    onQueueOverflowError,
    onResourceExhaustedError,
    onSessionTimeLimitExceededError,
    onChunkSizeExceededError,
    onInsufficientAudioActivityError,
    onConnect,
    onDisconnect,

    // Connection options
    token: defaultToken,
    modelId: defaultModelId,
    baseUri: defaultBaseUri,
    commitStrategy: defaultCommitStrategy,
    vadSilenceThresholdSecs: defaultVadSilenceThresholdSecs,
    vadThreshold: defaultVadThreshold,
    minSpeechDurationMs: defaultMinSpeechDurationMs,
    minSilenceDurationMs: defaultMinSilenceDurationMs,
    languageCode: defaultLanguageCode,

    // Mode options
    microphone: defaultMicrophone,
    audioFormat: defaultAudioFormat,
    sampleRate: defaultSampleRate,

    // Auto-connect
    autoConnect = false,

    // Timestamps
    includeTimestamps: defaultIncludeTimestamps,
  } = options;

  const connectionRef = ref<RealtimeConnection | null>(null);

  const status = ref<ScribeStatus>("disconnected");
  const partialTranscript = ref<string>("");
  const committedTranscripts = ref<TranscriptSegment[]>([]);
  const error = ref<string | null>(null);

  // Cleanup on unmount
  onUnmounted(() => {
    connectionRef.value?.close();
  });

  const connect = async (
    runtimeOptions: Partial<ScribeHookOptions> = {}
  ): Promise<void> => {
    if (connectionRef.value) {
      console.warn("Already connected");
      return;
    }

    try {
      status.value = "connecting";
      error.value = null;

      // Merge options and create connection
      const mergedOptions = mergeScribeOptions(options, runtimeOptions);
      const connection = createScribeConnection(mergedOptions);

      connectionRef.value = connection;

      // Set up event handlers
      setupScribeEventHandlers(
        connection,
        {
          status,
          partialTranscript,
          committedTranscripts,
          error,
        },
        {
          onSessionStarted,
          onPartialTranscript,
          onCommittedTranscript,
          onCommittedTranscriptWithTimestamps,
          onError,
          onAuthError,
          onQuotaExceededError,
          onCommitThrottledError,
          onTranscriberError,
          onUnacceptedTermsError,
          onRateLimitedError,
          onInputError,
          onQueueOverflowError,
          onResourceExhaustedError,
          onSessionTimeLimitExceededError,
          onChunkSizeExceededError,
          onInsufficientAudioActivityError,
          onConnect,
          onDisconnect,
        }
      );

      // Handle close event separately to update connectionRef
      connection.on(RealtimeEvents.CLOSE, () => {
        status.value = "disconnected";
        connectionRef.value = null;
        onDisconnect?.();
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect";
      error.value = errorMessage;
      status.value = "error";
      throw err;
    }
  };

  const disconnect = () => {
    connectionRef.value?.close();
    connectionRef.value = null;
    status.value = "disconnected";
  };

  const sendAudio = (
    audioBase64: string,
    options?: { commit?: boolean; sampleRate?: number; previousText?: string }
  ) => {
    if (!connectionRef.value) {
      throw new Error("Not connected to Scribe");
    }
    connectionRef.value.send({ audioBase64, ...options });
  };

  const commit = () => {
    if (!connectionRef.value) {
      throw new Error("Not connected to Scribe");
    }
    connectionRef.value.commit();
  };

  const clearTranscripts = () => {
    committedTranscripts.value = [];
    partialTranscript.value = "";
  };

  const getConnection = (): RealtimeConnection | null => {
    return connectionRef.value as RealtimeConnection | null;
  };

  // Auto-connect if enabled
  watch(
    () => autoConnect,
    shouldAutoConnect => {
      if (shouldAutoConnect) {
        connect();
      }
    },
    { immediate: true }
  );

  // Computed properties
  const isConnected = computed(
    () => status.value === "connected" || status.value === "transcribing"
  );
  const isTranscribing = computed(() => status.value === "transcribing");

  return {
    // State (return refs for Vue reactivity)
    status,
    isConnected,
    isTranscribing,
    partialTranscript,
    committedTranscripts,
    error,

    // Methods
    connect,
    disconnect,
    sendAudio,
    commit,
    clearTranscripts,
    getConnection,
  };
}

// Export types and enums from client for convenience
export {
  AudioFormat,
  CommitStrategy,
  RealtimeEvents,
} from "@elevenlabs/client";
export type { RealtimeConnection } from "@elevenlabs/client";
