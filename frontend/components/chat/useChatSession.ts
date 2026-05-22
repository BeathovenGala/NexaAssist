"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveChatSession,
  cancelChatPending,
  confirmChatAction,
  createChatSession,
  getChatSession,
  listChatSessions,
  selectChatSlot,
  sendChatMessage,
  type ChatMessage,
  type ChatSession,
  type ChatSuggestion,
} from "@/lib/chat";
import { apiErrorMessage } from "@/lib/apiEnvelope";
import { useAuth } from "@/lib/auth";
import { getStarterChips } from "@/lib/chatQuickActions";
import { useToastStore } from "@/lib/store/toast";

export function useChatSession() {
  const { user } = useAuth();
  const toast = useToastStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);

  const starterChips = useMemo(() => getStarterChips(user), [user]);

  const followUpSuggestions = useMemo((): ChatSuggestion[] => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "ASSISTANT" && m.metadata?.suggestions?.length) {
        return m.metadata.suggestions;
      }
    }
    return [];
  }, [messages]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await listChatSessions();
      setSessions(data.items);
    } catch (err) {
      toast.show(apiErrorMessage(err, "Could not load conversations"), "error");
    }
  }, [toast]);

  const loadSession = useCallback(
    async (id: string) => {
      try {
        const session = await getChatSession(id);
        setMessages(session.messages ?? []);
        setPendingConfirmation(
          Boolean(
            session.conversationState?.pendingTool ||
              session.messages?.some((m) => m.metadata?.pendingConfirmation),
          ),
        );
      } catch (err) {
        toast.show(apiErrorMessage(err, "Could not load conversation"), "error");
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (activeId) void loadSession(activeId);
    else {
      setMessages([]);
      setPendingConfirmation(false);
    }
  }, [activeId, loadSession]);

  useEffect(() => {
    if (activeId || sessions.length === 0) return;
    if (!sessions.some((s) => s.id === activeId)) {
      setActiveId(sessions[0]?.id ?? null);
    }
  }, [sessions, activeId]);

  async function handleNewSession() {
    try {
      const session = await createChatSession();
      setSessions((prev) => [session, ...prev]);
      setActiveId(session.id);
      setMessages([]);
      setPendingConfirmation(false);
    } catch (err) {
      toast.show(apiErrorMessage(err, "Could not start conversation"), "error");
    }
  }

  async function handleArchiveSession(sessionId: string) {
    try {
      await archiveChatSession(sessionId);
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);
      if (activeId === sessionId) {
        setActiveId(remaining[0]?.id ?? null);
        setMessages([]);
        setPendingConfirmation(false);
      }
      toast.show("Conversation removed");
    } catch (err) {
      toast.show(apiErrorMessage(err, "Could not delete conversation"), "error");
    }
  }

  async function handleSend(content: string) {
    if (!activeId) {
      const session = await createChatSession();
      setActiveId(session.id);
      setSessions((prev) => [session, ...prev]);
      await sendTo(session.id, content);
      return;
    }
    await sendTo(activeId, content);
  }

  async function sendTo(sessionId: string, content: string) {
    setBusy(true);
    const optimisticUser: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "USER",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    try {
      const res = await sendChatMessage(sessionId, content);
      const assistant: ChatMessage = {
        id: res.assistantMessageId,
        role: "ASSISTANT",
        content: res.content,
        metadata: res.metadata,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        optimisticUser,
        assistant,
      ]);
      setPendingConfirmation(Boolean(res.metadata?.pendingConfirmation));
      void loadSessions();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      toast.show(apiErrorMessage(err, "Message failed"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectSlot(start: string, end: string) {
    if (!activeId) return;
    setBusy(true);
    try {
      const res = await selectChatSlot(activeId, start, end);
      const assistant: ChatMessage = {
        id: res.assistantMessageId,
        role: "ASSISTANT",
        content: res.content,
        metadata: res.metadata,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistant]);
      setPendingConfirmation(Boolean(res.metadata?.pendingConfirmation));
    } catch (err) {
      toast.show(apiErrorMessage(err, "Could not select slot"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!activeId) return;
    setBusy(true);
    try {
      const res = await confirmChatAction(activeId);
      const assistant: ChatMessage = {
        id: res.assistantMessageId,
        role: "ASSISTANT",
        content: res.result.content,
        metadata: res.result.metadata,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistant]);
      setPendingConfirmation(false);
    } catch (err) {
      toast.show(apiErrorMessage(err, "Confirm failed"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelPending() {
    if (!activeId) return;
    setBusy(true);
    try {
      const res = await cancelChatPending(activeId);
      const assistant: ChatMessage = {
        id: res.assistantMessageId,
        role: "ASSISTANT",
        content: res.result.content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistant]);
      setPendingConfirmation(false);
    } catch (err) {
      toast.show(apiErrorMessage(err, "Cancel failed"), "error");
    } finally {
      setBusy(false);
    }
  }

  return {
    sessions,
    activeId,
    setActiveId,
    messages,
    pendingConfirmation,
    busy,
    starterChips,
    followUpSuggestions,
    handleNewSession,
    handleArchiveSession,
    handleSend,
    handleSelectSlot,
    handleConfirm,
    handleCancelPending,
    loadSessions,
  };
}
