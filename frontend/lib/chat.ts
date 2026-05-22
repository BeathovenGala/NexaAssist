import { apiGet, apiPost, apiDelete } from "@/lib/apiEnvelope";

export type ChatCard =
  | {
      type: "slot_picker";
      slots: { start: string; end: string; label: string }[];
      staffName?: string;
      date?: string;
    }
  | {
      type: "booking_summary";
      staffName: string;
      date: string;
      time: string;
      appointmentCode?: string;
    }
  | {
      type: "inventory_results";
      items: { id: string; name: string; sku: string; quantity: number; status: string }[];
    }
  | {
      type: "staff_picker";
      staff: { id: string; label: string }[];
    }
  | {
      type: "confirmation";
      tool: string;
      summary: string;
    };

export type ChatSuggestion = { label: string; message: string };

export type ChatMessageMetadata = {
  cards?: ChatCard[];
  pendingConfirmation?: boolean;
  workflow?: string;
  step?: string;
  suggestions?: ChatSuggestion[];
};

export type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  content: string;
  metadata?: ChatMessageMetadata | null;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  conversationState?: {
    workflow: string;
    step: string;
    pendingTool: string | null;
  } | null;
};

export async function listChatSessions() {
  return apiGet<{ items: ChatSession[]; total: number }>("/chat/sessions");
}

export async function createChatSession(title?: string) {
  return apiPost<ChatSession>("/chat/sessions", { title });
}

export async function getChatSession(id: string) {
  return apiGet<ChatSession>(`/chat/sessions/${id}`);
}

export async function sendChatMessage(sessionId: string, content: string) {
  return apiPost<{
    userMessageId: string;
    assistantMessageId: string;
    content: string;
    metadata?: ChatMessageMetadata;
  }>(`/chat/sessions/${sessionId}/messages`, { content });
}

export async function confirmChatAction(sessionId: string) {
  return apiPost<{
    assistantMessageId: string;
    result: { content: string; metadata?: ChatMessageMetadata };
  }>(`/chat/sessions/${sessionId}/confirm`, {});
}

export async function cancelChatPending(sessionId: string) {
  return apiPost<{
    assistantMessageId: string;
    result: { content: string };
  }>(`/chat/sessions/${sessionId}/cancel-pending`, {});
}

export async function selectChatSlot(
  sessionId: string,
  startTime: string,
  endTime: string,
) {
  return apiPost<{
    userMessageId: string;
    assistantMessageId: string;
    content: string;
    metadata?: ChatMessageMetadata;
  }>(`/chat/sessions/${sessionId}/select-slot`, { startTime, endTime });
}

export async function archiveChatSession(sessionId: string) {
  return apiDelete<{ id: string; status: string }>(`/chat/sessions/${sessionId}`);
}
