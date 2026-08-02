import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_goal",
  title: "Create goal",
  description: "Create a new training goal for the signed-in runner (e.g. weekly volume, race time, streak).",
  inputSchema: {
    label: z.string().trim().min(1).describe("Human readable goal, e.g. 'Sub 40' 10K'."),
    goal_type: z.string().trim().default("custom").describe("Goal category, e.g. 'distance', 'race_time', 'volume'."),
    target_value: z.number().optional().describe("Numeric target value."),
    unit: z.string().trim().optional().describe("Unit for the target, e.g. 'km', 's', 'sessions'."),
    due_date: z.string().optional().describe("Optional ISO date (YYYY-MM-DD) deadline."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ label, goal_type, target_value, unit, due_date }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: ctx.getUserId()!,
        label,
        goal_type: goal_type ?? "custom",
        target_value: target_value ?? null,
        unit: unit ?? null,
        due_date: due_date ?? null,
      })
      .select("id, label, goal_type, target_value, unit, due_date, status")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult({ goal: data });
  },
});
