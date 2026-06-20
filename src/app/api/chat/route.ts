import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createProvider, parseModelString } from "@/lib/llm/registry";
import { decrypt } from "@/lib/crypto";
import { getMessagePath, getActiveLeafId } from "@/lib/messages";
import type { LLMMessage } from "@/lib/llm/types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { conversationId, parentMessageId, message, model } = await req.json();

  if (!message || !model) {
    return new Response("Missing message or model", { status: 400 });
  }

  const { providerId, modelId } = parseModelString(model);

  // Get user's API key for this provider
  const userKey = await db.userApiKey.findUnique({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider: providerId,
      },
    },
  });

  if (!userKey) {
    return new Response(
      `No API key configured for ${providerId}. Add one in Settings.`,
      { status: 400 }
    );
  }

  const apiKey = decrypt(userKey.encryptedKey);
  const provider = createProvider(providerId, apiKey);

  // Get or create conversation
  let convId = conversationId;
  if (!convId) {
    const conversation = await db.conversation.create({
      data: {
        userId: session.user.id,
        model,
        title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
      },
    });
    convId = conversation.id;
  } else {
    // Verify ownership
    const existing = await db.conversation.findFirst({
      where: { id: convId, userId: session.user.id },
    });
    if (!existing) {
      return new Response("Conversation not found", { status: 404 });
    }
    // Update model if changed
    await db.conversation.update({
      where: { id: convId },
      data: { model },
    });
  }

  // Determine the parent for the new user message
  // If parentMessageId is provided, fork from that message
  // Otherwise, append to the active leaf
  let resolvedParentId: string | null = parentMessageId ?? null;
  if (!resolvedParentId && convId) {
    resolvedParentId = await getActiveLeafId(convId);
  }

  // Save user message
  const userMsg = await db.message.create({
    data: {
      conversationId: convId,
      parentMessageId: resolvedParentId,
      role: "user",
      content: message,
    },
  });

  // Build context by walking up the tree from the user message
  const history = await getMessagePath(userMsg.id);

  const llmMessages: LLMMessage[] = history.map((m) => ({
    role: m.role as LLMMessage["role"],
    content: m.content,
  }));

  // Log the request
  console.log(`[Chat API] Provider: ${providerId} | Model: ${modelId} | User: ${session.user.email} | Messages: ${llmMessages.length} | Conversation: ${convId}`);
  console.log(`[Chat API] Last message: "${message.slice(0, 100)}${message.length > 100 ? "..." : ""}"`);

  // Stream response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";
      try {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "conversation_id",
              conversationId: convId,
              userMessageId: userMsg.id,
            })}\n\n`
          )
        );

        for await (const event of provider.streamChat({
          model: modelId,
          messages: llmMessages,
        })) {
          if (event.type === "text_delta" && event.text) {
            fullResponse += event.text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          }
        }

        // Save assistant message as child of the user message
        const assistantMsg = await db.message.create({
          data: {
            conversationId: convId,
            parentMessageId: userMsg.id,
            role: "assistant",
            content: fullResponse,
            model,
          },
        });

        // Update the active leaf to the new assistant message
        await db.conversation.update({
          where: { id: convId },
          data: { activeLeafId: assistantMsg.id },
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              assistantMessageId: assistantMsg.id,
            })}\n\n`
          )
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
