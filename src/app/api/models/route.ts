import { NextResponse } from "next/server";
import { getAllModels } from "@/lib/llm/registry";

export async function GET() {
  const models = getAllModels();
  return NextResponse.json(models);
}
