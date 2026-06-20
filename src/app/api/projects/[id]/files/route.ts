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

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const files = await db.projectFile.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, type: true, size: true, createdAt: true },
  });

  return NextResponse.json(files);
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

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  let content: string;
  try {
    content = await file.text();
  } catch {
    content = `[Binary file — content not extractable: ${file.name}]`;
  }

  const projectFile = await db.projectFile.create({
    data: {
      projectId: id,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      content,
    },
    select: { id: true, name: true, type: true, size: true, createdAt: true },
  });

  return NextResponse.json(projectFile);
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
  const { fileId } = await req.json();

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.projectFile.deleteMany({
    where: { id: fileId, projectId: id },
  });

  return NextResponse.json({ success: true });
}
