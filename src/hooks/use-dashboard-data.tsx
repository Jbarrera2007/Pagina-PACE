import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { effortLabel } from "@/lib/effort";

/* =========================================================
 * TIPOS
 * ========================================================= */

export interface Metric {
  id: string;
  label: string;
  value: string;
  unit?: string;
  hint: string;
  delta: number | null;
}

export interface LoadPoint {
  week: string;
  carga: number;
  forma: number;
  fatiga: number;
}

export interface PacePoint {
  day: string;
  ritmo: number;
  fc: number;
}

export interface VolumePoint {
  day: string;
  km: number;
}

export interface ZoneSlice {
  zone: string;
  pct: number;
}

export interface WorkoutRow {
  id: string;
  title: string;
  date: string;
  distance: string;
  pace: string;
  hr: number;
  effort: string;
}

export interface PredictionRow {
  distance: string;
  time: string;
  confidence: number;
}

export interface GoalRow {
  id: string;
  label: string;
  progress: number;
}

export interface InsightRow {
  title: string;
  body: string;
}

/**
 * Información explícita de los períodos usados.
 *
 * Esto evita que el componente visual tenga que adivinar
 * qué semana estamos mostrando.
 */
export interface WeekRange {
  start: string;
  end: string;
  label: string;
}

export interface DashboardData {
  loading: boolean;
  hasActivities: boolean;

  metrics: Metric[];

  loadSeries: LoadPoint[];

  paceSeries: PacePoint[];

  volumeSeries: VolumePoint[];

  zoneSplit: ZoneSlice[];

  workouts: WorkoutRow[];

  predictions: PredictionRow[];

  goals: GoalRow[];

  insights: InsightRow[];

  currentWeek: WeekRange;

  previousWeek: WeekRange;

  nextRace: {
    name: string;
    date: string;
    daysLeft: number;
    plan: string;
    goal: string;
  } | null;
}

/* =========================================================
 * ACTIVIDAD REAL DE SUPABASE
 * ========================================================= */

type ActivityRow = {
  id: string;
  name: string | null;
  started_at: string;

  distance_m: number | null;

  moving_time_s: number | null;

  avg_pace_s_per_km: number | null;

  avg_hr: number | null;

  elevation_gain_m: number | null;

  suffer_score: number | null;
};

/* =========================================================
 * CONSTANTES
 * ========================================================= */

const DAY_MS = 24 * 60 * 60 * 1000;

const DAYS_FOR_HISTORY = 84;

/* =========================================================
 * ESTADO VACÍO
 * ========================================================= */

const EMPTY: Omit<DashboardData, "loading"> = {
  hasActivities: false,

  metrics: [],

  loadSeries: [],

  paceSeries: [],

  volumeSeries: [],

  zoneSplit: [],

  workouts: [],

  predictions: [],

  goals: [],

  insights: [],

  currentWeek: {
    start: "",
    end: "",
    label: "",
  },

  previousWeek: {
    start: "",
    end: "",
    label: "",
  },

  nextRace: null,
};

/* =========================================================
 * FECHAS
 * ========================================================= */

/**
 * Devuelve una copia de la fecha a las 00:00:00.000
 * en la zona horaria LOCAL del navegador.
 */
function startOfDay(date: Date): Date {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
}

/**
 * Devuelve el lunes 00:00 de la semana de la fecha indicada.
 *
 * JS:
 *
 * domingo = 0
 * lunes   = 1
 * martes  = 2
 * ...
 */
function startOfWeek(date: Date): Date {
  const result = startOfDay(date);

  const day = result.getDay();

  const daysSinceMonday = (day + 6) % 7;

  result.setDate(
    result.getDate() - daysSinceMonday,
  );

  return result;
}

/**
 * Añade días respetando la zona horaria local.
 *
 * Es preferible a sumar directamente DAY_MS para
 * calcular límites de calendario, porque así evitamos
 * problemas alrededor de cambios de horario.
 */
function addDays(
  date: Date,
  days: number,
): Date {
  const result = new Date(date);

  result.setDate(
    result.getDate() + days,
  );

  return result;
}

/**
 * Formato de fecha para mostrar al usuario.
 */
function formatDateShort(
  date: Date,
): string {
  return date.toLocaleDateString(
    "es-ES",
    {
      day: "numeric",
      month: "short",
    },
  );
}

/**
 * Formato:
 *
 * 3 ago – 9 ago
 */
function formatWeekLabel(
  start: Date,
  endExclusive: Date,
): string {
  const end = addDays(
    endExclusive,
    -1,
  );

  return `${formatDateShort(
    start,
  )} – ${formatDateShort(end)}`;
}

/**
 * Convierte una fecha local en ISO.
 *
 * new Date().toISOString() representa el instante
 * correcto en UTC, pero conserva el instante local
 * que hemos definido.
 */
function toISOString(
  date: Date,
): string {
  return date.toISOString();
}

/* =========================================================
 * VALIDACIÓN NUMÉRICA
 * ========================================================= */

function finiteNumber(
  value: unknown,
  fallback = 0,
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

/* =========================================================
 * PORCENTAJES
 * ========================================================= */

function percentage(
  current: number,
  previous: number,
): number | null {
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous <= 0
  ) {
    return null;
  }

  return Math.round(
    ((current - previous) /
      previous) *
      100,
  );
}

/* =========================================================
 * DURACIÓN
 * ========================================================= */

function formatDuration(
  seconds: number,
): string {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "0m";
  }

  const totalMinutes = Math.round(
    seconds / 60,
  );

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes =
    totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${String(
      minutes,
    ).padStart(2, "0")}m`;
  }

  return `${minutes}m`;
}

/* =========================================================
 * RITMO
 * ========================================================= */

function formatPace(
  secondsPerKm: number,
): string {
  if (
    !Number.isFinite(secondsPerKm) ||
    secondsPerKm <= 0
  ) {
    return "—";
  }

  const totalSeconds = Math.round(
    secondsPerKm,
  );

  const minutes = Math.floor(
    totalSeconds / 60,
  );

  const seconds =
    totalSeconds % 60;

  return `${minutes}:${String(
    seconds,
  ).padStart(2, "0")}`;
}

/* =========================================================
 * ACTIVIDAD VÁLIDA
 * ========================================================= */

function isValidActivity(
  activity: ActivityRow,
): boolean {
  const date = new Date(
    activity.started_at,
  );

  if (
    !Number.isFinite(
      date.getTime(),
    )
  ) {
    return false;
  }

  const distance = finiteNumber(
    activity.distance_m,
  );

  const movingTime = finiteNumber(
    activity.moving_time_s,
  );

  /**
   * Una actividad válida necesita:
   *
   * - distancia > 0
   * O
   * - tiempo > 0
   */
  return (
    distance > 0 ||
    movingTime > 0
  );
}

/* =========================================================
 * CARGA
 * ========================================================= */

function activityLoad(
  activity: ActivityRow,
): number {
  const suffer = finiteNumber(
    activity.suffer_score,
  );

  /**
   * Preferimos suffer_score real.
   */
  if (suffer > 0) {
    return suffer;
  }

  /**
   * Si no existe, usamos minutos en movimiento
   * como aproximación.
   *
   * No es una carga fisiológica perfecta,
   * pero evita inventar valores.
   */
  const movingTime = finiteNumber(
    activity.moving_time_s,
  );

  if (movingTime > 0) {
    return movingTime / 60;
  }

  return 0;
}

/* =========================================================
 * HOOK PRINCIPAL
 * ========================================================= */

export function useDashboardData(): DashboardData {
  const [state, setState] =
    useState<DashboardData>({
      loading: true,
      ...EMPTY,
    });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        /* =================================================
         * USUARIO
         * ================================================= */

        const {
          data: authData,
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          console.error(
            "Error obteniendo usuario:",
            authError,
          );
        }

        const user =
          authData.user;

        if (!user) {
          if (!cancelled) {
            setState({
              loading: false,
              ...EMPTY,
            });
          }

          return;
        }

        /* =================================================
         * FECHA ACTUAL
         * ================================================= */

        const now = new Date();

        /*
         * Semana actual:
         *
         * lunes 00:00
         */
        const currentWeekStart =
          startOfWeek(now);

        /*
         * Siguiente lunes.
         *
         * Este será el límite EXCLUSIVO.
         */
        const nextWeekStart =
          addDays(
            currentWeekStart,
            7,
          );

        /*
         * Semana anterior.
         */
        const previousWeekStart =
          addDays(
            currentWeekStart,
            -7,
          );

        /*
         * Semana anterior termina exactamente
         * cuando empieza la actual.
         */
        const previousWeekEnd =
          currentWeekStart;

        /*
         * Para el dashboard necesitamos histórico.
         *
         * Empezamos antes de la semana actual.
         */
        const historyStart =
          addDays(
            currentWeekStart,
            -DAYS_FOR_HISTORY,
          );

        /* =================================================
         * RANGOS VISIBLES
         * ================================================= */

        const currentWeekRange: WeekRange = {
          start: toISOString(
            currentWeekStart,
          ),

          end: toISOString(
            addDays(
              nextWeekStart,
              -1,
            ),
          ),

          label: formatWeekLabel(
            currentWeekStart,
            nextWeekStart,
          ),
        };

        const previousWeekRange: WeekRange = {
          start: toISOString(
            previousWeekStart,
          ),

          end: toISOString(
            addDays(
              previousWeekEnd,
              -1,
            ),
          ),

          label: formatWeekLabel(
            previousWeekStart,
            previousWeekEnd,
          ),
        };

        /* =================================================
         * CONSULTA SUPABASE
         * ================================================= */

        const [
          activitiesRes,
          profileRes,
        ] = await Promise.all([
          supabase
            .from("activities")
            .select(
              `
                id,
                name,
                started_at,
                distance_m,
                moving_time_s,
                avg_pace_s_per_km,
                avg_hr,
                elevation_gain_m,
                suffer_score
              `,
            )
            .eq(
              "user_id",
              user.id,
            )
            .gte(
              "started_at",
              toISOString(
                historyStart,
              ),
            )
            .lte(
              "started_at",
              toISOString(now),
            )
            .order(
              "started_at",
              {
                ascending: false,
              },
            ),

          supabase
            .from("profiles")
            .select(
              "max_hr",
            )
            .eq(
              "id",
              user.id,
            )
            .maybeSingle(),
        ]);

        if (activitiesRes.error) {
          console.error(
            "Error leyendo activities:",
            activitiesRes.error,
          );
        }

        if (profileRes.error) {
          console.error(
            "Error leyendo profiles:",
            profileRes.error,
          );
        }

        if (cancelled) {
          return;
        }

        /* =================================================
         * ACTIVIDADES
         * ================================================= */

        const rawActivities =
          (activitiesRes.data ??
            []) as ActivityRow[];

        /**
         * Validamos.
         */
        const activities =
          rawActivities.filter(
            isValidActivity,
          );

        /**
         * Orden cronológico ascendente para cálculos.
         */
        activities.sort(
          (a, b) =>
            new Date(
              a.started_at,
            ).getTime() -
            new Date(
              b.started_at,
            ).getTime(),
        );

        /* =================================================
         * DEBUG
         * ================================================= */

        console.group(
          "DASHBOARD · ACTIVIDADES",
        );

        console.table(
          activities.map(
            (activity) => ({
              id: activity.id,

              fecha:
                activity.started_at,

              km: Number(
                (
                  finiteNumber(
                    activity.distance_m,
                  ) / 1000
                ).toFixed(2),
              ),

              tiempo:
                finiteNumber(
                  activity.moving_time_s,
                ),

              ritmo:
                activity.avg_pace_s_per_km,

              fc:
                activity.avg_hr,

              desnivel:
                activity.elevation_gain_m,

              carga:
                activity.suffer_score,
            }),
          ),
        );

        console.groupEnd();

        /* =================================================
         * FUNCIONES DE FILTRADO
         * ================================================= */

        function activityTimestamp(
          activity: ActivityRow,
        ): number {
          return new Date(
            activity.started_at,
          ).getTime();
        }

        function isBetween(
          activity: ActivityRow,
          from: Date,
          to: Date,
        ): boolean {
          const timestamp =
            activityTimestamp(
              activity,
            );

          if (
            !Number.isFinite(
              timestamp,
            )
          ) {
            return false;
          }

          return (
            timestamp >=
              from.getTime() &&
            timestamp <
              to.getTime()
          );
        }

        /* =================================================
         * SEMANA ACTUAL
         * ================================================= */

        const thisWeek =
          activities.filter(
            (activity) =>
              isBetween(
                activity,
                currentWeekStart,
                nextWeekStart,
              ) &&
              activityTimestamp(
                activity,
              ) <= now.getTime(),
          );

        /* =================================================
         * SEMANA ANTERIOR
         * ================================================= */

        const previousWeek =
          activities.filter(
            (activity) =>
              isBetween(
                activity,
                previousWeekStart,
                previousWeekEnd,
              ),
          );

        /* =================================================
         * DEBUG SEMANAL
         * ================================================= */

        console.group(
          "DASHBOARD · COMPARACIÓN SEMANAL",
        );

        console.log(
          "Semana actual:",
          currentWeekRange.label,
        );

        console.log(
          "Semana anterior:",
          previousWeekRange.label,
        );

        console.table(
          thisWeek.map(
            (activity) => ({
              fecha:
                activity.started_at,

              km: Number(
                (
                  finiteNumber(
                    activity.distance_m,
                  ) / 1000
                ).toFixed(2),
              ),
            }),
          ),
        );

        console.log(
          "Sesiones semana actual:",
          thisWeek.length,
        );

        console.log(
          "KM semana actual:",
          thisWeek.reduce(
            (total, activity) =>
              total +
              finiteNumber(
                activity.distance_m,
              ) /
                1000,
            0,
          ),
        );

        console.table(
          previousWeek.map(
            (activity) => ({
              fecha:
                activity.started_at,

              km: Number(
                (
                  finiteNumber(
                    activity.distance_m,
                  ) / 1000
                ).toFixed(2),
              ),
            }),
          ),
        );

        console.log(
          "Sesiones semana anterior:",
          previousWeek.length,
        );

        console.log(
          "KM semana anterior:",
          previousWeek.reduce(
            (total, activity) =>
              total +
              finiteNumber(
                activity.distance_m,
              ) /
                1000,
            0,
          ),
        );

        console.groupEnd();

        /* =================================================
         * FUNCIONES DE SUMA
         * ================================================= */

        function sum(
          rows: ActivityRow[],
          getter: (
            activity: ActivityRow,
          ) => number,
        ): number {
          return rows.reduce(
            (total, activity) => {
              const value =
                finiteNumber(
                  getter(activity),
                );

              return total + value;
            },
            0,
          );
        }

        /* =================================================
         * DISTANCIA
         * ================================================= */

        const kmThis =
          sum(
            thisWeek,
            (activity) =>
              finiteNumber(
                activity.distance_m,
              ),
          ) / 1000;

        const kmPrevious =
          sum(
            previousWeek,
            (activity) =>
              finiteNumber(
                activity.distance_m,
              ),
          ) / 1000;

        /* =================================================
         * TIEMPO
         * ================================================= */

        const timeThis =
          sum(
            thisWeek,
            (activity) =>
              finiteNumber(
                activity.moving_time_s,
              ),
          );

        const timePrevious =
          sum(
            previousWeek,
            (activity) =>
              finiteNumber(
                activity.moving_time_s,
              ),
          );

        /* =================================================
         * DESNIVEL
         * ================================================= */

        const elevationThis =
          sum(
            thisWeek,
            (activity) =>
              finiteNumber(
                activity.elevation_gain_m,
              ),
          );

        const elevationPrevious =
          sum(
            previousWeek,
            (activity) =>
              finiteNumber(
                activity.elevation_gain_m,
              ),
          );

        /* =================================================
         * RITMO PONDERADO
         * ================================================= */

        /**
         * NO hacemos:
         *
         * (ritmo1 + ritmo2 + ritmo3) / 3
         *
         * porque eso distorsiona el resultado.
         *
         * Hacemos:
         *
         * tiempo total / km totales
         */
        const paceThis =
          kmThis > 0 &&
          timeThis > 0
            ? timeThis / kmThis
            : 0;

        const pacePrevious =
          kmPrevious > 0 &&
          timePrevious > 0
            ? timePrevious /
              kmPrevious
            : 0;

        /* =================================================
         * FC MEDIA PONDERADA
         * ================================================= */

        function weightedAverageHr(
          rows: ActivityRow[],
        ): number {
          let weightedSum = 0;

          let totalTime = 0;

          for (const activity of rows) {
            const hr =
              finiteNumber(
                activity.avg_hr,
              );

            const seconds =
              finiteNumber(
                activity.moving_time_s,
              );

            if (
              hr > 0 &&
              seconds > 0
            ) {
              weightedSum +=
                hr * seconds;

              totalTime +=
                seconds;
            }
          }

          if (totalTime <= 0) {
            return 0;
          }

          return (
            weightedSum /
            totalTime
          );
        }

        const hrThis =
          weightedAverageHr(
            thisWeek,
          );

        const hrPrevious =
          weightedAverageHr(
            previousWeek,
          );

        /* =================================================
         * CARGA SEMANAL
         * ================================================= */

        const loadThis =
          Math.round(
            sum(
              thisWeek,
              activityLoad,
            ),
          );

        const loadPrevious =
          Math.round(
            sum(
              previousWeek,
              activityLoad,
            ),
          );

        /* =================================================
         * MÉTRICAS
         * ================================================= */

        const metrics: Metric[] = [
          {
            id: "distance",

            label: "Distancia",

            value:
              kmThis.toFixed(1),

            unit: "km",

            hint:
              previousWeek.length >
              0
                ? `antes ${kmPrevious.toFixed(
                    1,
                  )} km`
                : "sin semana anterior",

            delta: percentage(
              kmThis,
              kmPrevious,
            ),
          },

          {
            id: "sessions",

            label: "Sesiones",

            value:
              thisWeek.length.toString(),

            hint:
              previousWeek.length >
              0
                ? `antes ${previousWeek.length}`
                : "sin semana anterior",

            delta: percentage(
              thisWeek.length,
              previousWeek.length,
            ),
          },

          {
            id: "time",

            label: "Tiempo",

            value:
              formatDuration(
                timeThis,
              ),

            hint:
              timePrevious > 0
                ? `antes ${formatDuration(
                    timePrevious,
                  )}`
                : "sin semana anterior",

            delta: percentage(
              timeThis,
              timePrevious,
            ),
          },

          {
            id: "elevation",

            label: "Desnivel",

            value:
              Math.round(
                elevationThis,
              ).toString(),

            unit: "m",

            hint:
              previousWeek.length >
              0
                ? `antes ${Math.round(
                    elevationPrevious,
                  )} m`
                : "sin semana anterior",

            delta: percentage(
              elevationThis,
              elevationPrevious,
            ),
          },

          {
            id: "pace",

            label: "Ritmo medio",

            value:
              paceThis > 0
                ? formatPace(
                    paceThis,
                  )
                : "—",

            unit: "/km",

            hint:
              pacePrevious > 0
                ? `antes ${formatPace(
                    pacePrevious,
                  )} /km`
                : "sin semana anterior",

            /**
             * En ritmo:
             *
             * - menor es mejor
             * - 5:00 -> 4:45 = +5%
             *
             * Por eso invertimos el signo.
             */
            delta:
              paceThis > 0 &&
              pacePrevious > 0
                ? -(
                    percentage(
                      paceThis,
                      pacePrevious,
                    ) ?? 0
                  )
                : null,
          },

          {
            id: "hr",

            label: "FC media",

            value:
              hrThis > 0
                ? Math.round(
                    hrThis,
                  ).toString()
                : "—",

            unit: "bpm",

            hint:
              hrPrevious > 0
                ? `antes ${Math.round(
                    hrPrevious,
                  )} bpm`
                : "sin semana anterior",

            delta:
              hrThis > 0 &&
              hrPrevious > 0
                ? percentage(
                    hrThis,
                    hrPrevious,
                  )
                : null,
          },

          {
            id: "load",

            label: "Carga",

            value:
              loadThis.toString(),

            hint:
              previousWeek.length >
              0
                ? `antes ${loadPrevious}`
                : "sin semana anterior",

            delta: percentage(
              loadThis,
              loadPrevious,
            ),
          },
        ];

        /* =================================================
         * CARGA DIARIA
         * ================================================= */

        const dailyLoad =
          new Map<
            number,
            number
          >();

        for (const activity of activities) {
          const date =
            startOfDay(
              new Date(
                activity.started_at,
              ),
            );

          const key =
            date.getTime();

          const current =
            dailyLoad.get(
              key,
            ) ?? 0;

          dailyLoad.set(
            key,
            current +
              activityLoad(
                activity,
              ),
          );
        }

        /* =================================================
         * CTL / ATL
         * ================================================= */

        let ctl = 0;

        let atl = 0;

        const today =
          startOfDay(now);

        const daily: Array<{
          date: number;
          ctl: number;
          atl: number;
          load: number;
        }> = [];

        /**
         * Calculamos suficiente histórico
         * para que CTL no arranque de cero
         * demasiado cerca de la fecha actual.
         */
        const calculationStart =
          addDays(
            today,
            -84,
          );

        for (
          let cursor = new Date(
            calculationStart,
          );
          cursor <= today;
          cursor = addDays(
            cursor,
            1,
          )
        ) {
          const day =
            startOfDay(cursor);

          const key =
            day.getTime();

          const load =
            dailyLoad.get(
              key,
            ) ?? 0;

          /**
           * CTL ~42 días.
           */
          ctl +=
            (load - ctl) / 42;

          /**
           * ATL ~7 días.
           */
          atl +=
            (load - atl) / 7;

          daily.push({
            date: key,

            ctl,

            atl,

            load,
          });
        }

        /* =================================================
         * SERIE DE CARGA SEMANAL
         * ================================================= */

        const loadSeries: LoadPoint[] =
          [];

        for (
          let weekOffset = 7;
          weekOffset >= 0;
          weekOffset--
        ) {
          const seriesWeekStart =
            addDays(
              currentWeekStart,
              -weekOffset * 7,
            );

          const seriesWeekEnd =
            addDays(
              seriesWeekStart,
              7,
            );

          const days =
            daily.filter(
              (day) =>
                day.date >=
                  seriesWeekStart.getTime() &&
                day.date <
                  seriesWeekEnd.getTime(),
            );

          const load = Math.round(
            days.reduce(
              (
                total,
                day,
              ) =>
                total + day.load,
              0,
            ),
          );

          const lastDay =
            days.length > 0
              ? days[
                  days.length - 1
                ]
              : null;

          loadSeries.push({
            week:
              seriesWeekStart.toLocaleDateString(
                "es-ES",
                {
                  day: "2-digit",
                  month: "short",
                },
              ),

            carga: load,

            forma: lastDay
              ? Math.round(
                  lastDay.ctl -
                    lastDay.atl,
                )
              : 0,

            fatiga: lastDay
              ? Math.round(
                  lastDay.atl,
                )
              : 0,
          });
        }

        /* =================================================
         * RITMO / VOLUMEN ÚLTIMOS 7 DÍAS
         * ================================================= */

        const paceSeries: PacePoint[] =
          [];

        const volumeSeries: VolumePoint[] =
          [];

        for (
          let i = 6;
          i >= 0;
          i--
        ) {
          const day =
            addDays(
              today,
              -i,
            );

          const nextDay =
            addDays(
              day,
              1,
            );

          const rows =
            activities.filter(
              (activity) =>
                isBetween(
                  activity,
                  day,
                  nextDay,
                ),
            );

          const km =
            sum(
              rows,
              (activity) =>
                finiteNumber(
                  activity.distance_m,
                ),
            ) / 1000;

          const seconds =
            sum(
              rows,
              (activity) =>
                finiteNumber(
                  activity.moving_time_s,
                ),
            );

          const hr =
            weightedAverageHr(
              rows,
            );

          const label =
            day.toLocaleDateString(
              "es-ES",
              {
                weekday: "short",
              },
            );

          paceSeries.push({
            day: label,

            ritmo:
              km > 0 &&
              seconds > 0
                ? Number(
                    (
                      seconds /
                      km /
                      60
                    ).toFixed(2),
                  )
                : 0,

            fc:
              hr > 0
                ? Math.round(hr)
                : 0,
          });

          volumeSeries.push({
            day: label,

            km: Number(
              km.toFixed(1),
            ),
          });
        }

        /* =================================================
         * ZONAS FC
         * ================================================= */

        const maxHr =
          profileRes.data?.max_hr !=
          null
            ? finiteNumber(
                profileRes.data
                  .max_hr,
              )
            : 0;

        let zoneSplit: ZoneSlice[] =
          [];

        const hrActivities =
          activities.filter(
            (activity) =>
              finiteNumber(
                activity.avg_hr,
              ) > 0 &&
              finiteNumber(
                activity.moving_time_s,
              ) > 0,
          );

        if (
          maxHr > 0 &&
          hrActivities.length >
            0
        ) {
          const buckets = [
            0,
            0,
            0,
            0,
            0,
          ];

          let totalSeconds = 0;

          for (const activity of hrActivities) {
            const avgHr =
              finiteNumber(
                activity.avg_hr,
              );

            const ratio =
              avgHr / maxHr;

            let zoneIndex = 0;

            if (ratio < 0.6) {
              zoneIndex = 0;
            } else if (
              ratio < 0.7
            ) {
              zoneIndex = 1;
            } else if (
              ratio < 0.8
            ) {
              zoneIndex = 2;
            } else if (
              ratio < 0.9
            ) {
              zoneIndex = 3;
            } else {
              zoneIndex = 4;
            }

            const seconds =
              finiteNumber(
                activity.moving_time_s,
              );

            buckets[zoneIndex] =
              (buckets[zoneIndex] ?? 0) + seconds;

            totalSeconds +=
              seconds;
          }

          zoneSplit =
            buckets.map(
              (
                value,
                index,
              ) => ({
                zone: `Z${
                  index + 1
                }`,

                pct:
                  totalSeconds >
                  0
                    ? Math.round(
                        (value /
                          totalSeconds) *
                          100,
                      )
                    : 0,
              }),
            );
        }

        /* =================================================
         * HISTORIAL DE ENTRENAMIENTOS
         * ================================================= */

        const last7DaysStart =
          addDays(
            now,
            -7,
          );

        const workouts: WorkoutRow[] =
          activities
            .filter(
              (activity) =>
                activityTimestamp(
                  activity,
                ) >=
                  last7DaysStart.getTime() &&
                activityTimestamp(
                  activity,
                ) <= now.getTime(),
            )
            .sort(
              (a, b) =>
                activityTimestamp(
                  b,
                ) -
                activityTimestamp(
                  a,
                ),
            )
            .slice(0, 100)
            .map(
              (activity) => {
                const km =
                  finiteNumber(
                    activity.distance_m,
                  ) / 1000;

                const storedPace =
                  finiteNumber(
                    activity.avg_pace_s_per_km,
                  );

                const movingTime =
                  finiteNumber(
                    activity.moving_time_s,
                  );

                const calculatedPace =
                  km > 0 &&
                  movingTime > 0
                    ? movingTime /
                      km
                    : 0;

                const paceSeconds =
                  storedPace > 0
                    ? storedPace
                    : calculatedPace;

                return {
                  id: activity.id,

                  title:
                    activity.name ??
                    "Entrenamiento",

                  date:
                    new Date(
                      activity.started_at,
                    ).toLocaleDateString(
                      "es-ES",
                    ),

                  distance: `${km.toFixed(
                    2,
                  )} km`,

                  pace:
                    paceSeconds > 0
                      ? `${formatPace(
                          paceSeconds,
                        )} /km`
                      : "—",

                  hr: Math.round(
                    finiteNumber(
                      activity.avg_hr,
                    ),
                  ),

                  effort:
                    effortLabel(
                      activity.suffer_score,
                    ),
                };
              },
            );

        /* =================================================
         * DATOS NO DISPONIBLES
         * ================================================= */

        /**
         * No inventamos predicciones.
         */
        const predictions: PredictionRow[] =
          [];

        /**
         * No inventamos objetivos.
         */
        const goals: GoalRow[] =
          [];

        /**
         * No inventamos insights.
         */
        const insights: InsightRow[] =
          [];

        /**
         * No inventamos carrera.
         */
        const nextRace:
          DashboardData["nextRace"] =
          null;

        /* =================================================
         * ESTADO FINAL
         * ================================================= */

        if (!cancelled) {
          setState({
            loading: false,

            hasActivities:
              activities.length >
              0,

            metrics,

            loadSeries,

            paceSeries,

            volumeSeries,

            zoneSplit,

            workouts,

            predictions,

            goals,

            insights,

            currentWeek:
              currentWeekRange,

            previousWeek:
              previousWeekRange,

            nextRace,
          });
        }
      } catch (error) {
        console.error(
          "Error cargando dashboard:",
          error,
        );

        if (!cancelled) {
          setState({
            loading: false,
            ...EMPTY,
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/* =========================================================
 * CONTEXTO
 * ========================================================= */

const DashboardDataContext =
  createContext<
    DashboardData | null
  >(null);

/* =========================================================
 * PROVIDER
 * ========================================================= */

export function DashboardDataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value =
    useDashboardData();

  return (
    <DashboardDataContext.Provider
      value={value}
    >
      {children}
    </DashboardDataContext.Provider>
  );
}

/* =========================================================
 * HOOK
 * ========================================================= */

export function useDashboard(): DashboardData {
  const context =
    useContext(
      DashboardDataContext,
    );

  if (!context) {
    throw new Error(
      "useDashboard debe usarse dentro de DashboardDataProvider",
    );
  }

  return context;
}