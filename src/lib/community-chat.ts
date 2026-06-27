import { getApiUrl } from "@/lib/api-config";

export type CommunityChatMessage = {
  id: string;
  text: string;
  topic: string | null;
  createdAt: string;
  user: {
    username: string;
    role: string;
    isGuest: boolean;
  };
};

type CommunityChatResponse = {
  messages: CommunityChatMessage[];
};

export async function fetchCommunityMessages(): Promise<CommunityChatMessage[]> {
  const response = await fetch(getApiUrl("/api/chat/messages"));
  if (!response.ok) {
    throw new Error(`Failed to load community chat (${response.status})`);
  }

  const payload = (await response.json()) as CommunityChatResponse;
  return Array.isArray(payload.messages) ? payload.messages : [];
}

export async function postCommunityMessage(input: {
  text: string;
  topic?: string | null;
}): Promise<CommunityChatMessage> {
  const response = await fetch(getApiUrl("/api/chat/messages"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as
    | { message?: CommunityChatMessage; error?: string }
    | undefined;

  if (!response.ok || !payload?.message) {
    throw new Error(payload?.error || "Failed to send community message");
  }

  return payload.message;
}
