/**
 * PACE Intelligence Engine (PIE)
 *
 * Motor propio de inteligencia deportiva. Todas las métricas se derivan de las
 * actividades sincronizadas: no se copia ninguna métrica de Strava, se
 * interpretan los datos brutos para responder preguntas que el corredor se hace.
 */

import { PIE_TODAY, pieActivities, type PieActivity, type SessionKind } from "./activities";

const DAY = 86400000;

export function fmtPace(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Carga interna de una sesión (TRIMP simplificado: tiempo × intensidad relativa). */
function sessionLoad(a: PieActivity) {
  const intensity = a.avgHr / 150;
  return (a.movingTimeS / 60) * intensity * intensity;
}

function within(acts: PieActivity[], fromDaysAgo: number, toDaysAgo = 0) {
  const from = PIE_TODAY.getTime() - fromDaysAgo * DAY;
  const to = PIE_TODAY.getTime() - toDaysAgo * DAY;
  return acts.filter((a) => {
    const t = new Date(a.date).getTime();
    return t >= from && t <= to;
  });
}

/* ------------------------------- Runner IQ -------------------------------- */

export interface IQComponent {
  key: string;
  label: string;
  value: number;
  weight: number;
  hint: string;
}

function computeIQAt(acts: PieActivity[], daysAgo: number) {
  const win = (from: number, to: number) =>
    acts.filter((a) => {
      const t = new Date(a.date).getTime();
      return (
        t >= PIE_TODAY.getTime() - (daysAgo + from) * DAY && t <= PIE_TODAY.getTime() - (daysAgo + to) * DAY
      );
    });

  const last28 = win(28, 0);
  const prev28 = win(56, 28);
  const last90 = win(90, 0);
  if (last28.length === 0) return 0;

  // Consistencia: sesiones/semana respecto a un objetivo de 5
  const consistency = clamp((last28.length / 4 / 5) * 100);
  // Volumen: km/semana respecto a 70 km
  const volume = clamp((sum(last28.map((a) => a.distanceKm)) / 4 / 70) * 100);
  // Ritmo: 5:30 = 40 pts, 3:50 = 100 pts (rodajes y calidad ponderados)
  const meanPace = avg(last28.map((a) => a.paceS));
  const pace = clamp(100 - ((meanPace - 230) / 130) * 60);
  // Eficiencia cardiaca: metros por latido
  const eff = avg(last28.map((a) => (a.distanceKm * 1000) / (a.avgHr * (a.movingTimeS / 60))));
  const heart = clamp(((eff - 0.9) / 0.9) * 100);
  // Recuperación: descenso de FC a igual ritmo respecto al bloque anterior
  const recovery = clamp(50 + (avg(prev28.map((a) => a.avgHr)) - avg(last28.map((a) => a.avgHr))) * 8);
  // Evolución: mejora de ritmo en 90 días
  const oldPace = avg(last90.slice(0, Math.max(1, Math.floor(last90.length / 3))).map((a) => a.paceS));
  const evolution = clamp(50 + (oldPace - meanPace) * 2.2);
  // Carga: ACWR cercano a 1.0 es óptimo
  const acute = sum(win(7, 0).map(sessionLoad));
  const chronic = sum(win(28, 0).map(sessionLoad)) / 4;
  const ratio = chronic > 0 ? acute / chronic : 1;
  const load = clamp(100 - Math.abs(ratio - 1.05) * 130);

  const components: IQComponent[] = [
    { key: "consistency", label: "Consistencia", value: Math.round(consistency), weight: 0.2, hint: "sesiones/semana" },
    { key: "load", label: "Carga", value: Math.round(load), weight: 0.15, hint: "aguda vs crónica" },
    { key: "pace", label: "Ritmo", value: Math.round(pace), weight: 0.15, hint: "ritmo medio 28d" },
    { key: "heart", label: "Coste cardíaco", value: Math.round(heart), weight: 0.15, hint: "m por latido" },
    { key: "recovery", label: "Recuperación", value: Math.round(recovery), weight: 0.1, hint: "deriva de FC" },
    { key: "volume", label: "Volumen", value: Math.round(volume), weight: 0.1, hint: "km/semana" },
    { key: "evolution", label: "Evolución", value: Math.round(evolution), weight: 0.15, hint: "tendencia 90d" },
  ];

  const score = Math.round(sum(components.map((c) => c.value * c.weight)));
  return { score: clamp(score), components };
}

export interface RunnerIQ {
  score: number;
  components: IQComponent[];
  deltaWeek: number;
  deltaMonth: number;
  deltaYear: number;
  weekly: { label: string; iq: number }[];
  monthly: { label: string; iq: number }[];
  yearly: { label: string; iq: number }[];
  level: string;
}

function levelFor(score: number) {
  if (score >= 90) return "Élite amateur";
  if (score >= 80) return "Avanzado";
  if (score >= 68) return "Intermedio alto";
  if (score >= 55) return "Intermedio";
  return "En construcción";
}

export function runnerIQ(acts: PieActivity[]): RunnerIQ {
  const now = computeIQAt(acts, 0) as { score: number; components: IQComponent[] };
  const at = (d: number) => {
    const r = computeIQAt(acts, d);
    return typeof r === "number" ? 0 : r.score;
  };

  const weekly = Array.from({ length: 8 }, (_, i) => {
    const d = (7 - i) * 7;
    return { label: `S-${7 - i}`, iq: at(d) };
  });
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const d = (11 - i) * 30;
    const date = new Date(PIE_TODAY.getTime() - d * DAY);
    return { label: date.toLocaleDateString("es-ES", { month: "short" }), iq: at(d) };
  });
  const yearly = Array.from({ length: 3 }, (_, i) => {
    const d = (2 - i) * 365;
    return { label: String(PIE_TODAY.getFullYear() - (2 - i)), iq: at(d) };
  });

  return {
    score: now.score,
    components: now.components,
    deltaWeek: now.score - at(7),
    deltaMonth: now.score - at(30),
    deltaYear: now.score - at(365),
    weekly,
    monthly,
    yearly,
    level: levelFor(now.score),
  };
}

/* ----------------------------- Consistency -------------------------------- */

export interface Consistency {
  pct: number;
  done: number;
  planned: number;
  streakWeeks: number;
  bestStreak: number;
  weeks: { label: string; sesiones: number }[];
}

export function consistencyIndex(acts: PieActivity[]): Consistency {
  const planPerWeek = 5;
  const weeks: { label: string; sesiones: number }[] = [];
  for (let w = 11; w >= 0; w--) {
    const n = within(acts, (w + 1) * 7, w * 7).length;
    weeks.push({ label: `S-${w}`, sesiones: n });
  }
  const done = sum(weeks.slice(-8).map((w) => w.sesiones));
  const planned = planPerWeek * 8;

  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i]!.sesiones >= 4) streak++;
    else break;
  }
  let best = 0;
  let cur = 0;
  for (const w of weeks) {
    if (w.sesiones >= 4) {
      cur++;
      best = Math.max(best, cur);
    } else cur = 0;
  }

  return {
    pct: Math.round(clamp((done / planned) * 100)),
    done,
    planned,
    streakWeeks: streak,
    bestStreak: best,
    weeks,
  };
}

/* -------------------------- Improvement velocity --------------------------- */

export type VelocityLabel = "Muy rápida" | "Rápida" | "Normal" | "Estancada" | "En descenso";

export interface ImprovementVelocity {
  label: VelocityLabel;
  secPerKmPerMonth: number;
  iqPerMonth: number;
  series: { label: string; ritmo: number }[];
}

export function improvementVelocity(acts: PieActivity[], iq: RunnerIQ): ImprovementVelocity {
  const series = Array.from({ length: 6 }, (_, i) => {
    const from = (6 - i) * 30;
    const chunk = within(acts, from, from - 30).filter((a) => a.kind === "rodaje");
    const date = new Date(PIE_TODAY.getTime() - (from - 15) * DAY);
    return {
      label: date.toLocaleDateString("es-ES", { month: "short" }),
      ritmo: Math.round(avg(chunk.map((a) => a.paceS))),
    };
  }).filter((p) => p.ritmo > 0);

  const first = series[0]?.ritmo ?? 0;
  const last = series[series.length - 1]?.ritmo ?? 0;
  const months = Math.max(1, series.length - 1);
  const rate = (first - last) / months; // s/km ganados por mes

  const iqPerMonth = Math.round(iq.deltaMonth * 10) / 10;
  let label: VelocityLabel = "Normal";
  if (rate >= 5) label = "Muy rápida";
  else if (rate >= 2.5) label = "Rápida";
  else if (rate >= 0.8) label = "Normal";
  else if (rate >= -0.8) label = "Estancada";
  else label = "En descenso";

  return { label, secPerKmPerMonth: Math.round(rate * 10) / 10, iqPerMonth, series };
}

/* ----------------------------- Efficiency --------------------------------- */

export interface Efficiency {
  score: number;
  deltaPct: number;
  then: { pace: string; hr: number };
  now: { pace: string; hr: number };
  series: { label: string; eficiencia: number }[];
}

export function efficiencyScore(acts: PieActivity[]): Efficiency {
  const easyNow = within(acts, 30).filter((a) => a.kind === "rodaje");
  const easyThen = within(acts, 120, 90).filter((a) => a.kind === "rodaje");

  const effOf = (xs: PieActivity[]) =>
    avg(xs.map((a) => (a.distanceKm * 1000) / (a.avgHr * (a.movingTimeS / 60))));

  const nowEff = effOf(easyNow);
  const thenEff = effOf(easyThen);
  const deltaPct = thenEff > 0 ? Math.round(((nowEff - thenEff) / thenEff) * 1000) / 10 : 0;

  const refPace = avg(easyNow.map((a) => a.paceS));
  const hrAtRefThen = Math.round(
    avg(easyThen.map((a) => a.avgHr)) + ((avg(easyThen.map((a) => a.paceS)) - refPace) * -0.12),
  );

  const series = Array.from({ length: 8 }, (_, i) => {
    const from = (8 - i) * 21;
    const chunk = within(acts, from, from - 21).filter((a) => a.kind === "rodaje");
    const date = new Date(PIE_TODAY.getTime() - (from - 10) * DAY);
    return {
      label: date.toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
      eficiencia: Math.round(effOf(chunk) * 1000) / 1000,
    };
  }).filter((p) => p.eficiencia > 0);

  return {
    score: Math.round(clamp(((nowEff - 0.95) / 0.75) * 100)),
    deltaPct,
    then: { pace: fmtPace(refPace), hr: hrAtRefThen },
    now: { pace: fmtPace(refPace), hr: Math.round(avg(easyNow.map((a) => a.avgHr))) },
    series,
  };
}

/* ------------------------------ Fatigue risk ------------------------------- */

export type RiskLevel = "Bajo" | "Moderado" | "Alto" | "Muy alto";

export interface FatigueRisk {
  level: RiskLevel;
  acwr: number;
  monotony: number;
  reasons: string[];
  recommendations: string[];
  series: { label: string; aguda: number; cronica: number }[];
}

export function fatigueRisk(acts: PieActivity[]): FatigueRisk {
  const acute = sum(within(acts, 7).map(sessionLoad));
  const chronic = sum(within(acts, 28).map(sessionLoad)) / 4;
  const acwr = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 1;

  const daily = Array.from({ length: 7 }, (_, i) => sum(within(acts, 7 - i, 6 - i).map(sessionLoad)));
  const mean = avg(daily);
  const sd = Math.sqrt(avg(daily.map((d) => (d - mean) ** 2))) || 1;
  const monotony = Math.round((mean / sd) * 100) / 100;

  const hardShare =
    within(acts, 14).filter((a) => a.kind === "series" || a.kind === "umbral" || a.kind === "competicion").length /
    Math.max(1, within(acts, 14).length);

  let points = 0;
  const reasons: string[] = [];
  if (acwr > 1.5) {
    points += 3;
    reasons.push(`Tu carga aguda está ${acwr.toFixed(2)}× por encima de la crónica: subida demasiado brusca.`);
  } else if (acwr > 1.3) {
    points += 2;
    reasons.push(`Ratio carga aguda/crónica de ${acwr.toFixed(2)}, ligeramente por encima del rango seguro.`);
  } else if (acwr < 0.8) {
    reasons.push(`Ratio de ${acwr.toFixed(2)}: vienes de una descarga, hay margen para progresar.`);
  } else {
    reasons.push(`Ratio de ${acwr.toFixed(2)}, dentro del rango óptimo (0,8–1,3).`);
  }

  if (monotony > 2) {
    points += 1;
    reasons.push("Monotonía alta: los días duros y suaves se parecen demasiado.");
  }
  if (hardShare > 0.45) {
    points += 2;
    reasons.push(`El ${Math.round(hardShare * 100)}% de tus sesiones de las últimas 2 semanas son de calidad.`);
  }

  const level: RiskLevel = points >= 5 ? "Muy alto" : points >= 3 ? "Alto" : points >= 1 ? "Moderado" : "Bajo";

  const recommendations =
    level === "Bajo"
      ? ["Puedes subir el volumen un 5-8% la semana que viene.", "Mantén 2 sesiones de calidad por semana."]
      : level === "Moderado"
        ? ["Sustituye una sesión de calidad por rodaje suave.", "Añade 30-45 min extra de sueño esta semana."]
        : ["Programa una semana de descarga (-25% de volumen).", "Elimina las series de esta semana y mantén solo rodaje en Z2.", "Vigila FC en reposo: si sube 5 ppm, descansa un día completo."];

  const series = Array.from({ length: 12 }, (_, i) => {
    const from = (12 - i) * 7;
    const a = sum(within(acts, from, from - 7).map(sessionLoad));
    const c = sum(within(acts, from + 21, from - 7).map(sessionLoad)) / 4;
    return { label: `S-${12 - i}`, aguda: Math.round(a), cronica: Math.round(c) };
  });

  return { level, acwr, monotony, reasons, recommendations, series };
}

/* ------------------------------- Recovery ---------------------------------- */

export type RecoveryLabel = "Recuperado" | "Parcialmente recuperado" | "Necesitas descansar";

export interface Recovery {
  score: number;
  label: RecoveryLabel;
  hoursSinceHard: number;
  detail: string;
}

export function recoveryScore(acts: PieActivity[], risk: FatigueRisk): Recovery {
  const sorted = [...acts].sort((a, b) => b.date.localeCompare(a.date));
  const lastHard = sorted.find((a) => a.kind !== "rodaje");
  const hours = lastHard
    ? Math.round((PIE_TODAY.getTime() - new Date(lastHard.date).getTime()) / 3600000)
    : 96;

  const load7 = sum(within(acts, 7).map(sessionLoad));
  const load28 = sum(within(acts, 28).map(sessionLoad)) / 4;

  let score = 100;
  score -= Math.max(0, 48 - hours) * 0.7;
  score -= Math.max(0, (load7 / Math.max(1, load28) - 1) * 60);
  score -= risk.level === "Muy alto" ? 25 : risk.level === "Alto" ? 15 : risk.level === "Moderado" ? 7 : 0;
  score = Math.round(clamp(score));

  const label: RecoveryLabel =
    score >= 78 ? "Recuperado" : score >= 55 ? "Parcialmente recuperado" : "Necesitas descansar";

  const detail =
    label === "Recuperado"
      ? `Han pasado ${hours} h desde tu última sesión exigente y tu carga semanal está bajo control.`
      : label === "Parcialmente recuperado"
        ? `Llevas ${hours} h desde la última sesión dura y tu carga de 7 días está por encima de la media.`
        : `Solo ${hours} h desde la última sesión intensa con una carga acumulada elevada.`;

  return { score, label, hoursSinceHard: hours, detail };
}

/* ---------------------------- Race readiness ------------------------------- */

export interface RaceReadiness {
  pct: number;
  race: string;
  date: string;
  daysLeft: number;
  drivers: { label: string; value: number }[];
}

export function raceReadiness(iq: RunnerIQ, cons: Consistency, eff: Efficiency, risk: FatigueRisk): RaceReadiness {
  const raceDate = new Date("2026-12-07T08:00:00Z");
  const daysLeft = Math.round((raceDate.getTime() - PIE_TODAY.getTime()) / DAY);

  const riskPenalty = { Bajo: 0, Moderado: 6, Alto: 14, "Muy alto": 24 }[risk.level];
  const drivers = [
    { label: "Base aeróbica", value: Math.round(clamp(iq.components.find((c) => c.key === "volume")!.value)) },
    { label: "Consistencia", value: cons.pct },
    { label: "Eficiencia", value: eff.score },
    { label: "Frescura", value: Math.round(clamp(100 - riskPenalty * 3)) },
    { label: "Tiempo disponible", value: Math.round(clamp((daysLeft / 140) * 100)) },
  ];

  const pct = Math.round(clamp(avg(drivers.map((d) => d.value)) - riskPenalty / 3));
  return { pct, race: "Maratón de Valencia", date: "7 dic 2026", daysLeft, drivers };
}

/* --------------------------- Performance trend ----------------------------- */

export type TrendDirection = "Mejorando" | "Estable" | "Empeorando";

export interface PerformanceTrend {
  direction: TrendDirection;
  slope: number;
  series: { label: string; rendimiento: number }[];
  causes: string[];
}

export function performanceTrend(acts: PieActivity[]): PerformanceTrend {
  const series = Array.from({ length: 12 }, (_, i) => {
    const from = (12 - i) * 14;
    const chunk = within(acts, from, from - 14);
    const p = avg(chunk.map((a) => a.paceS));
    const hr = avg(chunk.map((a) => a.avgHr));
    const perf = p > 0 && hr > 0 ? Math.round(((3600 / p) * (150 / hr)) * 10) / 10 : 0;
    const date = new Date(PIE_TODAY.getTime() - (from - 7) * DAY);
    return {
      label: date.toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
      rendimiento: perf,
    };
  }).filter((p) => p.rendimiento > 0);

  const half = Math.floor(series.length / 2);
  const older = avg(series.slice(0, half).map((s) => s.rendimiento));
  const recent = avg(series.slice(half).map((s) => s.rendimiento));
  const slope = Math.round(((recent - older) / Math.max(older, 1)) * 1000) / 10;

  const direction: TrendDirection = slope > 1.2 ? "Mejorando" : slope < -1.2 ? "Empeorando" : "Estable";
  const causes =
    direction === "Mejorando"
      ? ["Más volumen sostenido en zona aeróbica.", "Menor coste cardíaco al mismo ritmo.", "Cadencia más alta y estable."]
      : direction === "Estable"
        ? ["Volumen constante sin progresión de estímulo.", "Poca variedad de intensidades en las últimas semanas."]
        : ["Descenso de volumen respecto al bloque anterior.", "FC media más alta a igual ritmo: fatiga acumulada o calor."];

  return { direction, slope, series, causes };
}

/* --------------------------- Training balance ------------------------------ */

export interface TrainingBalance {
  buckets: { kind: SessionKind; label: string; pct: number; ideal: number }[];
  balanced: boolean;
  note: string;
}

const KIND_LABEL: Record<SessionKind, string> = {
  rodaje: "Rodajes suaves",
  series: "Series",
  umbral: "Umbral",
  larga: "Tiradas largas",
  competicion: "Competición",
};

const IDEAL: Record<SessionKind, number> = {
  rodaje: 55,
  series: 12,
  umbral: 12,
  larga: 18,
  competicion: 3,
};

export function trainingBalance(acts: PieActivity[]): TrainingBalance {
  const last = within(acts, 56);
  const total = Math.max(1, sum(last.map((a) => a.movingTimeS)));
  const buckets = (Object.keys(KIND_LABEL) as SessionKind[]).map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    pct: Math.round((sum(last.filter((a) => a.kind === kind).map((a) => a.movingTimeS)) / total) * 100),
    ideal: IDEAL[kind],
  }));

  const deviation = avg(buckets.map((b) => Math.abs(b.pct - b.ideal)));
  const balanced = deviation < 8;
  const worst = [...buckets].sort((a, b) => Math.abs(b.pct - b.ideal) - Math.abs(a.pct - a.ideal))[0]!;
  const note = balanced
    ? "Tu reparto de intensidades encaja con un modelo polarizado 80/20."
    : worst.pct > worst.ideal
      ? `Estás dedicando demasiado tiempo a ${worst.label.toLowerCase()} (${worst.pct}% frente a un ${worst.ideal}% recomendado).`
      : `Te falta trabajo de ${worst.label.toLowerCase()}: ${worst.pct}% frente a un ${worst.ideal}% recomendado.`;

  return { buckets, balanced, note };
}

/* ------------------------------ Runner DNA --------------------------------- */

export interface RunnerDNA {
  archetype: string;
  tagline: string;
  radar: { rasgo: string; valor: number }[];
  strengths: string[];
  weaknesses: string[];
  idealDistance: string;
  idealTerrain: string;
  toImprove: string[];
}

export function runnerDNA(acts: PieActivity[]): RunnerDNA {
  const last = within(acts, 180);
  const longShare = sum(last.filter((a) => a.distanceKm >= 20).map((a) => a.distanceKm)) / Math.max(1, sum(last.map((a) => a.distanceKm)));
  const climb = sum(last.map((a) => a.elevationM)) / Math.max(1, sum(last.map((a) => a.distanceKm)));
  const speed = clamp(100 - ((avg(last.filter((a) => a.kind === "series").map((a) => a.paceS)) - 190) / 120) * 100);
  const endurance = clamp(longShare * 260);
  const climbing = clamp((climb / 22) * 100);
  const efficiency = clamp(((avg(last.map((a) => (a.distanceKm * 1000) / (a.avgHr * (a.movingTimeS / 60)))) - 0.95) / 0.75) * 100);
  const consistency = clamp((last.length / 26 / 5) * 100);

  const radar = [
    { rasgo: "Resistencia", valor: Math.round(endurance) },
    { rasgo: "Velocidad", valor: Math.round(speed) },
    { rasgo: "Escalada", valor: Math.round(climbing) },
    { rasgo: "Economía", valor: Math.round(efficiency) },
    { rasgo: "Constancia", valor: Math.round(consistency) },
  ];

  const top = [...radar].sort((a, b) => b.valor - a.valor);
  const archetype =
    top[0]!.rasgo === "Resistencia"
      ? "Fondista"
      : top[0]!.rasgo === "Velocidad"
        ? "Velocista"
        : top[0]!.rasgo === "Escalada"
          ? "Escalador"
          : top[0]!.rasgo === "Economía"
            ? "Corredor eficiente"
            : "Corredor equilibrado";

  return {
    archetype,
    tagline: `Perfil dominante: ${top[0]!.rasgo.toLowerCase()} (${top[0]!.valor}/100), con ${top[1]!.rasgo.toLowerCase()} como segundo pilar.`,
    radar,
    strengths: top.slice(0, 2).map((t) => `${t.rasgo}: ${t.valor}/100`),
    weaknesses: top.slice(-2).map((t) => `${t.rasgo}: ${t.valor}/100`),
    idealDistance: endurance > 70 ? "Media maratón y maratón" : speed > 70 ? "5 K y 10 K" : "10 K y media maratón",
    idealTerrain: climbing > 65 ? "Trail y perfiles rompepiernas" : "Asfalto llano y rápido",
    toImprove: top
      .slice(-2)
      .map((t) =>
        t.rasgo === "Velocidad"
          ? "Añade 1 sesión semanal de series cortas (200-400 m) a ritmo de 3 K."
          : t.rasgo === "Escalada"
            ? "Incluye 8-10 × 45 s de cuesta al 6-8% una vez por semana."
            : t.rasgo === "Economía"
              ? "Trabaja técnica y fuerza: 2 × 20 min de gimnasio y 6 × 20 s de zancada."
              : t.rasgo === "Constancia"
                ? "Fija 5 días fijos de entrenamiento y protege dos de ellos como innegociables."
                : "Sube un 8% la tirada larga cada dos semanas hasta llegar a 30 km.",
      ),
  };
}

/* --------------------- Personal bests & race predictions ------------------- */

const DISTANCES = [
  { key: "5K", km: 5 },
  { key: "10K", km: 10 },
  { key: "21K", km: 21.0975 },
  { key: "42K", km: 42.195 },
];

export interface PBEvolution {
  key: string;
  years: { year: number; time: string; seconds: number }[];
  improvementPct: number;
}

export function personalBestEvolution(acts: PieActivity[]): PBEvolution[] {
  const years = [PIE_TODAY.getFullYear() - 2, PIE_TODAY.getFullYear() - 1, PIE_TODAY.getFullYear()];
  return DISTANCES.map((d) => {
    const rows = years
      .map((year) => {
        const pool = acts.filter(
          (a) => new Date(a.date).getFullYear() === year && a.distanceKm >= d.km * 0.95,
        );
        if (pool.length === 0) return null;
        const bestPace = Math.min(...pool.map((a) => a.paceS));
        const seconds = Math.round(bestPace * d.km * (1 + Math.log(d.km / Math.min(d.km, 10)) * 0.01));
        return { year, time: fmtTime(seconds), seconds };
      })
      .filter(Boolean) as { year: number; time: string; seconds: number }[];

    const first = rows[0]?.seconds ?? 0;
    const last = rows[rows.length - 1]?.seconds ?? 0;
    return {
      key: d.key,
      years: rows,
      improvementPct: first > 0 ? Math.round(((first - last) / first) * 1000) / 10 : 0,
    };
  });
}

export interface RacePrediction {
  key: string;
  label: string;
  time: string;
  seconds: number;
  confidence: number;
  deltaVsYearAgo: string;
  toImprove: string;
}

export function racePredictions(acts: PieActivity[], pbs: PBEvolution[]): RacePrediction[] {
  // Referencia: mejor esfuerzo reciente normalizado con la fórmula de Riegel.
  const recent = within(acts, 120).filter((a) => a.kind !== "rodaje" && a.distanceKm >= 5);
  const ref = recent.reduce(
    (best, a) => {
      const t = a.paceS * a.distanceKm;
      const equiv = t * Math.pow(10 / a.distanceKm, 1.06);
      return equiv < best.equiv ? { equiv, km: a.distanceKm, t } : best;
    },
    { equiv: Infinity, km: 10, t: 0 },
  );

  const base10k = Number.isFinite(ref.equiv) ? ref.equiv : 2400;

  return DISTANCES.map((d, i) => {
    const seconds = Math.round(base10k * Math.pow(d.km / 10, 1.06));
    const pb = pbs.find((p) => p.key === d.key);
    const prev = pb?.years.find((y) => y.year === PIE_TODAY.getFullYear() - 1)?.seconds;
    const delta = prev ? prev - seconds : 0;
    return {
      key: d.key,
      label: ["5 K", "10 K", "Media maratón", "Maratón"][i]!,
      time: fmtTime(seconds),
      seconds,
      confidence: [93, 91, 85, 76][i]!,
      deltaVsYearAgo: delta > 0 ? `−${fmtTime(delta)} vs 2025` : "sin referencia previa",
      toImprove: [
        "Series cortas de 400 m a ritmo de 3 K para subir la velocidad máxima aeróbica.",
        "Dos sesiones de umbral por semana (3 × 10 min) para mover el punto de fatiga.",
        "Tirada larga progresiva con los últimos 8 km a ritmo objetivo.",
        "Sube la tirada larga a 32 km y practica la estrategia de avituallamiento.",
      ][i]!,
    };
  });
}

/* ---------------------------- Heat performance ----------------------------- */

export interface HeatPerformance {
  tempBuckets: { rango: string; ritmo: number; fc: number; n: number }[];
  hourBuckets: { franja: string; ritmo: number; n: number }[];
  humidityImpact: number;
  windImpact: number;
  bestRange: string;
  bestHour: string;
}

export function heatPerformance(acts: PieActivity[]): HeatPerformance {
  const easy = within(acts, 365).filter((a) => a.kind === "rodaje");
  const ranges = [
    { rango: "<5 °C", lo: -20, hi: 5 },
    { rango: "5-10 °C", lo: 5, hi: 10 },
    { rango: "10-15 °C", lo: 10, hi: 15 },
    { rango: "15-20 °C", lo: 15, hi: 20 },
    { rango: "20-25 °C", lo: 20, hi: 25 },
    { rango: ">25 °C", lo: 25, hi: 60 },
  ];

  const tempBuckets = ranges
    .map((r) => {
      const pool = easy.filter((a) => a.tempC >= r.lo && a.tempC < r.hi);
      return {
        rango: r.rango,
        ritmo: Math.round(avg(pool.map((a) => a.paceS))),
        fc: Math.round(avg(pool.map((a) => a.avgHr))),
        n: pool.length,
      };
    })
    .filter((b) => b.n >= 3);

  const hours = [
    { franja: "Mañana temprano (6-9 h)", lo: 6, hi: 9 },
    { franja: "Media mañana (9-12 h)", lo: 9, hi: 12 },
    { franja: "Tarde (16-19 h)", lo: 16, hi: 19 },
    { franja: "Noche (19-23 h)", lo: 19, hi: 23 },
  ];
  const hourBuckets = hours
    .map((h) => {
      const pool = easy.filter((a) => a.hour >= h.lo && a.hour < h.hi);
      return { franja: h.franja, ritmo: Math.round(avg(pool.map((a) => a.paceS))), n: pool.length };
    })
    .filter((b) => b.n >= 3);

  const humid = easy.filter((a) => a.humidity > 75);
  const dry = easy.filter((a) => a.humidity <= 60);
  const humidityImpact = Math.round(avg(humid.map((a) => a.paceS)) - avg(dry.map((a) => a.paceS)));

  const windy = easy.filter((a) => a.windKmh > 18);
  const calm = easy.filter((a) => a.windKmh <= 10);
  const windImpact = Math.round(avg(windy.map((a) => a.paceS)) - avg(calm.map((a) => a.paceS)));

  const best = [...tempBuckets].sort((a, b) => a.ritmo - b.ritmo)[0];
  const bestH = [...hourBuckets].sort((a, b) => a.ritmo - b.ritmo)[0];

  return {
    tempBuckets,
    hourBuckets,
    humidityImpact,
    windImpact,
    bestRange: best?.rango ?? "10-15 °C",
    bestHour: bestH?.franja ?? "Mañana temprano (6-9 h)",
  };
}

/* ----------------------------- Shoe analytics ------------------------------ */

export interface ShoeStat {
  name: string;
  km: number;
  pace: string;
  hr: number;
  elevation: number;
  sessions: number;
  records: number;
  lifePct: number;
  status: "Nueva" | "En rodaje" | "Revisar pronto" | "Jubilar";
  lastUsed: string;
}

export function shoeAnalytics(acts: PieActivity[]): ShoeStat[] {
  const LIFE = 750;
  const map = new Map<string, PieActivity[]>();
  for (const a of acts) {
    const arr = map.get(a.shoe) ?? [];
    arr.push(a);
    map.set(a.shoe, arr);
  }

  return [...map.entries()]
    .map(([name, xs]) => {
      const km = Math.round(sum(xs.map((a) => a.distanceKm)));
      const lifePct = Math.round(clamp((km / LIFE) * 100));
      const best = Math.min(...xs.map((a) => a.paceS));
      const records = xs.filter((a) => a.paceS <= best + 3).length;
      const last = xs.map((a) => a.date).sort().at(-1)!;
      return {
        name,
        km,
        pace: `${fmtPace(avg(xs.map((a) => a.paceS)))} /km`,
        hr: Math.round(avg(xs.map((a) => a.avgHr))),
        elevation: Math.round(sum(xs.map((a) => a.elevationM))),
        sessions: xs.length,
        records,
        lifePct,
        status: (lifePct >= 100 ? "Jubilar" : lifePct >= 80 ? "Revisar pronto" : lifePct >= 25 ? "En rodaje" : "Nueva") as ShoeStat["status"],
        lastUsed: new Date(last).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }),
      };
    })
    .sort((a, b) => b.km - a.km);
}

/* ----------------------------- Goal probability ---------------------------- */

export interface GoalProbability {
  id: string;
  label: string;
  probability: number;
  gapText: string;
  levers: string[];
}

export function goalProbability(preds: RacePrediction[], iq: RunnerIQ, risk: FatigueRisk): GoalProbability[] {
  const targets = [
    { id: "sub40", label: "Sub 40 en 10 K", key: "10K", target: 40 * 60 },
    { id: "sub120", label: "Sub 1:20 en media maratón", key: "21K", target: 80 * 60 },
    { id: "sub3", label: "Maratón sub 3:00", key: "42K", target: 180 * 60 },
  ];

  const riskPenalty = { Bajo: 0, Moderado: 4, Alto: 10, "Muy alto": 18 }[risk.level];

  return targets.map((t) => {
    const pred = preds.find((p) => p.key === t.key)!;
    const gap = pred.seconds - t.target; // >0 = falta mejorar
    const probability = Math.round(clamp(50 - (gap / t.target) * 700 + (iq.score - 70) * 0.5 - riskPenalty, 3, 97));
    return {
      id: t.id,
      label: t.label,
      probability,
      gapText:
        gap > 0
          ? `Te faltan ${fmtTime(gap)} respecto a tu predicción actual (${pred.time}).`
          : `Tu predicción actual (${pred.time}) ya está ${fmtTime(-gap)} por debajo del objetivo.`,
      levers:
        gap > 0
          ? [
              `Baja ${Math.max(2, Math.round((gap / (t.target / 60)) * 2))} s/km en ritmo de umbral.`,
              "Suma 2 semanas de volumen antes de la fase específica.",
              "Mantén el riesgo de fatiga en Bajo durante las 4 semanas previas.",
            ]
          : ["Mantén la consistencia actual.", "Afina con 2 sesiones específicas a ritmo objetivo por semana."],
    };
  });
}

/* ------------------------ Insights & recommendations ----------------------- */

export interface Recommendation {
  action: string;
  reason: string;
  tone: "positivo" | "neutro" | "cuidado";
}

export function smartRecommendations(
  risk: FatigueRisk,
  rec: Recovery,
  balance: TrainingBalance,
  cons: Consistency,
  vel: ImprovementVelocity,
): Recommendation[] {
  const out: Recommendation[] = [];

  if (rec.label === "Necesitas descansar" || risk.level === "Muy alto") {
    out.push({ action: "Descanso completo hoy", reason: rec.detail, tone: "cuidado" });
  } else if (rec.label === "Parcialmente recuperado") {
    out.push({ action: "Rodaje suave de 40-50 min en Z2", reason: rec.detail, tone: "neutro" });
  } else {
    out.push({
      action: "Sesión de calidad: 5 × 1000 m a ritmo de 10 K",
      reason: `Recuperación al ${rec.score}% y riesgo de fatiga ${risk.level.toLowerCase()}: es tu mejor ventana.`,
      tone: "positivo",
    });
  }

  if (risk.acwr < 0.9) {
    out.push({
      action: "Puedes aumentar el volumen un 6-8%",
      reason: `Tu ratio carga aguda/crónica es ${risk.acwr.toFixed(2)}, hay margen antes de entrar en zona de riesgo.`,
      tone: "positivo",
    });
  } else if (risk.acwr > 1.3) {
    out.push({
      action: "Reduce intensidad esta semana",
      reason: `Ratio de ${risk.acwr.toFixed(2)}: la subida ha sido demasiado rápida.`,
      tone: "cuidado",
    });
  }

  if (!balance.balanced) {
    out.push({ action: "Reequilibra el reparto de sesiones", reason: balance.note, tone: "neutro" });
  }

  if (cons.pct < 85) {
    out.push({
      action: "Protege 2 sesiones fijas en tu semana",
      reason: `Tu cumplimiento es del ${cons.pct}%: la consistencia es el factor con más peso en tu Runner IQ.`,
      tone: "neutro",
    });
  }

  if (vel.label === "Estancada" || vel.label === "En descenso") {
    out.push({
      action: "Introduce trabajo de fuerza 2 × semana",
      reason: `Tu velocidad de mejora es "${vel.label.toLowerCase()}": necesitas un estímulo distinto al volumen.`,
      tone: "neutro",
    });
  }

  return out.slice(0, 5);
}

export interface WorkoutReport {
  activity: PieActivity;
  good: string[];
  improve: string[];
  goalImpact: string;
  iqImpact: string;
  tomorrow: string;
}

export function lastWorkoutReport(acts: PieActivity[], iq: RunnerIQ, rec: Recovery): WorkoutReport {
  const sorted = [...acts].sort((a, b) => b.date.localeCompare(a.date));
  const a = sorted[0]!;
  const sameKind = within(acts, 90).filter((x) => x.kind === a.kind && x.id !== a.id);
  const refPace = avg(sameKind.map((x) => x.paceS));
  const refHr = avg(sameKind.map((x) => x.avgHr));

  const good: string[] = [];
  const improve: string[] = [];

  if (a.paceS < refPace) good.push(`Ritmo ${Math.round(refPace - a.paceS)} s/km más rápido que tu media en sesiones de este tipo.`);
  else improve.push(`Ritmo ${Math.round(a.paceS - refPace)} s/km más lento que tu media en sesiones de este tipo.`);

  if (a.avgHr < refHr) good.push(`FC media ${Math.round(refHr - a.avgHr)} ppm por debajo de tu referencia: buen signo de eficiencia.`);
  else improve.push(`FC media ${Math.round(a.avgHr - refHr)} ppm por encima: revisa descanso, calor o hidratación.`);

  if (a.cadence >= 178) good.push(`Cadencia de ${a.cadence} spm, dentro del rango eficiente.`);
  else improve.push(`Cadencia de ${a.cadence} spm: apunta a 178-182 con zancadas cortas.`);

  return {
    activity: a,
    good,
    improve,
    goalImpact: `Esta sesión suma ${a.distanceKm.toFixed(1)} km a tu bloque de maratón y consolida la base aeróbica de cara al 7 de diciembre.`,
    iqImpact: `Impacto estimado en tu Runner IQ: ${iq.deltaWeek >= 0 ? "+" : ""}${iq.deltaWeek} puntos esta semana.`,
    tomorrow:
      rec.label === "Recuperado"
        ? "Mañana puedes afrontar una sesión de umbral (3 × 10 min a ritmo de media)."
        : "Mañana toca rodaje suave de 45 min en Z2 y movilidad.",
  };
}

export function dailyInsight(seedDate: Date, snapshot: PieSnapshot): string {
  const pool = [
    `Hoy estás en tu mejor ventana para una sesión intensa: recuperación al ${snapshot.recovery.score}% y riesgo de fatiga ${snapshot.risk.level.toLowerCase()}.`,
    `Tu eficiencia ha cambiado un ${snapshot.efficiency.deltaPct > 0 ? "+" : ""}${snapshot.efficiency.deltaPct}% en 3 meses: corres a ${snapshot.efficiency.now.pace} /km con ${snapshot.efficiency.then.hr - snapshot.efficiency.now.hr} ppm menos.`,
    `Llevas ${snapshot.consistency.streakWeeks} semanas seguidas cumpliendo tu plan. Esa racha vale más que cualquier sesión suelta.`,
    `Tu Runner IQ ha subido ${snapshot.iq.deltaMonth} puntos en 30 días, sobre todo por consistencia y coste cardíaco.`,
    `Estás a ${snapshot.predictions[1]!.time} de predicción en 10 K: ${snapshot.goals[0]!.probability}% de probabilidad de bajar de 40 minutos.`,
    `Rindes mejor entre ${snapshot.heat.bestRange}. Hoy planifica la sesión en la franja de ${snapshot.heat.bestHour.toLowerCase()}.`,
    `Faltan ${snapshot.readiness.daysLeft} días para Valencia y tu preparación va al ${snapshot.readiness.pct}%.`,
  ];
  const idx =
    (seedDate.getUTCFullYear() * 372 + seedDate.getUTCMonth() * 31 + seedDate.getUTCDate()) % pool.length;
  return pool[idx]!;
}

/* --------------------------------- Snapshot -------------------------------- */

export interface PieSnapshot {
  iq: RunnerIQ;
  consistency: Consistency;
  velocity: ImprovementVelocity;
  efficiency: Efficiency;
  risk: FatigueRisk;
  recovery: Recovery;
  readiness: RaceReadiness;
  trend: PerformanceTrend;
  balance: TrainingBalance;
  dna: RunnerDNA;
  pbs: PBEvolution[];
  predictions: RacePrediction[];
  heat: HeatPerformance;
  shoes: ShoeStat[];
  goals: GoalProbability[];
  recommendations: Recommendation[];
  report: WorkoutReport;
  dailyInsight: string;
  updatedAt: string;
}

export function buildSnapshot(acts: PieActivity[] = pieActivities): PieSnapshot {
  const iq = runnerIQ(acts);
  const consistency = consistencyIndex(acts);
  const velocity = improvementVelocity(acts, iq);
  const efficiency = efficiencyScore(acts);
  const risk = fatigueRisk(acts);
  const recovery = recoveryScore(acts, risk);
  const readiness = raceReadiness(iq, consistency, efficiency, risk);
  const trend = performanceTrend(acts);
  const balance = trainingBalance(acts);
  const dna = runnerDNA(acts);
  const pbs = personalBestEvolution(acts);
  const predictions = racePredictions(acts, pbs);
  const heat = heatPerformance(acts);
  const shoes = shoeAnalytics(acts);
  const goals = goalProbability(predictions, iq, risk);
  const recommendations = smartRecommendations(risk, recovery, balance, consistency, velocity);
  const report = lastWorkoutReport(acts, iq, recovery);

  const partial = {
    iq,
    consistency,
    velocity,
    efficiency,
    risk,
    recovery,
    readiness,
    trend,
    balance,
    dna,
    pbs,
    predictions,
    heat,
    shoes,
    goals,
    recommendations,
    report,
    dailyInsight: "",
    updatedAt: PIE_TODAY.toISOString(),
  } as PieSnapshot;

  partial.dailyInsight = dailyInsight(new Date(), partial);
  return partial;
}
