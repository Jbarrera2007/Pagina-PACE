import { supabase } from "./supabase";

export async function getMyActivities() {
  const {
    data,
    error,
  } = await supabase
    .from("activities")
    .select("*")
    .order("started_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}


export interface WeeklyMetrics {
  distanceKm: number;
  timeS: number;
  elevationM: number;
  runs: number;
  avgPaceSPerKm: number;
}

/**
 * Métricas de la semana en curso calculadas a partir de las actividades
 * reales del usuario. Sin datos no hay invención: todo queda a 0.
 */
export async function getMyWeeklyMetrics(): Promise<WeeklyMetrics> {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // lunes = 0
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("activities")
    .select("distance_m, moving_time_s, elevation_gain_m")
    .gte("started_at", weekStart.toISOString());

  if (error) {
    console.error(error);
  }

  const rows = data ?? [];
  const distanceM = rows.reduce((acc, r) => acc + Number(r.distance_m ?? 0), 0);
  const timeS = rows.reduce((acc, r) => acc + Number(r.moving_time_s ?? 0), 0);
  const elevationM = rows.reduce((acc, r) => acc + Number(r.elevation_gain_m ?? 0), 0);
  const distanceKm = distanceM / 1000;

  return {
    distanceKm,
    timeS,
    elevationM,
    runs: rows.length,
    avgPaceSPerKm: distanceKm > 0 ? timeS / distanceKm : 0,
  };
}
