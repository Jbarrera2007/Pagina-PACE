import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_activity",
  title: "Log activity",
  description:
    "Log a manual training activity for the signed-in runner (distance, duration and optional heart rate, cadence and elevation).",
  inputSchema: {
    name: z.string().trim().min(1).describe("Session name, e.g. 'Easy run'."),
    started_at: z.string().describe("ISO timestamp when the session started."),
    distance_m: z.number().positive().describe("Distance in meters."),
    moving_time_s: z.number().int().positive().describe("Moving time in seconds."),
    sport_type: z.string().trim().default("run").describe("Sport type, defaults to 'run'."),
    avg_hr: z.number().optional().describe("Average heart rate in bpm."),
    avg_cadence: z.number().optional().describe("Average cadence in spm."),
    elevation_gain_m: z.number().optional().describe("Elevation gain in meters."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("activities")
      .insert({
        user_id: ctx.getUserId()!,
        name: input.name,
        started_at: input.started_at,
        distance_m: input.distance_m,
        moving_time_s: input.moving_time_s,
        sport_type: input.sport_type ?? "run",
        source: "mcp",
        avg_pace_s_per_km: Math.round(input.moving_time_s / (input.distance_m / 1000)),
        avg_hr: input.avg_hr ?? null,
        avg_cadence: input.avg_cadence ?? null,
        elevation_gain_m: input.elevation_gain_m ?? null,
      })
      .select("id, name, started_at, distance_m, moving_time_s, avg_pace_s_per_km")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult({ activity: data });
  },
});
