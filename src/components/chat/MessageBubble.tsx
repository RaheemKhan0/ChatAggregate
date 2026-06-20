"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/types";

interface SiblingInfo {
  siblings: ChatMessage[];
  currentIndex: number;
}

interface MessageBubbleProps {
  message: ChatMessage;
  siblingInfo?: SiblingInfo | null;
  onSwitchBranch?: (messageId: string) => void;
  onFork?: (messageId: string) => void;
  isForkPoint?: boolean;
}

export function MessageBubble({
  message,
  siblingInfo,
  onSwitchBranch,
  onFork,
  isForkPoint,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div data-message-id={message.id} className={`group flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className="flex flex-col max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-100 border border-zinc-700"
          } ${isForkPoint ? "ring-2 ring-yellow-500/50" : ""}`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-zinc-900 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-sm">
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>
          )}
          {message.model && !isUser && (
            <p className="text-xs text-zinc-500 mt-2">
              {message.model.split("/").pop()}
            </p>
          )}
        </div>

        {/* Branch indicator + Fork button row */}
        <div className="flex items-center justify-between mt-1 px-1">
          {/* Branch navigation */}
          {siblingInfo && siblingInfo.siblings.length > 1 ? (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <button
                onClick={() => {
                  const prevIndex = siblingInfo.currentIndex - 1;
                  if (prevIndex >= 0) {
                    onSwitchBranch?.(siblingInfo.siblings[prevIndex].id);
                  }
                }}
                disabled={siblingInfo.currentIndex === 0}
                className="px-1.5 py-0.5 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                &larr;
              </button>
              <span className="tabular-nums">
                {siblingInfo.currentIndex + 1}/{siblingInfo.siblings.length}
              </span>
              <button
                onClick={() => {
                  const nextIndex = siblingInfo.currentIndex + 1;
                  if (nextIndex < siblingInfo.siblings.length) {
                    onSwitchBranch?.(siblingInfo.siblings[nextIndex].id);
                  }
                }}
                disabled={
                  siblingInfo.currentIndex === siblingInfo.siblings.length - 1
                }
                className="px-1.5 py-0.5 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                &rarr;
              </button>
            </div>
          ) : (
            <div />
          )}

          {/* Fork button */}
          {onFork && (
            <button
              onClick={() => onFork(message.id)}
              className="opacity-0 group-hover:opacity-100 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-0.5 transition-opacity"
              title="Branch from here"
            >
              <svg
                className="w-3.5 h-3.5 inline mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Fork
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
