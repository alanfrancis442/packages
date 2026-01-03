import { Conversation } from "@elevenlabs/client";
import { useConversation } from "../index";
import { vi, describe, beforeEach, it, expect } from "vitest";

vi.mock("@elevenlabs/client", () => ({
  Conversation: {
    startSession: vi.fn(),
  },
}));

const createMockConversation = (id = "test-id") => ({
  getId: vi.fn().mockReturnValue(id),
  isOpen: vi.fn().mockReturnValue(true),
  endSession: vi.fn().mockResolvedValue(undefined),
  setMicMuted: vi.fn(),
  setVolume: vi.fn(),
});

describe("useConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws error when session is cancelled during connection", async () => {
    const mockConversation = createMockConversation();
    let resolveStartSession!: (value: typeof mockConversation) => void;
    const startSessionPromise = new Promise<typeof mockConversation>(
      resolve => {
        resolveStartSession = resolve;
      }
    );
    (Conversation.startSession as ReturnType<typeof vi.fn>).mockReturnValue(
      startSessionPromise
    );

    const { startSession, endSession } = useConversation({
      signedUrl: "wss://test.example.com",
    });

    let startSessionError: Error | undefined;
    const startPromise = startSession().catch(e => {
      startSessionError = e;
    });

    const endPromise = endSession();

    resolveStartSession(mockConversation);

    await Promise.all([startPromise, endPromise]);

    expect(startSessionError).toBeDefined();
    expect(startSessionError?.message).toBe(
      "Session cancelled during connection"
    );
    expect(mockConversation.endSession).toHaveBeenCalled();
  });

  it("resets lockRef when session is cancelled, allowing new connections", async () => {
    const mockConversation1 = createMockConversation("first-id");
    const mockConversation2 = createMockConversation("second-id");

    let resolveFirst!: (value: typeof mockConversation1) => void;
    const firstConnectionPromise = new Promise<typeof mockConversation1>(
      resolve => {
        resolveFirst = resolve;
      }
    );
    (Conversation.startSession as ReturnType<typeof vi.fn>).mockReturnValue(
      firstConnectionPromise
    );

    const { startSession, endSession } = useConversation({
      signedUrl: "wss://test.example.com",
    });

    const firstStart = startSession().catch(() => {});
    const endSessionPromise = endSession();

    resolveFirst(mockConversation1);
    await Promise.all([firstStart, endSessionPromise]);

    expect(mockConversation1.endSession).toHaveBeenCalled();

    (Conversation.startSession as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockConversation2
    );

    const secondSessionId = await startSession();

    expect(secondSessionId).toBe("second-id");
    expect(Conversation.startSession).toHaveBeenCalledTimes(2);
  });
});
