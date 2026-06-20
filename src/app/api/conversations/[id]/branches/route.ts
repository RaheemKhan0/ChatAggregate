import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await db.conversation.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const branches = await db.branch.findMany({
    where: { conversationId: id },
    select: { id: true, name: true, leafMessageId: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(branches);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name, leafMessageId } = await req.json();

  if (!name || !leafMessageId) {
    return NextResponse.json(
      { error: "name and leafMessageId are required" },
      { status: 400 }
    );
  }

  const conversation = await db.conversation.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify message exists in this conversation
  const message = await db.message.findFirst({
    where: { id: leafMessageId, conversationId: id },
  });
  if (!message) {
    return NextResponse.json(
      { error: "Message not found in this conversation" },
      { status: 404 }
    );
  }

  // Check for duplicate name
  const existingName = await db.branch.findUnique({
    where: { conversationId_name: { conversationId: id, name } },
  });
  if (existingName) {
    return NextResponse.json(
      { error: "Branch name already exists" },
      { status: 409 }
    );
  }

  // Check if this message already has a branch
  const existingMessage = await db.branch.findFirst({
    where: { conversationId: id, leafMessageId },
  });
  if (existingMessage) {
    return NextResponse.json(
      { error: "This message already has a branch" },
      { status: 409 }
    );
  }

  const branch = await db.branch.create({
    data: { name, conversationId: id, leafMessageId },
    select: { id: true, name: true, leafMessageId: true },
  });

  return NextResponse.json(branch);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name } = await req.json();

  const conversation = await db.conversation.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.branch.deleteMany({
    where: { conversationId: id, name },
  });

  return NextResponse.json({ success: true });
}
