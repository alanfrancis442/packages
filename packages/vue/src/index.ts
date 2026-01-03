import { ref, watch, onUnmounted, computed, type Ref } from "vue";
import {
  Conversation,
  type SessionConfig,
  type Options,
  type ClientToolsConfig,
  type InputConfig,
  type AudioWorkletConfig,
  type OutputConfig,
  type FormatConfig,
  type Mode,
  type Status,
  type Callbacks,
} from "@elevenlabs/client";

import { PACKAGE_VERSION } from "./version";
import {
  parseLocation,
  getOriginForLocation,
  getLivekitUrlForLocation,
  type Location,
} from "./utils/location";

// Re-export location utilities
export { parseLocation, getOriginForLocation, getLivekitUrlForLocation };
export type { Location };

export type {
  Role,
  Mode,
  Status,
  SessionConfig,
  DisconnectionDetails,
  Language,
  VadScoreEvent,
  InputConfig,
  FormatConfig,
  VoiceConversation,
  TextConversation,
  Callbacks,
} from "@elevenlabs/client";
export { postOverallFeedback } from "@elevenlabs/client";

// Scribe exports (will be added in scribe.ts)
export {
  useScribe,
  AudioFormat,
  CommitStrategy,
  RealtimeEvents,
} from "./scribe";
export type {
  ScribeStatus,
  TranscriptSegment,
  WordTimestamp,
  ScribeCallbacks,
  ScribeHookOptions,
  UseScribeReturn,
  RealtimeConnection,
} from "./scribe";

export type DeviceFormatConfig = {
  format: "pcm" | "ulaw";
  sampleRate: number;
  outputDeviceId?: string;
};

export type DeviceInputConfig = {
  preferHeadphonesForIosDevices?: boolean;
  inputDeviceId?: string;
};

export type HookOptions = Partial<
  SessionConfig &
    HookCallbacks &
    ClientToolsConfig &
    InputConfig &
    OutputConfig &
    AudioWorkletConfig &
    FormatConfig & {
      serverLocation?: Location | string;
    }
>;

export type ControlledState = {
  micMuted?: boolean;
  volume?: number;
};

export type HookCallbacks = Pick<
  Callbacks,
  | "onConnect"
  | "onDisconnect"
  | "onError"
  | "onMessage"
  | "onAudio"
  | "onModeChange"
  | "onStatusChange"
  | "onCanSendFeedbackChange"
  | "onDebug"
  | "onUnhandledClientToolCall"
  | "onVadScore"
  | "onInterruption"
  | "onAgentToolResponse"
  | "onAgentToolRequest"
  | "onConversationMetadata"
  | "onMCPToolCall"
  | "onMCPConnectionStatus"
  | "onAsrInitiationMetadata"
  | "onAgentChatResponsePart"
>;

export interface UseConversationReturn {
  startSession: (options?: HookOptions) => Promise<string>;
  endSession: () => Promise<void>;
  setVolume: ({ volume }: { volume: number }) => void;
  getInputByteFrequencyData: () => Uint8Array | undefined;
  getOutputByteFrequencyData: () => Uint8Array | undefined;
  getInputVolume: () => number;
  getOutputVolume: () => number;
  sendFeedback: (like: boolean) => void;
  getId: () => string | undefined;
  sendContextualUpdate: (text: string) => void;
  sendUserMessage: (text: string) => void;
  sendUserActivity: () => void;
  sendMCPToolApprovalResult: (toolCallId: string, isApproved: boolean) => void;
  changeInputDevice: (
    config: DeviceFormatConfig & DeviceInputConfig
  ) => Promise<any>;
  changeOutputDevice: (config: DeviceFormatConfig) => Promise<any>;
  status: Ref<Status>;
  canSendFeedback: Ref<boolean>;
  micMuted: Ref<boolean | undefined>;
  isSpeaking: Ref<boolean>;
}

export function useConversation<T extends HookOptions & ControlledState>(
  props: T = {} as T
): UseConversationReturn {
  const {
    micMuted: initialMicMuted,
    volume: initialVolume,
    serverLocation,
    ...defaultOptions
  } = props;

  const conversationRef = ref<Conversation | null>(null);
  const lockRef = ref<Promise<Conversation> | null>(null);
  const shouldEndRef = ref(false);

  const status = ref<Status>("disconnected");
  const canSendFeedback = ref(false);
  const mode = ref<Mode>("listening");
  const micMuted = ref(initialMicMuted);
  const volume = ref(initialVolume);

  watch(micMuted, newValue => {
    if (newValue !== undefined) {
      conversationRef.value?.setMicMuted(newValue);
    }
  });

  watch(volume, newValue => {
    if (newValue !== undefined) {
      conversationRef.value?.setVolume({ volume: newValue });
    }
  });

  onUnmounted(() => {
    shouldEndRef.value = true;
    if (lockRef.value) {
      lockRef.value.then(conv => conv.endSession());
    } else {
      conversationRef.value?.endSession();
    }
  });

  const startSession = async (options?: HookOptions): Promise<string> => {
    if (conversationRef.value?.isOpen()) {
      return conversationRef.value.getId();
    }

    if (lockRef.value) {
      const conversation = await lockRef.value;
      return conversation.getId();
    }

    shouldEndRef.value = false;

    try {
      const resolvedServerLocation = parseLocation(
        options?.serverLocation || serverLocation
      );
      const origin = getOriginForLocation(resolvedServerLocation);
      const calculatedLivekitUrl = getLivekitUrlForLocation(
        resolvedServerLocation
      );

      lockRef.value = Conversation.startSession({
        ...(defaultOptions ?? {}),
        ...(options ?? {}),
        origin,
        livekitUrl:
          options?.livekitUrl ||
          defaultOptions?.livekitUrl ||
          calculatedLivekitUrl,
        overrides: {
          ...(defaultOptions?.overrides ?? {}),
          ...(options?.overrides ?? {}),
          client: {
            ...(defaultOptions?.overrides?.client ?? {}),
            ...(options?.overrides?.client ?? {}),
            source:
              options?.overrides?.client?.source ||
              defaultOptions?.overrides?.client?.source ||
              "vue_sdk",
            version:
              options?.overrides?.client?.version ||
              defaultOptions?.overrides?.client?.version ||
              PACKAGE_VERSION,
          },
        },
        onConnect: options?.onConnect || defaultOptions?.onConnect,
        onDisconnect: options?.onDisconnect || defaultOptions?.onDisconnect,
        onError: options?.onError || defaultOptions?.onError,
        onMessage: options?.onMessage || defaultOptions?.onMessage,
        onAudio: options?.onAudio || defaultOptions?.onAudio,
        onDebug: options?.onDebug || defaultOptions?.onDebug,
        onUnhandledClientToolCall:
          options?.onUnhandledClientToolCall ||
          defaultOptions?.onUnhandledClientToolCall,
        onVadScore: options?.onVadScore || defaultOptions?.onVadScore,
        onInterruption:
          options?.onInterruption || defaultOptions?.onInterruption,
        onAgentToolRequest:
          options?.onAgentToolRequest || defaultOptions?.onAgentToolRequest,
        onAgentToolResponse:
          options?.onAgentToolResponse || defaultOptions?.onAgentToolResponse,
        onConversationMetadata:
          options?.onConversationMetadata ||
          defaultOptions?.onConversationMetadata,
        onMCPToolCall: options?.onMCPToolCall || defaultOptions?.onMCPToolCall,
        onMCPConnectionStatus:
          options?.onMCPConnectionStatus ||
          defaultOptions?.onMCPConnectionStatus,
        onAsrInitiationMetadata:
          options?.onAsrInitiationMetadata ||
          defaultOptions?.onAsrInitiationMetadata,
        onAgentChatResponsePart:
          options?.onAgentChatResponsePart ||
          defaultOptions?.onAgentChatResponsePart,
        onModeChange: ({ mode: newMode }) => {
          mode.value = newMode;
          (options?.onModeChange || defaultOptions?.onModeChange)?.({
            mode: newMode,
          });
        },
        onStatusChange: ({ status: newStatus }) => {
          status.value = newStatus;
          (options?.onStatusChange || defaultOptions?.onStatusChange)?.({
            status: newStatus,
          });
        },
        onCanSendFeedbackChange: ({ canSendFeedback: canSend }) => {
          canSendFeedback.value = canSend;
          (
            options?.onCanSendFeedbackChange ||
            defaultOptions?.onCanSendFeedbackChange
          )?.({ canSendFeedback: canSend });
        },
      } as Options);

      conversationRef.value = await lockRef.value;

      if (shouldEndRef.value) {
        await conversationRef.value.endSession();
        conversationRef.value = null;
        lockRef.value = null;
        throw new Error("Session cancelled during connection");
      }

      if (micMuted.value !== undefined) {
        conversationRef.value.setMicMuted(micMuted.value);
      }
      if (volume.value !== undefined) {
        conversationRef.value.setVolume({ volume: volume.value });
      }

      return conversationRef.value.getId();
    } finally {
      lockRef.value = null;
    }
  };

  const endSession = async () => {
    shouldEndRef.value = true;
    const pendingConnection = lockRef.value;
    const conversation = conversationRef.value;
    conversationRef.value = null;

    if (pendingConnection) {
      const conv = await pendingConnection;
      await conv.endSession();
    } else {
      await conversation?.endSession();
    }
  };

  const isSpeaking = computed(() => mode.value === "speaking");

  return {
    startSession,
    endSession,
    setVolume: ({ volume: vol }: { volume: number }) => {
      conversationRef.value?.setVolume({ volume: vol });
    },
    getInputByteFrequencyData: () => {
      return conversationRef.value?.getInputByteFrequencyData();
    },
    getOutputByteFrequencyData: () => {
      return conversationRef.value?.getOutputByteFrequencyData();
    },
    getInputVolume: () => {
      return conversationRef.value?.getInputVolume() ?? 0;
    },
    getOutputVolume: () => {
      return conversationRef.value?.getOutputVolume() ?? 0;
    },
    sendFeedback: (like: boolean) => {
      conversationRef.value?.sendFeedback(like);
    },
    getId: () => {
      return conversationRef.value?.getId();
    },
    sendContextualUpdate: (text: string) => {
      conversationRef.value?.sendContextualUpdate(text);
    },
    sendUserMessage: (text: string) => {
      conversationRef.value?.sendUserMessage(text);
    },
    sendUserActivity: () => {
      conversationRef.value?.sendUserActivity();
    },
    sendMCPToolApprovalResult: (toolCallId: string, isApproved: boolean) => {
      conversationRef.value?.sendMCPToolApprovalResult(toolCallId, isApproved);
    },
    changeInputDevice: async (
      config: DeviceFormatConfig & DeviceInputConfig
    ) => {
      if (
        conversationRef.value &&
        "changeInputDevice" in conversationRef.value
      ) {
        return await (
          conversationRef.value as unknown as {
            changeInputDevice: (config: any) => Promise<any>;
          }
        ).changeInputDevice(config);
      }
      throw new Error(
        "Device switching is only available for voice conversations"
      );
    },
    changeOutputDevice: async (config: DeviceFormatConfig) => {
      if (
        conversationRef.value &&
        "changeOutputDevice" in conversationRef.value
      ) {
        return await (
          conversationRef.value as unknown as {
            changeOutputDevice: (config: any) => Promise<any>;
          }
        ).changeOutputDevice(config);
      }
      throw new Error(
        "Device switching is only available for voice conversations"
      );
    },
    status,
    canSendFeedback,
    micMuted,
    isSpeaking,
  };
}
