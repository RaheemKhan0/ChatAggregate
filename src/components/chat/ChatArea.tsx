"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@/hooks/useChat";
import { useConversationsContext } from "@/contexts/ConversationsContext";
import { MessageBubble } from "./MessageBubble";
import { StreamingMessage } from "./StreamingMessage";
import { ChatInput } from "./ChatInput";

interface ChatAreaProps {
  conversationId?: string;
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const {
    messages,
    isStreaming,
    streamingContent,
    selectedModel,
    setSelectedModel,
    sendMessage,
    stopStreaming,
    loadConversation,
  } = useChat(conversationId);

  const { refresh: refreshConversations } = useConversationsContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasStreaming = useRef(false);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId, loadConversation]);

  // Sync the sidebar once a send cycle finishes (covers new conversations
  // appearing and title/order updates from the title-on-first-message logic).
  useEffect(() => {
    if (wasStreaming.current && !isStreaming) {
      refreshConversations();
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming, refreshConversations]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-400">Chat</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && !isStreaming && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                  ChatAggregate
                </h3>
                <p className="text-zinc-500">
                  Select a model and start chatting
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isStreaming && <StreamingMessage content={streamingContent} />}
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
    </div>
  );
}
