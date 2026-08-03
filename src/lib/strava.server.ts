import { createHmac, timingSafeEqual } from "node:crypto";

export function stravaEnv() {
  const clientId = process.env['STRAVA_CLIENT_ID'];
  const clientSecret = process.env['STRAVA_CLIENT_SECRET'];
  if (!clientId || !clientSecret) {
    throw new Error("Faltan STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET");
  }
  return { clientId, clientSecret };
}

export function signState(userId: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

export function verifyState(state: string, secret: string): string | null {
  const idx = state.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = state.slice(0, idx);
  const sig = state.slice(idx + 1);
  const expected = createHmac("sha256", secret).update(userId).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

type StravaActivity = {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time?: number;
  average_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  total_elevation_gain?: number;
  kilojoules?: number;
  average_watts?: number;
  suffer_score?: number;
};

export function mapActivity(userId: string, a: StravaActivity) {
  const distanceM = Number(a.distance ?? 0);
  const movingTime = Number(a.moving_time ?? 0);
  const paceSPerKm = distanceM > 0 ? (movingTime / (distanceM / 1000)) : null;
  return {
    user_id: userId,
    source: "strava",
    external_id: String(a.id),
    name: a.name ?? "Actividad",
    sport_type: a.sport_type ?? a.type ?? "Run",
    started_at: a.start_date,
    distance_m: distanceM,
    moving_time_s: movingTime,
    elapsed_time_s: a.elapsed_time ?? null,
    avg_pace_s_per_km: paceSPerKm,
    avg_speed_ms: a.average_speed ?? null,
    avg_hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    max_hr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
    avg_cadence: a.average_cadence ? a.average_cadence * 2 : null,
    elevation_gain_m: a.total_elevation_gain ?? null,
    calories: a.kilojoules ? Math.round(a.kilojoules) : null,
    avg_power: a.average_watts ? Math.round(a.average_watts) : null,
    suffer_score: a.suffer_score ?? null,
    raw: a as unknown as Record<string, unknown>,
  };
}

export async function importStravaActivities(userId: string, accessToken: string) {
  const res = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=100", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Strava activities [${res.status}]: ${await res.text()}`);
  }
  const list = (await res.json()) as StravaActivity[];
  const rows = list.filter((a) => (a.sport_type ?? a.type ?? "").includes("Run")).map((a) => mapActivity(userId, a));
  if (rows.length === 0) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("activities")
    .upsert(rows as never, { onConflict: "user_id,source,external_id" });
  if (error) throw new Error(error.message);
  return rows.length;
}
