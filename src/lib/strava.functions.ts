import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getStravaAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { origin: string }) => data)
  .handler(async ({ data, context }) => {
    const { stravaEnv, signState } = await import("./strava.server");
    const { clientId, clientSecret } = stravaEnv();
    const state = signState(context.userId, clientSecret);
    const redirectUri = `${data.origin}/api/public/strava/callback`;
    const url =
      `https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
      `&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&approval_prompt=auto&scope=read,activity:read_all&state=${encodeURIComponent(state)}`;
    return { url };
  });

export const getStravaStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("strava_connections")
      .select("athlete_id, last_sync_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { count } = await context.supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("source", "strava");
    return {
      connected: Boolean(data),
      athleteId: data?.athlete_id ?? null,
      lastSyncAt: data?.last_sync_at ?? null,
      activities: count ?? 0,
    };
  });

export const syncStrava = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { stravaEnv, importStravaActivities } = await import("./strava.server");
    const { clientId, clientSecret } = stravaEnv();
    const { data: conn } = await context.supabase
      .from("strava_connections")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!conn) throw new Error("Strava no está vinculado");

    let accessToken = conn.access_token;
    if (!conn.expires_at || new Date(conn.expires_at).getTime() - 60_000 < Date.now()) {
      const res = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: conn.refresh_token,
        }),
      });
      if (!res.ok) throw new Error(`Strava refresh [${res.status}]: ${await res.text()}`);
      const t = (await res.json()) as { access_token: string; refresh_token: string; expires_at: number };
      accessToken = t.access_token;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("strava_connections")
        .update({
          access_token: t.access_token,
          refresh_token: t.refresh_token,
          expires_at: new Date(t.expires_at * 1000).toISOString(),
        })
        .eq("user_id", context.userId);
    }

    const imported = await importStravaActivities(context.userId, accessToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("strava_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    return { imported };
  });

export const disconnectStrava = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("strava_connections").delete().eq("user_id", context.userId);
    return { ok: true };
  });
