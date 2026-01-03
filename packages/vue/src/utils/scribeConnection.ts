import { Scribe } from "@elevenlabs/client";
import type {
  RealtimeConnection,
  AudioOptions,
  MicrophoneOptions,
} from "@elevenlabs/client";
import type { ScribeHookOptions } from "../types/scribe";

/**
 * Creates a Scribe connection based on the provided options
 */
export function createScribeConnection(
  options: ScribeHookOptions & {
    token: string;
    modelId: string;
  }
): RealtimeConnection {
  const {
    token,
    modelId,
    baseUri,
    commitStrategy,
    vadSilenceThresholdSecs,
    vadThreshold,
    minSpeechDurationMs,
    minSilenceDurationMs,
    languageCode,
    microphone,
    audioFormat,
    sampleRate,
    includeTimestamps,
  } = options;

  // Determine if we should include timestamps
  const shouldIncludeTimestamps =
    includeTimestamps ?? !!options.onCommittedTranscriptWithTimestamps;

  const baseConfig = {
    token,
    modelId,
    baseUri,
    commitStrategy,
    vadSilenceThresholdSecs,
    vadThreshold,
    minSpeechDurationMs,
    minSilenceDurationMs,
    languageCode,
    includeTimestamps: shouldIncludeTimestamps,
  };

  if (microphone) {
    // Microphone mode
    return Scribe.connect({
      ...baseConfig,
      microphone,
    } as MicrophoneOptions);
  } else if (audioFormat && sampleRate) {
    // Manual audio mode
    return Scribe.connect({
      ...baseConfig,
      audioFormat,
      sampleRate,
    } as AudioOptions);
  } else {
    throw new Error(
      "Either microphone options or (audioFormat + sampleRate) must be provided"
    );
  }
}

/**
 * Merges default options with runtime options
 */
export function mergeScribeOptions(
  defaultOptions: ScribeHookOptions,
  runtimeOptions: Partial<ScribeHookOptions> = {}
): ScribeHookOptions & {
  token: string;
  modelId: string;
} {
  const token = runtimeOptions.token || defaultOptions.token;
  const modelId = runtimeOptions.modelId || defaultOptions.modelId;

  if (!token) {
    throw new Error("Token is required");
  }
  if (!modelId) {
    throw new Error("Model ID is required");
  }

  return {
    ...defaultOptions,
    ...runtimeOptions,
    token,
    modelId,
    // Merge callbacks - prefer runtime callbacks
    onSessionStarted:
      runtimeOptions.onSessionStarted || defaultOptions.onSessionStarted,
    onPartialTranscript:
      runtimeOptions.onPartialTranscript || defaultOptions.onPartialTranscript,
    onCommittedTranscript:
      runtimeOptions.onCommittedTranscript ||
      defaultOptions.onCommittedTranscript,
    onCommittedTranscriptWithTimestamps:
      runtimeOptions.onCommittedTranscriptWithTimestamps ||
      defaultOptions.onCommittedTranscriptWithTimestamps,
    onError: runtimeOptions.onError || defaultOptions.onError,
    onAuthError: runtimeOptions.onAuthError || defaultOptions.onAuthError,
    onQuotaExceededError:
      runtimeOptions.onQuotaExceededError ||
      defaultOptions.onQuotaExceededError,
    onCommitThrottledError:
      runtimeOptions.onCommitThrottledError ||
      defaultOptions.onCommitThrottledError,
    onTranscriberError:
      runtimeOptions.onTranscriberError || defaultOptions.onTranscriberError,
    onUnacceptedTermsError:
      runtimeOptions.onUnacceptedTermsError ||
      defaultOptions.onUnacceptedTermsError,
    onRateLimitedError:
      runtimeOptions.onRateLimitedError || defaultOptions.onRateLimitedError,
    onInputError: runtimeOptions.onInputError || defaultOptions.onInputError,
    onQueueOverflowError:
      runtimeOptions.onQueueOverflowError ||
      defaultOptions.onQueueOverflowError,
    onResourceExhaustedError:
      runtimeOptions.onResourceExhaustedError ||
      defaultOptions.onResourceExhaustedError,
    onSessionTimeLimitExceededError:
      runtimeOptions.onSessionTimeLimitExceededError ||
      defaultOptions.onSessionTimeLimitExceededError,
    onChunkSizeExceededError:
      runtimeOptions.onChunkSizeExceededError ||
      defaultOptions.onChunkSizeExceededError,
    onInsufficientAudioActivityError:
      runtimeOptions.onInsufficientAudioActivityError ||
      defaultOptions.onInsufficientAudioActivityError,
    onConnect: runtimeOptions.onConnect || defaultOptions.onConnect,
    onDisconnect: runtimeOptions.onDisconnect || defaultOptions.onDisconnect,
  };
}
