import { QA_BODY_LIMIT, QA_VERSION, safeQaBuild, validateQaFeedback, type QaFeedbackInput } from "./human-qa.ts";

interface QaHandlerDependencies {
  enabled: boolean;
  build: string;
  submit: (input: QaFeedbackInput, context: Record<string, string | number>) => Promise<"accepted" | "duplicate" | "closed" | "rate_limited">;
}

function response(status: number, result: string) {
  return Response.json({ result }, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

export async function handleQaFeedbackRequest(request: Request, dependencies: QaHandlerDependencies): Promise<Response> {
  if (!dependencies.enabled) return response(503, "closed");
  if (request.method !== "POST") return response(405, "invalid");
  if (request.headers.get("origin") !== new URL(request.url).origin) return response(403, "invalid");
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") return response(415, "invalid");
  if (Number(request.headers.get("content-length")) > QA_BODY_LIMIT) return response(413, "too_large");
  const reader = request.body?.getReader();
  if (!reader) return response(400, "invalid");
  let text = "";
  let size = 0;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let input: QaFeedbackInput | null;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > QA_BODY_LIMIT) { await reader.cancel(); return response(413, "too_large"); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    input = validateQaFeedback(JSON.parse(text));
  } catch { return response(400, "invalid"); }
  if (!input) return response(400, "invalid");
  try {
    const result = await dependencies.submit(input, {
      task: input.task, step: input.step, version: QA_VERSION, build: safeQaBuild(dependencies.build),
      source: input.source, device: input.device,
    });
    return response(result === "closed" ? 503 : result === "rate_limited" ? 429 : 200, result);
  } catch { return response(503, "unavailable"); }
}
