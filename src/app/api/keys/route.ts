import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

const VALID_PROVIDERS = ["anthropic", "openai", "gemini"];

// GET: list which providers the user has keys for (not the actual keys)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await db.userApiKey.findMany({
    where: { userId: session.user.id },
    select: { provider: true, updatedAt: true },
  });

  return NextResponse.json(keys);
}

// POST: add or update a key for a provider
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider, apiKey } = await req.json();

  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  const encryptedKey = encrypt(apiKey.trim());

  await db.userApiKey.upsert({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider,
      },
    },
    update: { encryptedKey },
    create: {
      userId: session.user.id,
      provider,
      encryptedKey,
    },
  });

  return NextResponse.json({ success: true });
}

// DELETE: remove a key for a provider
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await req.json();

  await db.userApiKey.deleteMany({
    where: { userId: session.user.id, provider },
  });

  return NextResponse.json({ success: true });
}
