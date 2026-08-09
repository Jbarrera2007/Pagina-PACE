import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { effortLabel } from "@/lib/effort";

/**
 * Datos del panel principal. TODO se lee de la base de datos o se calcula
 * matemáticamente a partir de esos datos reales. Si no hay información
 * suficiente, se devuelve 0 (o lista vacía). Nunca se generan valores ficticios.
 */

export interface Metric {
  id: string;
  label: string;
  value: string;
  unit?: string;
  hint: string;
  delta: number;
}

export interface LoadPoint {
  week: string;
  carga: number;
  forma: number;
  fatiga: number;
}

export interface PacePoint {
  day: string;
  ritmo: number; // min/km
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
  nextRace: { name: string; date: string; daysLeft: number; plan: string; goal: string } | null;
}

type ActivityRow = {
  id: string;
  name: string | null;
  started_at: string;
  distance_m: number | null;
  moving_time_s: number | null;
  avg_pace_s_per_km: number | null;
  avg_hr: number | null;
  elevation_gain_m: number | null;
  training_load: number | null;
  suffer_score: number | null;
};

const DAY_MS = 86400000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function pct(current: number, previous: number) {
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function formatPaceLabel(secondsPerKm: number) {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return "—";
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTimeFromSeconds(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function activityLoad(a: ActivityRow) {
  if (a.training_load !== null && a.training_load !== undefined) return Number(a.training_load);
  if (a.suffer_score !== null && a.suffer_score !== undefined) return Number(a.suffer_score);
  return Math.round((a.moving_time_s ?? 0) / 60); // minutos de actividad como carga
}

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
  nextRace: null,
};

export function useDashboardData(): DashboardData {
  const [state, setState] = useState<DashboardData>({ loading: true, ...EMPTY });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        if (!cancelled) setState({ loading: false, ...EMPTY });
        return;
      }

      const since = new Date(Date.now() - 365 * DAY_MS).toISOString();

      const [activitiesRes, goalsRes, predictionsRes, insightsRes, profileRes, planRes] =
        await Promise.all([
          supabase
            .from("activities")
            .select(
              "id, name, started_at, distance_m, moving_time_s, avg_pace_s_per_km, avg_hr, elevation_gain_m, training_load, suffer_score",
            )
            .eq("user_id", user.id)
            .gte("started_at", since)
            .order("started_at", { ascending: false }),
          supabase
            .from("goals")
            .select("id, label, target_value, current_value, status")
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: true }),
          supabase
            .from("race_predictions")
            .select("distance_key, predicted_time_s, confidence")
            .eq("user_id", user.id),
          supabase
            .from("ai_analysis")
            .select("title, summary, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase.from("profiles").select("max_hr").eq("id", user.id).maybeSingle(),
          supabase
            .from("training_plans")
            .select("name, goal_race, target_time_s, starts_on, weeks, is_active")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      if (cancelled) return;

      const activities = (activitiesRes.data ?? []) as ActivityRow[];
      const maxHr = profileRes.data?.max_hr ?? null;

      // ---------- métricas de la semana vs semana anterior ----------
      const weekStart = startOfWeek(new Date());
      const prevWeekStart = new Date(weekStart.getTime() - 7 * DAY_MS);

      const inRange = (a: ActivityRow, from: Date, to: Date) => {
        const t = new Date(a.started_at).getTime();
        return t >= from.getTime() && t < to.getTime();
      };

      const thisWeek = activities.filter((a) => inRange(a, weekStart, new Date(Date.now() + DAY_MS)));
      const lastWeek = activities.filter((a) => inRange(a, prevWeekStart, weekStart));

      const sum = (rows: ActivityRow[], f: (a: ActivityRow) => number) =>
        rows.reduce((acc, r) => acc + f(r), 0);

      const kmThis = sum(thisWeek, (a) => Number(a.distance_m ?? 0)) / 1000;
      const kmLast = sum(lastWeek, (a) => Number(a.distance_m ?? 0)) / 1000;
      const timeThis = sum(thisWeek, (a) => Number(a.moving_time_s ?? 0));
      const timeLast = sum(lastWeek, (a) => Number(a.moving_time_s ?? 0));
      const elevThis = sum(thisWeek, (a) => Number(a.elevation_gain_m ?? 0));
      const elevLast = sum(lastWeek, (a) => Number(a.elevation_gain_m ?? 0));
      const paceThis = kmThis > 0 ? timeThis / kmThis : 0;
      const paceLast = kmLast > 0 ? timeLast / kmLast : 0;

      const metrics: Metric[] = [
        {
          id: "km",
          label: "Distancia semanal",
          value: kmThis.toFixed(1),
          unit: "km",
          hint: `${thisWeek.length} ${thisWeek.length === 1 ? "sesión" : "sesiones"}`,
          delta: pct(kmThis, kmLast),
        },
        {
          id: "pace",
          label: "Ritmo medio",
          value: paceThis > 0 ? formatPaceLabel(paceThis) : "0:00",
          unit: "/km",
          hint: paceLast > 0 ? `Antes ${formatPaceLabel(paceLast)}` : "Sin referencia previa",
          // mejora de ritmo = ritmo más bajo, por eso se invierte el signo
          delta: paceLast > 0 && paceThis > 0 ? -pct(paceThis, paceLast) : 0,
        },
        {
          id: "time",
          label: "Tiempo en movimiento",
          value: timeThis > 0 ? formatDuration(timeThis) : "0m",
          hint: timeLast > 0 ? `Antes ${formatDuration(timeLast)}` : "Sin referencia previa",
          delta: pct(timeThis, timeLast),
        },
        {
          id: "elev",
          label: "Desnivel positivo",
          value: Math.round(elevThis).toString(),
          unit: "m",
          hint: `Antes ${Math.round(elevLast)} m`,
          delta: pct(elevThis, elevLast),
        },
      ];

      // ---------- carga / forma / fatiga (CTL-ATL sobre carga diaria real) ----------
      const dailyLoad = new Map<number, number>();
      for (const a of activities) {
        const key = startOfDay(new Date(a.started_at)).getTime();
        dailyLoad.set(key, (dailyLoad.get(key) ?? 0) + activityLoad(a));
      }

      const today = startOfDay(new Date());
      let ctl = 0;
      let atl = 0;
      const daily: { date: number; ctl: number; atl: number; load: number }[] = [];
      for (let i = 90; i >= 0; i--) {
        const day = today.getTime() - i * DAY_MS;
        const load = dailyLoad.get(day) ?? 0;
        ctl = ctl + (load - ctl) / 42;
        atl = atl + (load - atl) / 7;
        daily.push({ date: day, ctl, atl, load });
      }

      const loadSeries: LoadPoint[] = [];
      for (let w = 6; w >= 0; w--) {
        const ws = new Date(weekStart.getTime() - w * 7 * DAY_MS);
        const we = new Date(ws.getTime() + 7 * DAY_MS);
        const days = daily.filter((d) => d.date >= ws.getTime() && d.date < we.getTime());
        const carga = Math.round(days.reduce((acc, d) => acc + d.load, 0));
        const last = days.at(-1);
        loadSeries.push({
          week: ws.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
          carga,
          forma: last ? Math.round(last.ctl - last.atl) : 0,
          fatiga: last ? Math.round(last.atl) : 0,
        });
      }

      // ---------- últimos 7 días: ritmo, FC y volumen ----------
      const paceSeries: PacePoint[] = [];
      const volumeSeries: VolumePoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(today.getTime() - i * DAY_MS);
        const next = new Date(day.getTime() + DAY_MS);
        const rows = activities.filter((a) => inRange(a, day, next));
        const km = sum(rows, (a) => Number(a.distance_m ?? 0)) / 1000;
        const secs = sum(rows, (a) => Number(a.moving_time_s ?? 0));
        const hrRows = rows.filter((a) => (a.avg_hr ?? 0) > 0);
        const label = day.toLocaleDateString("es-ES", { weekday: "short" });
        paceSeries.push({
          day: label,
          ritmo: km > 0 ? Number((secs / km / 60).toFixed(2)) : 0,
          fc:
            hrRows.length > 0
              ? Math.round(sum(hrRows, (a) => Number(a.avg_hr ?? 0)) / hrRows.length)
              : 0,
        });
        volumeSeries.push({ day: label, km: Number(km.toFixed(1)) });
      }

      // ---------- zonas de FC (a partir de FC media real y FC máx del perfil) ----------
      let zoneSplit: ZoneSlice[] = [];
      const hrActivities = activities.filter((a) => (a.avg_hr ?? 0) > 0 && (a.moving_time_s ?? 0) > 0);
      if (maxHr && maxHr > 0 && hrActivities.length > 0) {
        const buckets = [0, 0, 0, 0, 0];
        let total = 0;
        for (const a of hrActivities) {
          const ratio = (a.avg_hr ?? 0) / maxHr;
          const idx = ratio < 0.6 ? 0 : ratio < 0.7 ? 1 : ratio < 0.8 ? 2 : ratio < 0.9 ? 3 : 4;
          const t = Number(a.moving_time_s ?? 0);
          buckets[idx] = (buckets[idx] ?? 0) + t;
          total += t;
        }
        zoneSplit = buckets.map((v, i) => ({
          zone: `Z${i + 1}`,
          pct: total > 0 ? Math.round((v / total) * 100) : 0,
        }));
      }

      // ---------- tabla de entrenamientos (últimos 7 días) ----------
      const workouts: WorkoutRow[] = activities
        .filter((a) => new Date(a.started_at).getTime() >= today.getTime() - 7 * DAY_MS)
        .slice(0, 10)
        .map((a) => {
          const km = Number(a.distance_m ?? 0) / 1000;
          const paceS =
            a.avg_pace_s_per_km ?? (km > 0 ? Number(a.moving_time_s ?? 0) / km : 0);
          return {
            id: a.id,
            title: a.name ?? "Entrenamiento",
            date: new Date(a.started_at).toLocaleDateString("es-ES"),
            distance: `${km.toFixed(2)} km`,
            pace: paceS > 0 ? `${formatPaceLabel(Number(paceS))} /km` : "—",
            hr: a.avg_hr ?? 0,
            effort: effortLabel(a.suffer_score),
          };
        });

      const predictions: PredictionRow[] = (predictionsRes.data ?? []).map((p) => ({
        distance: p.distance_key,
        time: formatTimeFromSeconds(Number(p.predicted_time_s ?? 0)),
        confidence: Math.round(Number(p.confidence ?? 0)),
      }));

      const goals: GoalRow[] = (goalsRes.data ?? []).map((g) => {
        const target = Number(g.target_value ?? 0);
        const current = Number(g.current_value ?? 0);
        return {
          id: g.id,
          label: g.label,
          progress: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
        };
      });

      const insights: InsightRow[] = (insightsRes.data ?? []).map((i) => ({
        title: i.title,
        body: i.summary,
      }));

      const plan = planRes.data;
      let nextRace: DashboardData["nextRace"] = null;
      if (plan?.goal_race && plan.starts_on) {
        const raceDate = new Date(plan.starts_on);
        raceDate.setDate(raceDate.getDate() + Number(plan.weeks ?? 0) * 7);
        const daysLeft = Math.max(
          0,
          Math.ceil((raceDate.getTime() - Date.now()) / DAY_MS),
        );
        nextRace = {
          name: plan.goal_race,
          date: raceDate.toLocaleDateString("es-ES"),
          daysLeft,
          plan: plan.name,
          goal: plan.target_time_s ? formatTimeFromSeconds(Number(plan.target_time_s)) : "—",
        };
      }

      setState({
        loading: false,
        hasActivities: activities.length > 0,
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

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// ---------------------------------------------------------------------------
// Contexto para que todos los paneles compartan una única carga de datos.
// ---------------------------------------------------------------------------
import { createContext, createElement, useContext, type ReactNode } from "react";

const DashboardDataContext = createContext<DashboardData | null>(null);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const value = useDashboardData();
  return createElement(DashboardDataContext.Provider, { value }, children);
}

export function useDashboard(): DashboardData {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error("useDashboard debe usarse dentro de DashboardDataProvider");
  return ctx;
}
