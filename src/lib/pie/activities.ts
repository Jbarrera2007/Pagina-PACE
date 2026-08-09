
/**
 * Historial real de actividades del corredor.
 *
 * Fuente:
 *   Strava → Supabase → public.activities → PIE
 *
 * IMPORTANTE:
 * - No genera actividades ficticias.
 * - No inventa FC, temperatura, humedad ni viento.
 * - Las métricas que requieren datos que no existen en Strava/Supabase
 *   deben tratarse como "sin datos".
 */

import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type SessionKind =
  | "rodaje"
  | "series"
  | "umbral"
  | "larga"
  | "competicion";

export interface PieActivity {
  id: string;
  date: string;

  distanceKm: number;
  movingTimeS: number;
  paceS: number;

  avgHr?: number;
  maxHr?: number;
  cadence?: number;

  elevationM: number;

  kind: SessionKind;

  /**
   * Actualmente activities guarda gear_id dentro de raw.
   * Hasta tener una tabla de zapatillas/nombre de gear,
   * usamos el gear_id real de Strava.
   */
  shoe: string;

  /**
   * Estos datos NO están actualmente en activities.
   * No los inventamos.
   */
  tempC?: number;
  humidity?: number;
  windKmh?: number;

  hour: number;
}

type ActivityRow = {
  id: string;
  user_id: string;
  source: string;
  external_id: string;
  name: string;
  sport_type: string | null;

  started_at: string;

  distance_m: number | null;
  moving_time_s: number | null;
  elapsed_time_s: number | null;

  avg_pace_s_per_km: number | null;
  avg_speed_ms: number | null;

  avg_hr: number | null;
  max_hr: number | null;

  avg_cadence: number | null;

  elevation_gain_m: number | null;
  elevation_m: number | null;

  effort: string | null;

  raw: Record<string, unknown> | null;
};

/**
 * Cliente Supabase.
 *
 * IMPORTANTE:
 * Usa variables de entorno.
 * NO pongas la service_role key en código del navegador.
 */
function getSupabase() {
  process.env["NEXT_PUBLIC_SUPABASE_URL"]
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createClient(url, anonKey);
}

/**
 * Convierte el tipo de actividad de Strava a nuestro SessionKind.
 *
 * Esto es una primera clasificación.
 * Más adelante podemos mejorarla utilizando laps/streams.
 */
function mapSessionKind(row: ActivityRow): SessionKind {
  const name = (row.name ?? "").toLowerCase();
  const sport = (row.sport_type ?? "").toLowerCase();
  const effort = (row.effort ?? "").toLowerCase();

  const raw = row.raw ?? {};

  const workoutType =
    typeof raw.workout_type === "number"
      ? raw.workout_type
      : null;

  const distanceKm = (row.distance_m ?? 0) / 1000;

  // Strava workout_type = 1 suele corresponder a competición/race.
  if (
    workoutType === 1 ||
    name.includes("race") ||
    name.includes("compet") ||
    name.includes("carrera")
  ) {
    return "competicion";
  }

  // Tirada larga.
  if (distanceKm >= 18) {
    return "larga";
  }

  // Palabras habituales para sesiones de calidad.
  if (
    name.includes("series") ||
    name.includes("interval") ||
    name.includes("intervals") ||
    name.includes("repeticiones") ||
    name.includes("400") ||
    name.includes("800") ||
    name.includes("1000") ||
    name.includes("1200") ||
    name.includes("1600") ||
    effort.includes("series")
  ) {
    return "series";
  }

  if (
    name.includes("umbral") ||
    name.includes("threshold") ||
    name.includes("tempo") ||
    name.includes("fartlek") ||
    name.includes("threshold")
  ) {
    return "umbral";
  }

  // Todo lo demás que sea carrera se considera rodaje.
  if (
    sport === "run" ||
    sport === "running" ||
    sport === ""
  ) {
    return "rodaje";
  }

  return "rodaje";
}

/**
 * Strava suele devolver la cadencia de carrera como pasos de una pierna
 * (ej. 79.4), mientras PIE trabaja con pasos/minuto completos.
 *
 * Por eso 79.4 → ~159 spm.
 */
function mapCadence(value: number | null): number | undefined {
  if (value == null || !Number.isFinite(value)) {
    return undefined;
  }

  const cadence = value < 120 ? value * 2 : value;

  return Math.round(cadence);
}

/**
 * Convierte una fila REAL de Supabase a PieActivity.
 */
function mapActivity(row: ActivityRow): PieActivity | null {
  const distanceM = row.distance_m ?? 0;
  const movingTimeS = row.moving_time_s ?? 0;

  if (distanceM <= 0 || movingTimeS <= 0) {
    return null;
  }

  const distanceKm = distanceM / 1000;

  const paceS =
    row.avg_pace_s_per_km != null &&
    row.avg_pace_s_per_km > 0
      ? row.avg_pace_s_per_km
      : movingTimeS / distanceKm;

  const startedAt = new Date(row.started_at);

  const raw = row.raw ?? {};

  /**
   * gear_id existe dentro del JSON de Strava.
   *
   * Ejemplo real:
   * "gear_id": "g13550696"
   */
  const gearId =
    typeof raw.gear_id === "string"
      ? raw.gear_id
      : "sin-zapatillas";

  return {
    id: row.external_id || row.id,

    date: row.started_at,

    distanceKm,

    movingTimeS,

    paceS: Math.round(paceS),

    avgHr:
      row.avg_hr != null && row.avg_hr > 0
        ? row.avg_hr
        : undefined,

    maxHr:
      row.max_hr != null && row.max_hr > 0
        ? row.max_hr
        : undefined,

    cadence: mapCadence(row.avg_cadence),

    elevationM: Math.round(
      row.elevation_gain_m ??
        row.elevation_m ??
        0,
    ),

    kind: mapSessionKind(row),

    shoe: gearId,

    /**
     * No inventamos estos datos.
     *
     * Si más adelante los guardas en Supabase,
     * se pueden mapear aquí.
     */
    tempC: undefined,
    humidity: undefined,
    windKmh: undefined,

    /**
     * started_at está en UTC.
     * Para España usamos la hora local de la actividad
     * cuando el runtime tiene configurada la zona correspondiente.
     */
    hour: Number(
      new Intl.DateTimeFormat("es-ES", {
        hour: "2-digit",
        hour12: false,
        timeZone: "Europe/Madrid",
      }).format(startedAt),
    ),
  };
}

/**
 * Carga las actividades REALES del usuario desde Supabase.
 */
export async function getPieActivities(
  userId: string,
): Promise<PieActivity[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("activities")
    .select(`
      id,
      user_id,
      source,
      external_id,
      name,
      sport_type,
      started_at,
      distance_m,
      moving_time_s,
      elapsed_time_s,
      avg_pace_s_per_km,
      avg_speed_ms,
      avg_hr,
      max_hr,
      avg_cadence,
      elevation_gain_m,
      elevation_m,
      effort,
      raw
    `)
    .eq("user_id", userId)
    .eq("source", "strava")
    .order("started_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error cargando actividades de Strava desde Supabase:",
      error,
    );

    throw new Error(
      `No se pudieron cargar las actividades: ${error.message}`,
    );
  }

  const rows = (data ?? []) as ActivityRow[];

  return rows
    .map(mapActivity)
    .filter(
      (activity): activity is PieActivity =>
        activity !== null,
    )
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime(),
    );
}

/**
 * Versión para cargar únicamente las últimas N actividades.
 */
export async function getRecentPieActivities(
  userId: string,
  limit = 500,
): Promise<PieActivity[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("activities")
    .select(`
      id,
      user_id,
      source,
      external_id,
      name,
      sport_type,
      started_at,
      distance_m,
      moving_time_s,
      elapsed_time_s,
      avg_pace_s_per_km,
      avg_speed_ms,
      avg_hr,
      max_hr,
      avg_cadence,
      elevation_gain_m,
      elevation_m,
      effort,
      raw
    `)
    .eq("user_id", userId)
    .eq("source", "strava")
    .order("started_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    throw new Error(
      `No se pudieron cargar las actividades: ${error.message}`,
    );
  }

  return (data ?? [])
    .map((row) => mapActivity(row as ActivityRow))
    .filter(
      (activity): activity is PieActivity =>
        activity !== null,
    )
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime(),
    );
}

/**
 * Fecha actual para PIE.
 *
 * Ya no usamos:
 *
 * new Date("2026-08-02T09:00:00Z")
 *
 * porque PIE debe analizar los datos reales actuales.
 */
export const PIE_TODAY = new Date();

