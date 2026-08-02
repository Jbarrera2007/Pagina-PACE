import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_training_summary",
  title: "Get training summary",
  description:
    "Summarize the signed-in runner's training over a recent window: total distance, time, elevation, training load, average pace and heart rate, plus a per-week breakdown.",
  inputSchema: {
    days: z.number().int().min(7).max(365).default(28).describe("Window length in days (7-365)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const window = days ?? 28;
    const since = new Date(Date.now() - window * 86_400_000).toISOString();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("activities")
      .select("started_at, distance_m, moving_time_s, elevation_gain_m, training_load, avg_hr")
      .gte("started_at", since)
      .order("started_at", { ascending: true });
    if (error) return errorResult(error.message);

    const rows = data ?? [];
    const sum = (pick: (r: (typeof rows)[number]) => number | null | undefined) =>
      rows.reduce((acc, r) => acc + (pick(r) ?? 0), 0);
    const distance_km = Math.round((sum((r) => r.distance_m) / 1000) * 10) / 10;
    const moving_time_s = sum((r) => r.moving_time_s);
    const hrRows = rows.filter((r) => typeof r.avg_hr === "number");

    const weeks = new Map<string, { distance_km: number; sessions: number; load: number }>();
    for (const r of rows) {
      const d = new Date(r.started_at);
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      const w = weeks.get(key) ?? { distance_km: 0, sessions: 0, load: 0 };
      w.distance_km += (r.distance_m ?? 0) / 1000;
      w.sessions += 1;
      w.load += r.training_load ?? 0;
      weeks.set(key, w);
    }

    return jsonResult({
      window_days: window,
      sessions: rows.length,
      distance_km,
      moving_time_h: Math.round((moving_time_s / 3600) * 10) / 10,
      elevation_gain_m: Math.round(sum((r) => r.elevation_gain_m)),
      training_load: Math.round(sum((r) => r.training_load)),
      avg_pace_s_per_km: distance_km > 0 ? Math.round(moving_time_s / distance_km) : null,
      avg_hr: hrRows.length ? Math.round(sum((r) => r.avg_hr) / hrRows.length) : null,
      weekly: Array.from(weeks.entries()).map(([week_start, w]) => ({
        week_start,
        sessions: w.sessions,
        distance_km: Math.round(w.distance_km * 10) / 10,
        training_load: Math.round(w.load),
      })),
    });
  },
});
