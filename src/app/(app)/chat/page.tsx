"use client";

import { useSearchParams } from "next/navigation";
import { ChatArea } from "@/components/chat/ChatArea";

export default function NewChatPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") || undefined;
  return <ChatArea projectId={projectId} />;
}
