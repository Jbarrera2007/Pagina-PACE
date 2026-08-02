/**
 * Realistic mock data for the PACE dashboard.
 * Swap these exports for Supabase queries when the backend is wired.
 */

export interface Metric {
  id: string;
  label: string;
  value: string;
  unit?: string;
  delta: number;
  hint: string;
}

export const weeklyMetrics: Metric[] = [
  { id: "km", label: "Kilómetros", value: "62,4", unit: "km", delta: 8.2, hint: "Semana 32" },
  { id: "load", label: "Carga", value: "742", unit: "TSS", delta: 4.1, hint: "Óptima" },
  { id: "vo2", label: "VO2 máx", value: "58,3", unit: "ml/kg", delta: 1.4, hint: "Top 8% edad" },
  { id: "cadence", label: "Cadencia", value: "182", unit: "spm", delta: 2.0, hint: "Media 7d" },
  { id: "hr", label: "FC media", value: "146", unit: "bpm", delta: -2.3, hint: "Deriva -1,8%" },
  { id: "pace", label: "Ritmo medio", value: "4:38", unit: "/km", delta: 3.1, hint: "Mejora 9s" },
  { id: "recovery", label: "Recuperación", value: "84", unit: "%", delta: 6.5, hint: "HRV 71 ms" },
  { id: "fatigue", label: "Fatiga", value: "31", unit: "%", delta: -5.4, hint: "Baja" },
];

export const loadSeries = [
  { week: "S26", carga: 480, forma: 42, fatiga: 38 },
  { week: "S27", carga: 545, forma: 48, fatiga: 44 },
  { week: "S28", carga: 610, forma: 52, fatiga: 51 },
  { week: "S29", carga: 588, forma: 58, fatiga: 46 },
  { week: "S30", carga: 665, forma: 61, fatiga: 49 },
  { week: "S31", carga: 704, forma: 66, fatiga: 42 },
  { week: "S32", carga: 742, forma: 73, fatiga: 31 },
];

export const paceSeries = [
  { day: "Lun", ritmo: 5.1, fc: 138 },
  { day: "Mar", ritmo: 4.4, fc: 158 },
  { day: "Mié", ritmo: 5.3, fc: 132 },
  { day: "Jue", ritmo: 4.1, fc: 168 },
  { day: "Vie", ritmo: 5.0, fc: 136 },
  { day: "Sáb", ritmo: 4.6, fc: 149 },
  { day: "Dom", ritmo: 4.9, fc: 142 },
];

export const volumeSeries = [
  { day: "Lun", km: 8.2 },
  { day: "Mar", km: 12.5 },
  { day: "Mié", km: 6.0 },
  { day: "Jue", km: 14.8 },
  { day: "Vie", km: 0 },
  { day: "Sáb", km: 10.4 },
  { day: "Dom", km: 10.5 },
];

export const zoneSplit = [
  { zone: "Z1", pct: 22 },
  { zone: "Z2", pct: 46 },
  { zone: "Z3", pct: 14 },
  { zone: "Z4", pct: 11 },
  { zone: "Z5", pct: 7 },
];

export interface Workout {
  id: string;
  title: string;
  date: string;
  distance: string;
  pace: string;
  hr: number;
  effort: "Suave" | "Moderado" | "Duro";
}

export const recentWorkouts: Workout[] = [
  { id: "w1", title: "Series 6 × 1000 m", date: "Hoy · 07:12", distance: "12,4 km", pace: "3:52 /km", hr: 172, effort: "Duro" },
  { id: "w2", title: "Rodaje regenerativo", date: "Ayer · 19:40", distance: "8,2 km", pace: "5:34 /km", hr: 131, effort: "Suave" },
  { id: "w3", title: "Tempo 3 × 10 min", date: "Vie · 07:05", distance: "14,8 km", pace: "4:12 /km", hr: 164, effort: "Duro" },
  { id: "w4", title: "Fartlek colinas", date: "Jue · 18:20", distance: "10,4 km", pace: "4:48 /km", hr: 155, effort: "Moderado" },
  { id: "w5", title: "Tirada larga", date: "Dom · 08:30", distance: "24,0 km", pace: "5:02 /km", hr: 144, effort: "Moderado" },
];

export const predictions = [
  { distance: "5 K", time: "17:42", confidence: 94 },
  { distance: "10 K", time: "36:58", confidence: 91 },
  { distance: "21 K", time: "1:22:14", confidence: 86 },
  { distance: "42 K", time: "2:54:36", confidence: 78 },
];

export const goals = [
  { id: "g1", label: "Sub 1:20 en media maratón", progress: 72 },
  { id: "g2", label: "80 km semanales", progress: 78 },
  { id: "g3", label: "VO2 máx 60", progress: 64 },
];

export const nextRace = {
  name: "Maratón de Valencia",
  date: "7 dic 2026",
  daysLeft: 127,
  goal: "Sub 2:55",
  plan: "Bloque específico · Semana 6/18",
};

export const coachInsights = [
  {
    title: "Reduce un 12% el volumen esta semana",
    body: "Tu carga aguda supera en 1,38× la crónica. Bajar a ~55 km protege la adaptación del bloque de series.",
  },
  {
    title: "Tu cadencia sube en tempo, no en rodaje",
    body: "182 spm en umbral vs 168 spm en suave. Añade 4 × 20 s de zancada tras los rodajes fáciles.",
  },
  {
    title: "Ventana óptima para test de 10 K",
    body: "Forma 73 y fatiga 31: el jueves es tu mejor día para validar la predicción de 36:58.",
  },
];

export const trainingPlans = [
  { name: "10 K Sub 40", weeks: 10, sessions: 5, level: "Intermedio" },
  { name: "Media Maratón Sub 1:30", weeks: 12, sessions: 5, level: "Avanzado" },
  { name: "Maratón Sub 3:00", weeks: 18, sessions: 6, level: "Élite amateur" },
];
