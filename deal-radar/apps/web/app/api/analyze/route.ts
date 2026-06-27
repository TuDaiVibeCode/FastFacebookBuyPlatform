import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { analyzePost } from "@/lib/api";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { AnalyzeRequest } from "@/lib/types";

export async function POST(request: Request) {
  let payload: AnalyzeRequest;

  try {
    payload = (await request.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.text || payload.text.trim().length === 0) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  try {
    const result = await analyzePost({
      ...payload,
      text: payload.text.trim(),
      source: payload.source || "sample",
    });

    revalidateTag(CACHE_TAGS.deals, "max");
    revalidateTag(CACHE_TAGS.deal(result.id), "max");

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backend is unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
