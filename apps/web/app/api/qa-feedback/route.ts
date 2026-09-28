import { handleQaFeedbackRequest } from "@/lib/human-qa-handler";
import { getSupabasePublicConfig } from "@/lib/runtime-config";

export async function POST(request: Request) {
  return handleQaFeedbackRequest(request, {
    enabled: process.env.MECHORI_QA_RECEPTION === "enabled",
    build: process.env.COMMIT_REF ?? process.env.NEXT_PUBLIC_COMMIT_REF ?? "",
    async submit(input, context) {
      const config = getSupabasePublicConfig();
      if (!config) throw new Error("qa_unavailable");
      // Public key, no user session and no service role. The RPC enforces the same
      // validation, global quota and kill switch even when invoked directly.
      const result = await fetch(`${config.url}/rest/v1/rpc/submit_human_qa_feedback`, {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
        headers: { apikey: config.publishableKey, "Content-Type": "application/json", ...(config.publishableKey.startsWith("eyJ") ? { Authorization: `Bearer ${config.publishableKey}` } : {}) },
        body: JSON.stringify({ p_submission_id: input.submissionId, p_context: context, p_result: input.result, p_note: input.note }),
      });
      if (!result.ok) throw new Error("qa_unavailable");
      const outcome: unknown = await result.json();
      if (!["accepted", "duplicate", "closed", "rate_limited"].includes(String(outcome))) throw new Error("qa_unavailable");
      return outcome as "accepted" | "duplicate" | "closed" | "rate_limited";
    },
  });
}
