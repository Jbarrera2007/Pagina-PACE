import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_goals",
  title: "List goals",
  description: "List the signed-in runner's training goals with progress, target, unit, due date and status.",
  inputSchema: {
    status: z
      .enum(["active", "achieved", "missed", "archived"])
      .optional()
      .describe("Optional status filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("goals")
      .select("id, label, goal_type, current_value, target_value, unit, due_date, status, updated_at")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ goals: data ?? [] });
  },
});
