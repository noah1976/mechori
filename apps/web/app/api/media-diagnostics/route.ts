import { isSharedMediaLoadDiagnostic } from "@/lib/shared-media-diagnostics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (Number(request.headers.get("content-length") ?? 0) > 4_096) {
    return Response.json({ error: "payload_too_large" }, { status: 413 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }
  if (!isSharedMediaLoadDiagnostic(payload)) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  console.warn("[P-069 shared-media-load]", payload);
  return new Response(null, { status: 204 });
}
