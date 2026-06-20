import type { ChatMessage } from "@/types";

/**
 * Build a map of parentMessageId -> children messages.
 */
export function buildChildrenMap(
  messages: ChatMessage[]
): Map<string | null, ChatMessage[]> {
  const map = new Map<string | null, ChatMessage[]>();
  for (const msg of messages) {
    const parentId = msg.parentMessageId ?? null;
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId)!.push(msg);
  }
  return map;
}

/**
 * Build a map of messageId -> message for quick lookups.
 */
export function buildMessageMap(
  messages: ChatMessage[]
): Map<string, ChatMessage> {
  const map = new Map<string, ChatMessage>();
  for (const msg of messages) {
    map.set(msg.id, msg);
  }
  return map;
}

/**
 * Get the path from root to a specific message by walking up parent pointers.
 */
export function getPathToMessage(
  messages: ChatMessage[],
  targetId: string
): ChatMessage[] {
  const messageMap = buildMessageMap(messages);
  const path: ChatMessage[] = [];

  let current = messageMap.get(targetId);
  while (current) {
    path.unshift(current);
    current = current.parentMessageId
      ? messageMap.get(current.parentMessageId)
      : undefined;
  }

  return path;
}

/**
 * Get sibling messages (messages sharing the same parent).
 * Returns them sorted by createdAt.
 */
export function getSiblings(
  messages: ChatMessage[],
  messageId: string
): ChatMessage[] {
  const messageMap = buildMessageMap(messages);
  const msg = messageMap.get(messageId);
  if (!msg) return [];

  const parentId = msg.parentMessageId ?? null;
  return messages
    .filter((m) => (m.parentMessageId ?? null) === parentId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

/**
 * Given a path and a fork point, find the leaf of a sibling branch.
 * When user switches branch at a fork, we need to follow that sibling
 * down to its leaf to get the full new path.
 */
export function getLeafOfBranch(
  messages: ChatMessage[],
  branchStartId: string
): string {
  const childrenMap = buildChildrenMap(messages);

  let currentId = branchStartId;
  while (true) {
    const children = childrenMap.get(currentId);
    if (!children || children.length === 0) break;
    // Follow the first (oldest) child down the branch
    currentId = children.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0].id;
  }

  return currentId;
}
