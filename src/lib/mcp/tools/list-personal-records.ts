import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_personal_records",
  title: "List personal records",
  description: "List the signed-in runner's personal bests per distance with the date achieved.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("personal_records")
      .select("distance_key, time_s, achieved_at")
      .order("achieved_at", { ascending: false });
    if (error) return errorResult(error.message);
    return jsonResult({ records: data ?? [] });
  },
});
