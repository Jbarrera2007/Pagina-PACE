import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_activities",
  title: "List activities",
  description:
    "List the signed-in runner's recent training activities with distance, time, pace, heart rate, cadence, elevation and training load.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("How many activities to return (1-50)."),
    sport_type: z.string().optional().describe("Optional sport filter, e.g. 'run'."),
    since: z.string().optional().describe("Optional ISO date; only activities started on or after this date."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, sport_type, since }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("activities")
      .select(
        "id, name, sport_type, source, started_at, distance_m, moving_time_s, elapsed_time_s, avg_pace_s_per_km, avg_hr, max_hr, avg_cadence, elevation_gain_m, calories, training_load, suffer_score",
      )
      .order("started_at", { ascending: false })
      .limit(limit ?? 10);
    if (sport_type) query = query.eq("sport_type", sport_type);
    if (since) query = query.gte("started_at", since);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, activities: data ?? [] });
  },
});
