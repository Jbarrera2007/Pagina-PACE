/**
 * Historial real de actividades del corredor.
 *
 * Fuente:
 * Strava → Supabase → public.activities → PIE
 *
 * IMPORTANTE:
 * - No genera actividades ficticias.
 * - No inventa FC, temperatura, humedad ni viento.
 * - Las métricas que requieren datos que no existen en
 *   Strava/Supabase se consideran "sin datos".
 */

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

  shoe: string;

  tempC?: number;
  humidity?: number;
  windKmh?: number;

  hour: number;
}

/**
 * Representación de la fila que necesitamos de Supabase.
 *
 * IMPORTANTE:
 * No incluimos elevation_m porque esa columna
 * no existe en la tabla activities.
 */
type ActivityRow = {
  id: string;
  user_id: string;
  source: string;
  external_id: string | null;
  name: string | null;
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

  effort: string | null;

  raw: unknown;
};

/**
 * Convierte raw de Supabase en un objeto seguro.
 *
 * Así podemos acceder a:
 * raw["workout_type"]
 * raw["gear_id"]
 *
 * sin errores de TypeScript.
 */
function getRawObject(
  raw: unknown,
): Record<string, unknown> {
  if (
    typeof raw === "object" &&
    raw !== null &&
    !Array.isArray(raw)
  ) {
    return raw as Record<string, unknown>;
  }

  return {};
}

/**
 * Convierte el tipo de actividad de Strava
 * a nuestro SessionKind.
 *
 * Esta es una primera clasificación.
 * Más adelante podemos mejorarla utilizando
 * laps/streams.
 */
function mapSessionKind(
  row: ActivityRow,
): SessionKind {
  const name = (
    row.name ?? ""
  ).toLowerCase();

  const sport = (
    row.sport_type ?? ""
  ).toLowerCase();

  const effort = (
    row.effort ?? ""
  ).toLowerCase();

  const raw = getRawObject(row.raw);

  /**
   * Strava suele guardar workout_type
   * dentro de raw.
   *
   * Usamos acceso mediante [] porque raw
   * tiene una firma de índice.
   */
  const workoutTypeValue =
    raw["workout_type"];

  const workoutType =
    typeof workoutTypeValue === "number"
      ? workoutTypeValue
      : null;

  const distanceKm =
    (row.distance_m ?? 0) / 1000;

  /**
   * Strava workout_type = 1
   * suele corresponder a competición/race.
   */
  if (
    workoutType === 1 ||
    name.includes("race") ||
    name.includes("compet") ||
    name.includes("carrera")
  ) {
    return "competicion";
  }

  /**
   * Tirada larga.
   */
  if (distanceKm >= 18) {
    return "larga";
  }

  /**
   * Palabras habituales para sesiones
   * de calidad.
   */
  if (
    name.includes("series") ||
    name.includes("serie") ||
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

  /**
   * Umbral / tempo / fartlek.
   */
  if (
    name.includes("umbral") ||
    name.includes("threshold") ||
    name.includes("tempo") ||
    name.includes("fartlek")
  ) {
    return "umbral";
  }

  /**
   * Todo lo demás que sea carrera
   * se considera rodaje.
   */
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
 * Strava suele devolver la cadencia de carrera
 * como pasos de una pierna (ej. 79.4),
 * mientras PIE trabaja con pasos/minuto completos.
 *
 * Por eso:
 * 79.4 → ~159 spm.
 */
function mapCadence(
  value: number | null,
): number | undefined {
  if (
    value == null ||
    !Number.isFinite(value)
  ) {
    return undefined;
  }

  const cadence =
    value < 120
      ? value * 2
      : value;

  return Math.round(cadence);
}

/**
 * Convierte una fila REAL de Supabase
 * a PieActivity.
 */
function mapActivity(
  row: ActivityRow,
): PieActivity | null {
  const distanceM =
    row.distance_m ?? 0;

  const movingTimeS =
    row.moving_time_s ?? 0;

  /**
   * Una actividad sin distancia o tiempo
   * no es válida para PIE.
   */
  if (
    distanceM <= 0 ||
    movingTimeS <= 0
  ) {
    return null;
  }

  const distanceKm =
    distanceM / 1000;

  /**
   * Si Supabase ya tiene el ritmo,
   * usamos ese valor.
   *
   * Si no, lo calculamos a partir
   * del tiempo y la distancia.
   */
  const paceS =
    row.avg_pace_s_per_km != null &&
    row.avg_pace_s_per_km > 0
      ? row.avg_pace_s_per_km
      : movingTimeS / distanceKm;

  const startedAt =
    new Date(row.started_at);

  const raw =
    getRawObject(row.raw);

  /**
   * gear_id existe dentro del JSON
   * de Strava.
   *
   * Ejemplo:
   * "gear_id": "g13550696"
   */
  const gearValue =
    raw["gear_id"];

  const gearId =
    typeof gearValue === "string" &&
    gearValue.trim().length > 0
      ? gearValue
      : "sin-zapatillas";

  /**
   * Elevación:
   *
   * Usamos únicamente elevation_gain_m
   * porque elevation_m no existe en
   * la tabla activities.
   */
  const elevationM =
    Math.round(
      row.elevation_gain_m ?? 0,
    );

  /**
   * Hora local de España.
   */
  const hourString =
    new Intl.DateTimeFormat(
      "es-ES",
      {
        hour: "2-digit",
        hour12: false,
        timeZone: "Europe/Madrid",
      },
    ).format(startedAt);

  const hour =
    Number(hourString);

    const activity: PieActivity = {
    id: row.external_id || row.id,

    date: row.started_at,

    distanceKm,

    movingTimeS,

    paceS: Math.round(paceS),

    elevationM,

    kind: mapSessionKind(row),

    shoe: gearId,

    hour: Number.isFinite(hour)
      ? hour
      : 0,
  };

  // Solo añadimos estas propiedades
  // si realmente existen en Strava/Supabase.
  if (
    row.avg_hr != null &&
    row.avg_hr > 0
  ) {
    activity.avgHr = row.avg_hr;
  }

  if (
    row.max_hr != null &&
    row.max_hr > 0
  ) {
    activity.maxHr = row.max_hr;
  }

  const cadence = mapCadence(
    row.avg_cadence,
  );

  if (cadence !== undefined) {
    activity.cadence = cadence;
  }

  return activity;
}

/**
 * Columnas que realmente existen
 * y necesitamos de activities.
 *
 * IMPORTANTE:
 * NO añadir elevation_m aquí.
 */
const ACTIVITY_SELECT = `
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
  effort,
  raw
`;

/**
 * Carga todas las actividades REALES
 * del usuario desde Supabase.
 */
export async function getPieActivities(
  userId: string,
): Promise<PieActivity[]> {
  const {
    data,
    error,
  } = await supabase
    .from("activities")
    .select(ACTIVITY_SELECT)
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

  const rows =
    (data ?? []) as unknown as ActivityRow[];

  return rows
    .map((row) =>
      mapActivity(row),
    )
    .filter(
      (
        activity,
      ): activity is PieActivity =>
        activity !== null,
    )
    .sort(
      (a, b) =>
        new Date(
          a.date,
        ).getTime() -
        new Date(
          b.date,
        ).getTime(),
    );
}

/**
 * Versión para cargar únicamente
 * las últimas N actividades.
 */
export async function getRecentPieActivities(
  userId: string,
  limit = 500,
): Promise<PieActivity[]> {
  const {
    data,
    error,
  } = await supabase
    .from("activities")
    .select(ACTIVITY_SELECT)
    .eq("user_id", userId)
    .eq("source", "strava")
    .order("started_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    console.error(
      "Error cargando actividades recientes:",
      error,
    );

    throw new Error(
      `No se pudieron cargar las actividades: ${error.message}`,
    );
  }

  const rows =
    (data ?? []) as unknown as ActivityRow[];

  return rows
    .map((row) =>
      mapActivity(row),
    )
    .filter(
      (
        activity,
      ): activity is PieActivity =>
        activity !== null,
    )
    .sort(
      (a, b) =>
        new Date(
          a.date,
        ).getTime() -
        new Date(
          b.date,
        ).getTime(),
    );
}

/**
 * Fecha actual para PIE.
 *
 * Ya no usamos una fecha ficticia.
 */
export const PIE_TODAY =
  new Date();

/**
 * Compatibilidad con código antiguo
 * que todavía pueda importar pieActivities.
 *
 * IMPORTANTE:
 * Esta lista está vacía intencionadamente.
 *
 * Las actividades reales se cargan mediante:
 *
 * getPieActivities(userId)
 *
 * o:
 *
 * getRecentPieActivities(userId)
 */
export const pieActivities: PieActivity[] =
  [];