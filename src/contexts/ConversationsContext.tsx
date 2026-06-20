"use client";

import { createContext, useContext } from "react";
import { useConversations } from "@/hooks/useConversations";

type ConversationsContextValue = ReturnType<typeof useConversations>;

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const value = useConversations();
  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversationsContext() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) {
    throw new Error("useConversationsContext must be used within a ConversationsProvider");
  }
  return ctx;
}
