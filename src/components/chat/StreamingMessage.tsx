"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  if (!content) return null;

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-zinc-800 text-zinc-100 border border-zinc-700">
        <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-zinc-900 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-sm">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
        <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-1" />
      </div>
    </div>
  );
}
