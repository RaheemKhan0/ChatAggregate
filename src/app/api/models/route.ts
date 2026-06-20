import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAllModels, getModelsForProviders } from "@/lib/llm/registry";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    // Return all models for unauthenticated requests (login page etc.)
    return NextResponse.json(getAllModels());
  }

  // Return only models for providers the user has keys configured
  const userKeys = await db.userApiKey.findMany({
    where: { userId: session.user.id },
    select: { provider: true },
  });

  const providerIds = userKeys.map((k) => k.provider);

  if (providerIds.length === 0) {
    return NextResponse.json([]);
  }

  return NextResponse.json(getModelsForProviders(providerIds));
}
