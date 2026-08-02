import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_runner_profile",
  title: "Get runner profile",
  description:
    "Read the signed-in runner's PACE profile: name, physiology (max HR, resting HR, VO2max), weekly target and locale.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "full_name, city, gender, birth_date, height_cm, weight_kg, max_hr, resting_hr, vo2max, weekly_target_km, locale",
      )
      .eq("id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("No profile found for this account yet.");
    return jsonResult({ profile: data });
  },
});
