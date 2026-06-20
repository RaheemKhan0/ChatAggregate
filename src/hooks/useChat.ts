"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage, Branch } from "@/types";
import {
  getPathToMessage,
  getSiblings,
  getLeafOfBranch,
} from "@/lib/tree";

export function useChat(initialConversationId?: string) {
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [activePath, setActivePath] = useState<ChatMessage[]>([]);
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  );
  const [selectedModel, setSelectedModel] = useState(
    "anthropic/claude-sonnet-4-6"
  );
  const [forkPointId, setForkPointId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadConversation = useCallback(async (convId: string) => {
    const res = await fetch(`/api/conversations/${convId}`);
    if (res.ok) {
      const data = await res.json();
      const messages: ChatMessage[] = data.messages.map(
        (m: ChatMessage) => ({
          id: m.id,
          parentMessageId: m.parentMessageId,
          role: m.role,
          content: m.content,
          model: m.model,
          createdAt: m.createdAt,
        })
      );
      setAllMessages(messages);
      setConversationId(convId);
      setSelectedModel(data.model);
      setBranches(data.branches || []);

      const leafId = data.activeLeafId || null;
      setActiveLeafId(leafId);
      if (leafId) {
        setActivePath(getPathToMessage(messages, leafId));
      } else if (messages.length > 0) {
        setActivePath(messages);
      }
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const parentId = forkPointId || activeLeafId;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        parentMessageId: parentId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      setAllMessages((prev) => [...prev, userMessage]);
      if (parentId) {
        const newPath = [
          ...getPathToMessage([...allMessages, userMessage], parentId),
          userMessage,
        ];
        setActivePath(newPath);
      } else {
        setActivePath((prev) => [...prev, userMessage]);
      }

      setIsStreaming(true);
      setStreamingContent("");
      setForkPointId(null);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            parentMessageId: parentId,
            message: content,
            model: selectedModel,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let newConvId = conversationId;
        let serverUserMsgId: string | undefined;
        let serverAssistantMsgId: string | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === "conversation_id") {
                newConvId = event.conversationId;
                serverUserMsgId = event.userMessageId;
                setConversationId(newConvId);
              } else if (event.type === "text_delta" && event.text) {
                accumulated += event.text;
                setStreamingContent(accumulated);
              } else if (event.type === "done") {
                serverAssistantMsgId = event.assistantMessageId;
              } else if (event.type === "error") {
                throw new Error(event.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }

        const assistantMessage: ChatMessage = {
          id: serverAssistantMsgId || crypto.randomUUID(),
          parentMessageId: serverUserMsgId || userMessage.id,
          role: "assistant",
          content: accumulated,
          model: selectedModel,
          createdAt: new Date().toISOString(),
        };

        setAllMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === userMessage.id && serverUserMsgId
              ? { ...m, id: serverUserMsgId }
              : m
          );
          const withAssistant = [...updated, assistantMessage];
          setActivePath(getPathToMessage(withAssistant, assistantMessage.id));
          return withAssistant;
        });

        setActiveLeafId(assistantMessage.id);

        if (newConvId && newConvId !== conversationId) {
          window.history.replaceState(null, "", `/chat/${newConvId}`);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          parentMessageId: userMessage.id,
          role: "assistant",
          content: `Error: ${(error as Error).message}`,
          createdAt: new Date().toISOString(),
        };
        setAllMessages((prev) => [...prev, errorMessage]);
        setActivePath((prev) => [...prev, errorMessage]);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortRef.current = null;
      }
    },
    [conversationId, selectedModel, isStreaming, activeLeafId, forkPointId, allMessages]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const switchBranch = useCallback(
    async (siblingId: string) => {
      const leafId = getLeafOfBranch(allMessages, siblingId);
      setActiveLeafId(leafId);
      setActivePath(getPathToMessage(allMessages, leafId));

      if (conversationId) {
        fetch(`/api/conversations/${conversationId}/branch`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeLeafId: leafId }),
        });
      }
    },
    [allMessages, conversationId]
  );

  const selectBranch = useCallback(
    async (branch: Branch) => {
      setActiveLeafId(branch.leafMessageId);
      setActivePath(getPathToMessage(allMessages, branch.leafMessageId));

      if (conversationId) {
        fetch(`/api/conversations/${conversationId}/branch`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeLeafId: branch.leafMessageId }),
        });
      }
    },
    [allMessages, conversationId]
  );

  const createBranch = useCallback(
    async (name: string, messageId: string) => {
      if (!conversationId) return;
      const res = await fetch(
        `/api/conversations/${conversationId}/branches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, leafMessageId: messageId }),
        }
      );
      if (res.ok) {
        const branch = await res.json();
        setBranches((prev) => [...prev, branch]);
      }
    },
    [conversationId]
  );

  const forkFrom = useCallback((messageId: string) => {
    setForkPointId(messageId);
  }, []);

  const getSiblingInfo = useCallback(
    (messageId: string) => {
      const siblings = getSiblings(allMessages, messageId);
      if (siblings.length <= 1) return null;
      const currentIndex = siblings.findIndex((s) => s.id === messageId);
      return { siblings, currentIndex };
    },
    [allMessages]
  );

  return {
    messages: activePath,
    allMessages,
    branches,
    isStreaming,
    streamingContent,
    conversationId,
    selectedModel,
    activeLeafId,
    forkPointId,
    setSelectedModel,
    sendMessage,
    stopStreaming,
    loadConversation,
    switchBranch,
    selectBranch,
    createBranch,
    forkFrom,
    getSiblingInfo,
  };
}
