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

const DAY_MS = 86400000;

/* =========================================================
 * FECHAS
 * ========================================================= */

function startOfDay(date: Date): Date {
  const d = new Date(date);

  d.setHours(0, 0, 0, 0);

  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);

  /*
   * Semana empieza en lunes.
   *
   * JS:
   * domingo = 0
   * lunes = 1
   * ...
   */

  const daysSinceMonday =
    (d.getDay() + 6) % 7;

  d.setDate(
    d.getDate() - daysSinceMonday,
  );

  return d;
}

/* =========================================================
 * PORCENTAJES
 * ========================================================= */

/**
 * Calcula el porcentaje de cambio entre dos valores.
 *
 * Si previous <= 0 no existe una referencia válida.
 *
 * En ese caso devolvemos null.
 *
 * Esto evita mostrar:
 *
 * "0%"
 *
 * cuando realmente no tenemos semana anterior.
 */
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
    ((current - previous) / previous) * 100,
  );
}

/* =========================================================
 * FORMATO DURACIÓN
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

  const h = Math.floor(
    seconds / 3600,
  );

  const m = Math.round(
    (seconds % 3600) / 60,
  );

  if (h > 0) {
    return `${h}h ${String(m).padStart(
      2,
      "0",
    )}m`;
  }

  return `${m}m`;
}

/* =========================================================
 * FORMATO RITMO
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
 * CARGA DE ACTIVIDAD
 * ========================================================= */

/**
 * Carga basada exclusivamente en datos reales.
 *
 * Prioridad:
 *
 * 1. suffer_score real de Supabase.
 * 2. tiempo en movimiento real como aproximación.
 *
 * Nunca genera números aleatorios.
 */
function activityLoad(
  activity: ActivityRow,
): number {
  const suffer = Number(
    activity.suffer_score ?? 0,
  );

  if (
    Number.isFinite(suffer) &&
    suffer > 0
  ) {
    return suffer;
  }

  const movingTime = Number(
    activity.moving_time_s ?? 0,
  );

  if (
    Number.isFinite(movingTime) &&
    movingTime > 0
  ) {
    return movingTime / 60;
  }

  return 0;
}

/* =========================================================
 * VALIDACIÓN DE ACTIVIDADES
 * ========================================================= */

function isValidActivity(
  activity: ActivityRow,
): boolean {
  const date = new Date(
    activity.started_at,
  );

  if (!Number.isFinite(date.getTime())) {
    return false;
  }

  const distance = Number(
    activity.distance_m ?? 0,
  );

  const movingTime = Number(
    activity.moving_time_s ?? 0,
  );

  /*
   * Una actividad tiene que tener al menos
   * distancia o tiempo real.
   */
  return (
    distance > 0 ||
    movingTime > 0
  );
}

/* =========================================================
 * ESTADO VACÍO
 * ========================================================= */

const EMPTY: Omit<
  DashboardData,
  "loading"
> = {
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
  nextRace: null,
};

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

        const user = authData.user;

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
         * FECHAS
         * ================================================= */

        const now = new Date();

        const currentWeekStart =
          startOfWeek(now);

        /*
         * Necesitamos:
         *
         * - semana actual
         * - semana anterior
         * - histórico para CTL/ATL
         *
         * 8 semanas reales.
         */

        const since = new Date(
          currentWeekStart.getTime() -
            7 * 7 * DAY_MS,
        ).toISOString();

        /* =================================================
         * SUPABASE
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
            .eq("user_id", user.id)
            .gte(
              "started_at",
              since,
            )
            .lte(
              "started_at",
              now.toISOString(),
            )
            .order(
              "started_at",
              {
                ascending: false,
              },
            ),

          supabase
            .from("profiles")
            .select("max_hr")
            .eq("id", user.id)
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
         * ACTIVIDADES REALES
         * ================================================= */

        const rawActivities =
  (activitiesRes.data ?? []) as ActivityRow[];

const activities =
  rawActivities.filter(
    isValidActivity,
  );

console.table(
  activities.map((activity) => ({
    id: activity.id,
    name: activity.name,
    date: activity.started_at,
    km:
      Number(activity.distance_m ?? 0) / 1000,
    time:
      Number(activity.moving_time_s ?? 0),
    pace:
      activity.avg_pace_s_per_km,
    hr:
      activity.avg_hr,
    suffer:
      activity.suffer_score,
  })),
);

        /*
         * IMPORTANTE:
         *
         * Desde aquí abajo solo trabajamos
         * con actividades reales y válidas.
         */

        const maxHr =
          profileRes.data?.max_hr !=
          null
            ? Number(
                profileRes.data.max_hr,
              )
            : null;

        /* =================================================
         * FUNCIONES AUXILIARES
         * ================================================= */

        function isBetween(
          activity: ActivityRow,
          from: Date,
          to: Date,
        ): boolean {
          const timestamp =
            new Date(
              activity.started_at,
            ).getTime();

          return (
            timestamp >=
              from.getTime() &&
            timestamp <
              to.getTime()
          );
        }

        function sum(
          rows: ActivityRow[],
          getter: (
            activity: ActivityRow,
          ) => number,
        ): number {
          return rows.reduce(
            (total, activity) => {
              const value = Number(
                getter(activity),
              );

              return (
                total +
                (Number.isFinite(value)
                  ? value
                  : 0)
              );
            },
            0,
          );
        }

        /* =================================================
         * ESTA SEMANA / SEMANA ANTERIOR
         * ================================================= */

        const weekStart =
          currentWeekStart;

        const previousWeekStart =
          new Date(
            weekStart.getTime() -
              7 * DAY_MS,
          );

        /*
         * Semana actual:
         *
         * lunes 00:00 -> ahora
         */

        const thisWeek =
          activities.filter(
            (activity) =>
              isBetween(
                activity,
                weekStart,
                now,
              ),
          );

        /*
         * Semana anterior:
         *
         * lunes anterior -> lunes actual
         */

        const previousWeek =
          activities.filter(
            (activity) =>
              isBetween(
                activity,
                previousWeekStart,
                weekStart,
              ),
          );

        /* =================================================
         * DISTANCIA
         * ================================================= */

        const kmThis =
          sum(
            thisWeek,
            (activity) =>
              Number(
                activity.distance_m ??
                  0,
              ),
          ) / 1000;

        const kmPrevious =
          sum(
            previousWeek,
            (activity) =>
              Number(
                activity.distance_m ??
                  0,
              ),
          ) / 1000;

        /* =================================================
         * TIEMPO
         * ================================================= */

        const timeThis =
          sum(
            thisWeek,
            (activity) =>
              Number(
                activity.moving_time_s ??
                  0,
              ),
          );

        const timePrevious =
          sum(
            previousWeek,
            (activity) =>
              Number(
                activity.moving_time_s ??
                  0,
              ),
          );

        /* =================================================
         * DESNIVEL
         * ================================================= */

        const elevationThis =
          sum(
            thisWeek,
            (activity) =>
              Number(
                activity.elevation_gain_m ??
                  0,
              ),
          );

        const elevationPrevious =
          sum(
            previousWeek,
            (activity) =>
              Number(
                activity.elevation_gain_m ??
                  0,
              ),
          );

        /* =================================================
         * RITMO MEDIO
         * ================================================= */

        /*
         * Ritmo ponderado:
         *
         * tiempo total / distancia total
         *
         * Esto es mejor que hacer una media simple
         * de los ritmos individuales.
         */

        const paceThis =
          kmThis > 0
            ? timeThis / kmThis
            : 0;

        const pacePrevious =
          kmPrevious > 0
            ? timePrevious /
              kmPrevious
            : 0;

        /* =================================================
         * MÉTRICAS
         * ================================================= */

        const metrics: Metric[] = [
  {
    id: "km",
    label: "Distancia semanal",
    value: kmThis.toFixed(1),
    unit: "km",
    hint:
      previousWeek.length > 0
        ? `${thisWeek.length} ${
            thisWeek.length === 1
              ? "sesión"
              : "sesiones"
          } · semana anterior ${kmPrevious.toFixed(1)} km`
        : `${thisWeek.length} ${
            thisWeek.length === 1
              ? "sesión"
              : "sesiones"
          } · sin semana anterior`,
    delta: percentage(
      kmThis,
      kmPrevious,
    ),
  },

  {
    id: "pace",
    label: "Ritmo medio",
    value:
      paceThis > 0
        ? formatPace(paceThis)
        : "0:00",
    unit: "/km",
    hint:
      pacePrevious > 0
        ? `Semana anterior ${formatPace(
            pacePrevious,
          )} /km`
        : "Sin referencia previa",
    delta:
      pacePrevious > 0 && paceThis > 0
        ? -percentage(
            paceThis,
            pacePrevious,
          )!
        : null,
  },

  {
    id: "time",
    label: "Tiempo en movimiento",
    value:
      timeThis > 0
        ? formatDuration(timeThis)
        : "0m",
    hint:
      timePrevious > 0
        ? `Semana anterior ${formatDuration(
            timePrevious,
          )}`
        : "Sin referencia previa",
    delta: percentage(
      timeThis,
      timePrevious,
    ),
  },

  {
    id: "elevation",
    label: "Desnivel positivo",
    value: Math.round(
      elevationThis,
    ).toString(),
    unit: "m",
    hint:
      previousWeek.length > 0
        ? `Semana anterior ${Math.round(
            elevationPrevious,
          )} m`
        : "Sin semana anterior",
    delta: percentage(
      elevationThis,
      elevationPrevious,
    ),
  },
];

        /* =================================================
         * CARGA / FORMA / FATIGA
         * ================================================= */

        const dailyLoad =
          new Map<number, number>();

        for (const activity of activities) {
          const activityDate =
            startOfDay(
              new Date(
                activity.started_at,
              ),
            );

          const key =
            activityDate.getTime();

          const previous =
            dailyLoad.get(key) ?? 0;

          dailyLoad.set(
            key,
            previous +
              activityLoad(activity),
          );
        }

        /*
         * Calculamos los últimos 8 semanas
         * utilizando solamente carga real.
         */

        const today =
          startOfDay(now);

        let ctl = 0;
        let atl = 0;

        const daily: Array<{
          date: number;
          ctl: number;
          atl: number;
          load: number;
        }> = [];

        /*
         * 56 días = 8 semanas.
         *
         * Empezamos desde el día más antiguo.
         */

        for (
          let i = 56;
          i >= 0;
          i--
        ) {
          const day =
            today.getTime() -
            i * DAY_MS;

          const load =
            dailyLoad.get(day) ?? 0;

          /*
           * CTL = carga crónica aproximada
           * de 42 días.
           */

          ctl =
            ctl +
            (load - ctl) / 42;

          /*
           * ATL = carga aguda aproximada
           * de 7 días.
           */

          atl =
            atl +
            (load - atl) / 7;

          daily.push({
            date: day,
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
          let week = 7;
          week >= 0;
          week--
        ) {
          const weekStartDate =
            new Date(
              weekStart.getTime() -
                week *
                  7 *
                  DAY_MS,
            );

          const weekEndDate =
            new Date(
              weekStartDate.getTime() +
                7 * DAY_MS,
            );

          const days =
            daily.filter(
              (day) =>
                day.date >=
                  weekStartDate.getTime() &&
                day.date <
                  weekEndDate.getTime(),
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
              weekStartDate.toLocaleDateString(
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
         * RITMO Y VOLUMEN - ÚLTIMOS 7 DÍAS
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
          const day = new Date(
            today.getTime() -
              i * DAY_MS,
          );

          const nextDay =
            new Date(
              day.getTime() +
                DAY_MS,
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
                Number(
                  activity.distance_m ??
                    0,
                ),
            ) / 1000;

          const seconds =
            sum(
              rows,
              (activity) =>
                Number(
                  activity.moving_time_s ??
                    0,
                ),
            );

          const hrRows =
            rows.filter(
              (activity) =>
                Number(
                  activity.avg_hr ??
                    0,
                ) > 0,
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
              km > 0
                ? Number(
                    (
                      seconds /
                      km /
                      60
                    ).toFixed(2),
                  )
                : 0,

            fc:
              hrRows.length > 0
                ? Math.round(
                    sum(
                      hrRows,
                      (activity) =>
                        Number(
                          activity.avg_hr ??
                            0,
                        ),
                    ) /
                      hrRows.length,
                  )
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
         * ZONAS DE FRECUENCIA CARDÍACA
         * ================================================= */

        let zoneSplit: ZoneSlice[] =
          [];

        const hrActivities =
          activities.filter(
            (activity) =>
              Number(
                activity.avg_hr ??
                  0,
              ) > 0 &&
              Number(
                activity.moving_time_s ??
                  0,
              ) > 0,
          );

        if (
          maxHr &&
          maxHr > 0 &&
          hrActivities.length > 0
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
              Number(
                activity.avg_hr ??
                  0,
              );

            const ratio =
              avgHr / maxHr;

            const zoneIndex =
              ratio < 0.6
                ? 0
                : ratio < 0.7
                  ? 1
                  : ratio < 0.8
                    ? 2
                    : ratio < 0.9
                      ? 3
                      : 4;

            const seconds =
              Number(
                activity.moving_time_s ??
                  0,
              );

            buckets[
              zoneIndex
            ] =
              (buckets[
                zoneIndex
              ] ?? 0) + seconds;

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
                  totalSeconds > 0
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
         * ENTRENAMIENTOS
         * ================================================= */

        const last7Days =
          new Date(
            now.getTime() -
              7 * DAY_MS,
          );

        const workouts: WorkoutRow[] =
          activities
            .filter(
              (activity) =>
                new Date(
                  activity.started_at,
                ).getTime() >=
                last7Days.getTime(),
            )
            .slice(0, 10)
            .map((activity) => {
              const km =
                Number(
                  activity.distance_m ??
                    0,
                ) / 1000;

              const storedPace =
                Number(
                  activity.avg_pace_s_per_km ??
                    0,
                );

              const paceSeconds =
                storedPace > 0
                  ? storedPace
                  : km > 0
                    ? Number(
                        activity.moving_time_s ??
                          0,
                      ) / km
                    : 0;

              return {
                id: activity.id,

                title:
                  activity.name ??
                  "Entrenamiento",

                date: new Date(
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

                hr: Number(
                  activity.avg_hr ??
                    0,
                ),

                effort:
                  effortLabel(
                    activity.suffer_score,
                  ),
              };
            });

        /* =================================================
         * DATOS NO DISPONIBLES
         * ================================================= */

        /*
         * No inventamos predicciones,
         * objetivos, insights ni carreras.
         */

        const predictions: PredictionRow[] =
          [];

        const goals: GoalRow[] = [];

        const insights: InsightRow[] =
          [];

        const nextRace: DashboardData["nextRace"] =
          null;

        /* =================================================
         * ACTUALIZAR ESTADO
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
 * CONTEXTO DEL DASHBOARD
 * ========================================================= */

const DashboardDataContext =
  createContext<DashboardData | null>(
    null,
  );

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