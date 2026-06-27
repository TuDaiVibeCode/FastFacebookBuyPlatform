import { revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/types";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:18000";
const ALLOW_ANALYZE_MOCK_FALLBACK = ["1", "true", "yes", "on"].includes(
  (process.env.ALLOW_ANALYZE_MOCK_FALLBACK ?? "").toLowerCase(),
);

export async function POST(request: Request) {
  let payload: AnalyzeRequest;
  const authHeader = request.headers.get("authorization");

  try {
    payload = (await request.json()) as AnalyzeRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.text || payload.text.trim().length === 0) {
    return Response.json({ error: "Post text is required" }, { status: 400 });
  }

  let result: AnalyzeResponse;
  try {
    result = await proxyAnalyze(payload, authHeader);
  } catch (error: unknown) {
    if (ALLOW_ANALYZE_MOCK_FALLBACK) {
      const fallback = (await import("@/lib/mock-data")).then(({ analyzeWithMockCache }) =>
        analyzeWithMockCache(payload),
      );
      result = await fallback;
    } else {
      if (error instanceof Error && "status" in error && typeof error.status === "number") {
        const status = error.status;
        const body = (error as Error & { body?: string }).body;
        const message = body ? String(body).trim() || error.message : error.message;
        const payload = { error: message || "Backend request failed" };
        return Response.json(payload, { status });
      }
      const message = error instanceof Error ? error.message : "Backend unavailable";
      return Response.json({ error: message }, { status: 502 });
    }
  }

  revalidateTag(CACHE_TAGS.deals, "max");
  if (result.id) {
    revalidateTag(CACHE_TAGS.deal(result.id), "max");
  }

  return Response.json(result);
}

async function proxyAnalyze(
  payload: AnalyzeRequest,
  authHeader: string | null
): Promise<AnalyzeResponse> {
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json",
  });
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/deals/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Analyze failed: ${response.status}`);
    (error as Error & { status?: number; body?: string }).status = response.status;
    (error as Error & { status?: number; body?: string }).body = body || response.statusText;
    throw error;
  }

  return response.json() as Promise<AnalyzeResponse>;
}
