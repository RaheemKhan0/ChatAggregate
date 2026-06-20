import { db } from "./db";

/**
 * Walk up the message tree from a given message to the root.
 * Returns messages in chronological order (root first).
 */
export async function getMessagePath(messageId: string) {
  // Use recursive CTE for single-query tree walking
  const messages = await db.$queryRaw<
    Array<{
      id: string;
      conversationId: string;
      parentMessageId: string | null;
      role: string;
      content: string;
      model: string | null;
      createdAt: Date;
    }>
  >`
    WITH RECURSIVE path AS (
      SELECT id, "conversationId", "parentMessageId", role, content, model, "createdAt"
      FROM "Message"
      WHERE id = ${messageId}

      UNION ALL

      SELECT m.id, m."conversationId", m."parentMessageId", m.role, m.content, m.model, m."createdAt"
      FROM "Message" m
      INNER JOIN path p ON m.id = p."parentMessageId"
    )
    SELECT * FROM path ORDER BY "createdAt" ASC
  `;

  return messages;
}

/**
 * Find the leaf message of the active branch for a conversation.
 * If activeLeafId is set, returns it. Otherwise finds the latest message.
 */
export async function getActiveLeafId(conversationId: string): Promise<string | null> {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { activeLeafId: true },
  });

  if (conversation?.activeLeafId) {
    return conversation.activeLeafId;
  }

  // Fallback: find the latest message with no children
  const leaf = await db.message.findFirst({
    where: {
      conversationId,
      children: { none: {} },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return leaf?.id ?? null;
}
