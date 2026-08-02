/**
 * Historial de actividades del corredor.
 *
 * Mientras la sincronización con Strava no esté conectada, PIE trabaja sobre un
 * historial sintético pero realista (3 temporadas completas) generado de forma
 * determinista. Cuando la tabla `activities` tenga datos reales, basta con
 * mapearlos a `PieActivity` y el motor funciona igual.
 */

export type SessionKind = "rodaje" | "series" | "umbral" | "larga" | "competicion";

export interface PieActivity {
  id: string;
  /** ISO date */
  date: string;
  distanceKm: number;
  movingTimeS: number;
  /** s/km */
  paceS: number;
  avgHr: number;
  maxHr: number;
  cadence: number;
  elevationM: number;
  kind: SessionKind;
  shoe: string;
  tempC: number;
  humidity: number;
  windKmh: number;
  /** hora local de inicio, 0-23 */
  hour: number;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHOES = [
  { name: "Nimbus Cloud 26", from: 0, to: 60, kindBias: ["rodaje", "larga"] as SessionKind[] },
  { name: "Tempo Fly 4", from: 20, to: 110, kindBias: ["umbral", "series"] as SessionKind[] },
  { name: "Vaporize Elite 3", from: 60, to: 160, kindBias: ["competicion", "series"] as SessionKind[] },
  { name: "Trail Peak GTX", from: 30, to: 160, kindBias: ["larga"] as SessionKind[] },
  { name: "Daily Rider 12", from: 90, to: 160, kindBias: ["rodaje"] as SessionKind[] },
];

/** Fecha de referencia del dataset (coincide con la temporada mostrada en la app). */
export const PIE_TODAY = new Date("2026-08-02T09:00:00Z");

const WEEKS = 156; // 3 años

function seasonalTemp(date: Date, rnd: () => number) {
  const doy = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const base = 15 - 10 * Math.cos((2 * Math.PI * (doy - 15)) / 365);
  return Math.round((base + (rnd() - 0.5) * 8) * 10) / 10;
}

function buildActivities(): PieActivity[] {
  const rnd = mulberry32(20260802);
  const out: PieActivity[] = [];

  for (let w = WEEKS - 1; w >= 0; w--) {
    // progreso 0 (hace 3 años) -> 1 (hoy)
    const p = (WEEKS - 1 - w) / (WEEKS - 1);
    // mesociclos de 4 semanas con semana de descarga
    const microcycle = (WEEKS - 1 - w) % 4;
    const deload = microcycle === 3;

    const sessionsThisWeek = deload ? 4 : rnd() > 0.14 ? 5 : 6;
    // ritmo base de rodaje: 5:45 -> 4:55
    const basePace = 345 - 50 * p - (rnd() - 0.5) * 6;
    // eficiencia cardiaca: mejora con el tiempo
    const hrBase = 152 - 12 * p;

    for (let s = 0; s < sessionsThisWeek; s++) {
      const dayOffset = w * 7 + (6 - Math.floor((s * 6) / Math.max(1, sessionsThisWeek - 1)));
      const date = new Date(PIE_TODAY.getTime() - dayOffset * 86400000);

      let kind: SessionKind = "rodaje";
      if (s === 1 && !deload) kind = "series";
      else if (s === 3 && !deload) kind = "umbral";
      else if (s === sessionsThisWeek - 1) kind = "larga";
      // alguna competición puntual
      if (!deload && rnd() > 0.975) kind = "competicion";

      let distanceKm: number;
      let paceS: number;
      let hrFactor: number;
      let elevationM: number;

      switch (kind) {
        case "series":
          distanceKm = 10 + rnd() * 4;
          paceS = basePace - 62 - rnd() * 10;
          hrFactor = 1.16;
          elevationM = 40 + rnd() * 50;
          break;
        case "umbral":
          distanceKm = 12 + rnd() * 4;
          paceS = basePace - 38 - rnd() * 8;
          hrFactor = 1.1;
          elevationM = 60 + rnd() * 70;
          break;
        case "larga":
          distanceKm = 18 + rnd() * 10 + 4 * p;
          paceS = basePace + 12 + rnd() * 10;
          hrFactor = 0.97;
          elevationM = 180 + rnd() * 380;
          break;
        case "competicion":
          distanceKm = [5, 10, 21.097, 42.195][Math.floor(rnd() * 4)]!;
          paceS = basePace - 78 + (distanceKm > 20 ? 26 : 0);
          hrFactor = 1.2;
          elevationM = 30 + rnd() * 120;
          break;
        default:
          distanceKm = 8 + rnd() * 5;
          paceS = basePace + 18 + rnd() * 14;
          hrFactor = 0.9;
          elevationM = 40 + rnd() * 90;
      }

      if (deload) {
        distanceKm *= 0.75;
        paceS += 8;
      }

      const tempC = seasonalTemp(date, rnd);
      // el calor penaliza ritmo y sube pulsaciones
      const heatPenalty = Math.max(0, tempC - 17) * 1.6;
      paceS += heatPenalty;

      const humidity = Math.round(45 + rnd() * 45);
      const windKmh = Math.round(4 + rnd() * 22);
      const hour = [7, 7, 8, 9, 18, 19, 20][Math.floor(rnd() * 7)]!;

      const avgHr = Math.round(hrBase * hrFactor + Math.max(0, tempC - 17) * 0.9 + (rnd() - 0.5) * 6);
      const movingTimeS = Math.round(distanceKm * paceS);

      out.push({
        id: `a-${w}-${s}`,
        date: date.toISOString(),
        distanceKm: Math.round(distanceKm * 100) / 100,
        movingTimeS,
        paceS: Math.round(paceS),
        avgHr,
        maxHr: avgHr + 12 + Math.round(rnd() * 8),
        cadence: Math.round(168 + 12 * p + (kind === "series" || kind === "competicion" ? 8 : 0) + rnd() * 4),
        elevationM: Math.round(elevationM),
        kind,
        shoe: pickShoe(p, kind, rnd),
        tempC,
        humidity,
        windKmh,
        hour,
      });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function pickShoe(progress: number, kind: SessionKind, rnd: () => number) {
  const weekIndex = progress * 160;
  const candidates = SHOES.filter((s) => weekIndex >= s.from && weekIndex <= s.to);
  const biased = candidates.filter((s) => s.kindBias.includes(kind));
  const pool = biased.length > 0 && rnd() > 0.25 ? biased : candidates;
  return (pool[Math.floor(rnd() * pool.length)] ?? SHOES[0]!).name;
}

export const pieActivities: PieActivity[] = buildActivities();
