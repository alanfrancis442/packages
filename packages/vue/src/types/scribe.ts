import type { Ref } from "vue";
import type {
  RealtimeConnection,
  AudioFormat,
  CommitStrategy,
} from "@elevenlabs/client";

export type ScribeStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "transcribing"
  | "error";

export interface WordTimestamp {
  text?: string;
  /** Start time in seconds */
  start?: number;
  /** End time in seconds */
  end?: number;
  type?: "word" | "spacing";
  speaker_id?: string;
  logprob?: number;
  characters?: string[];
}

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  /** Word-level timestamps (only present when includeTimestamps is enabled) */
  words?: WordTimestamp[];
}

export interface ScribeCallbacks {
  onSessionStarted?: () => void;
  onPartialTranscript?: (data: { text: string }) => void;
  onCommittedTranscript?: (data: { text: string }) => void;
  onCommittedTranscriptWithTimestamps?: (data: {
    text: string;
    words?: WordTimestamp[];
  }) => void;
  /** Called for any error (also called when specific error callbacks fire) */
  onError?: (error: Error | Event) => void;
  onAuthError?: (data: { error: string }) => void;
  onQuotaExceededError?: (data: { error: string }) => void;
  onCommitThrottledError?: (data: { error: string }) => void;
  onTranscriberError?: (data: { error: string }) => void;
  onUnacceptedTermsError?: (data: { error: string }) => void;
  onRateLimitedError?: (data: { error: string }) => void;
  onInputError?: (data: { error: string }) => void;
  onQueueOverflowError?: (data: { error: string }) => void;
  onResourceExhaustedError?: (data: { error: string }) => void;
  onSessionTimeLimitExceededError?: (data: { error: string }) => void;
  onChunkSizeExceededError?: (data: { error: string }) => void;
  onInsufficientAudioActivityError?: (data: { error: string }) => void;

  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface ScribeHookOptions extends ScribeCallbacks {
  // Connection options
  token?: string;
  modelId?: string;
  baseUri?: string;

  // VAD options
  commitStrategy?: CommitStrategy;
  vadSilenceThresholdSecs?: number;
  vadThreshold?: number;
  minSpeechDurationMs?: number;
  minSilenceDurationMs?: number;
  languageCode?: string;

  // Microphone options (for automatic microphone mode)
  microphone?: {
    deviceId?: string;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    channelCount?: number;
  };

  // Manual audio options
  audioFormat?: AudioFormat;
  sampleRate?: number;

  // Auto-connect on mount
  autoConnect?: boolean;

  // Include timestamps
  includeTimestamps?: boolean;
}

export interface UseScribeReturn {
  // State (as Refs for Vue)
  status: Ref<ScribeStatus>;
  isConnected: Ref<boolean>;
  isTranscribing: Ref<boolean>;
  partialTranscript: Ref<string>;
  committedTranscripts: Ref<TranscriptSegment[]>;
  error: Ref<string | null>;

  // Connection methods
  connect: (options?: Partial<ScribeHookOptions>) => Promise<void>;
  disconnect: () => void;

  // Audio methods (for manual mode)
  sendAudio: (
    audioBase64: string,
    options?: { commit?: boolean; sampleRate?: number; previousText?: string }
  ) => void;
  commit: () => void;

  // Utility methods
  clearTranscripts: () => void;
  getConnection: () => RealtimeConnection | null;
}
