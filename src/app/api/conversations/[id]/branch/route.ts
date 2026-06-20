import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { activeLeafId } = await req.json();

  if (!activeLeafId) {
    return NextResponse.json({ error: "activeLeafId is required" }, { status: 400 });
  }

  // Verify conversation ownership and that the message belongs to this conversation
  const conversation = await db.conversation.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const message = await db.message.findFirst({
    where: { id: activeLeafId, conversationId: id },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found in this conversation" }, { status: 404 });
  }

  await db.conversation.update({
    where: { id },
    data: { activeLeafId },
  });

  return NextResponse.json({ success: true });
}
