import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createProvider, parseModelString } from "@/lib/llm/registry";
import { decrypt } from "@/lib/crypto";
import type { LLMMessage } from "@/lib/llm/types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { conversationId, message, model } = await req.json();

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

  // Save user message
  await db.message.create({
    data: {
      conversationId: convId,
      role: "user",
      content: message,
    },
  });

  // Load conversation history
  const history = await db.message.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "asc" },
  });

  const llmMessages: LLMMessage[] = history.map((m) => ({
    role: m.role as LLMMessage["role"],
    content: m.content,
  }));

  // Stream response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";
      try {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "conversation_id", conversationId: convId })}\n\n`
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

        // Save assistant message
        await db.message.create({
          data: {
            conversationId: convId,
            role: "assistant",
            content: fullResponse,
            model,
          },
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
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
