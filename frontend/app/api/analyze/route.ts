import { revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { analyzeWithMockCache } from "@/lib/mock-data";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/types";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:18000";

export async function POST(request: Request) {
  let payload: AnalyzeRequest;

  try {
    payload = (await request.json()) as AnalyzeRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.text || payload.text.trim().length === 0) {
    return Response.json({ error: "Post text is required" }, { status: 400 });
  }

  const result = await proxyAnalyze(payload).catch(() => analyzeWithMockCache(payload));

  revalidateTag(CACHE_TAGS.deals, "max");
  if (result.id) {
    revalidateTag(CACHE_TAGS.deal(result.id), "max");
  }

  return Response.json(result);
}

async function proxyAnalyze(payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Analyze failed: ${response.status}`);
  }

  return response.json() as Promise<AnalyzeResponse>;
}
