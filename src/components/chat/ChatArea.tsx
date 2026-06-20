"use client";

import { useEffect, useRef, useCallback } from "react";
import { useChat } from "@/hooks/useChat";
import { useConversationsContext } from "@/contexts/ConversationsContext";
import { MessageBubble } from "./MessageBubble";
import { StreamingMessage } from "./StreamingMessage";
import { ChatInput } from "./ChatInput";
import { ResizablePanes } from "./ResizablePanes";
import { GitGraphPane } from "./GitGraphPane";

interface ChatAreaProps {
  conversationId?: string;
  projectId?: string;
}

export function ChatArea({ conversationId, projectId }: ChatAreaProps) {
  const {
    messages,
    allMessages,
    branches,
    isStreaming,
    streamingContent,
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
  } = useChat(conversationId, projectId);

  const { refresh: refreshConversations } = useConversationsContext();
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const wasStreaming = useRef(false);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId, loadConversation]);

  useEffect(() => {
    if (wasStreaming.current && !isStreaming) {
      refreshConversations();
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming, refreshConversations]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesScrollRef.current) {
      messagesScrollRef.current.scrollTop =
        messagesScrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Click node in graph → scroll right pane to that message
  const handleNodeClick = useCallback((messageId: string) => {
    if (!messagesScrollRef.current) return;
    const el = messagesScrollRef.current.querySelector(
      `[data-message-id="${messageId}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const hasMessages = allMessages.length > 0;

  const rightPane = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 flex-shrink-0">
        <h2 className="text-sm font-medium text-zinc-400">Chat</h2>
        {forkPointId && (
          <span className="text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-800 px-2 py-1 rounded-full">
            Forking from message...
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesScrollRef}
        className="flex-1 overflow-y-auto p-4"
      >
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
            <MessageBubble
              key={msg.id}
              message={msg}
              siblingInfo={getSiblingInfo(msg.id)}
              onSwitchBranch={switchBranch}
              onFork={forkFrom}
              isForkPoint={forkPointId === msg.id}
            />
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

  if (!hasMessages) {
    return rightPane;
  }

  return (
    <ResizablePanes
      left={
        <GitGraphPane
          allMessages={allMessages}
          activePath={messages}
          branches={branches}
          activeLeafId={activeLeafId}
          onSelectBranch={selectBranch}
          onCreateBranch={createBranch}
          onNodeClick={handleNodeClick}
        />
      }
      right={rightPane}
    />
  );
}
