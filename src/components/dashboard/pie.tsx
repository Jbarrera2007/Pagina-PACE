import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BatteryCharging,
  Brain,
  CalendarCheck,
  CloudSun,
  Dna,
  Flag,
  Footprints,
  Gauge,
  HeartPulse,
  Rocket,
  Scale,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { buildSnapshot, fmtPace, type PieSnapshot } from "@/lib/pie/engine";
import { Locked, UpgradeBanner, usePlanTier } from "@/components/dashboard/plan";

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
};

type NarrativeKey =
  | "iq"
  | "consistency"
  | "velocity"
  | "efficiency"
  | "risk"
  | "recovery"
  | "readiness"
  | "trend"
  | "balance"
  | "dna"
  | "pbs"
  | "predictions"
  | "heat"
  | "shoes"
  | "goals"
  | "daily";

/** Explicaciones deterministas: se muestran al instante y sirven de respaldo si la IA falla. */
function fallbackNarrative(s: PieSnapshot): Record<NarrativeKey, string> {
  return {
    iq: `Tu nivel global es ${s.iq.score}/100 (${s.iq.level}). Ha variado ${s.iq.deltaWeek >= 0 ? "+" : ""}${s.iq.deltaWeek} puntos esta semana, empujado sobre todo por consistencia y coste cardíaco.`,
    consistency: `Cumples el ${s.consistency.pct}% de lo planificado con ${s.consistency.streakWeeks} semanas encadenadas. Para subir, protege una sesión corta entre semana en lugar de recuperar kilómetros el fin de semana.`,
    velocity: `Estás mejorando a ritmo "${s.velocity.label.toLowerCase()}": ${Math.abs(s.velocity.secPerKmPerMonth)} s/km por mes en rodajes. Es el efecto de acumular volumen sin subir la intensidad.`,
    efficiency: `Corres a ${s.efficiency.now.pace} /km con ${s.efficiency.then.hr - s.efficiency.now.hr} ppm menos que hace 3 meses: tu eficiencia ha cambiado un ${s.efficiency.deltaPct > 0 ? "+" : ""}${s.efficiency.deltaPct}%.`,
    risk: `Riesgo ${s.risk.level.toLowerCase()} con un ratio carga aguda/crónica de ${s.risk.acwr.toFixed(2)}. Es una tendencia de carga, no un diagnóstico: ajusta volumen antes de que se convierta en fatiga.`,
    recovery: `${s.recovery.label} (${s.recovery.score}/100). ${s.recovery.detail}`,
    readiness: `Llegas al ${s.readiness.pct}% de preparación para ${s.readiness.race}, a ${s.readiness.daysLeft} días. El factor que más suma ahora es tu base aeróbica.`,
    trend: `Tendencia: ${s.trend.direction.toLowerCase()} (${s.trend.slope > 0 ? "+" : ""}${s.trend.slope}% de rendimiento ajustado por FC). ${s.trend.causes[0]}`,
    balance: s.balance.note,
    dna: `${s.dna.tagline} Tu distancia ideal hoy es ${s.dna.idealDistance.toLowerCase()} sobre ${s.dna.idealTerrain.toLowerCase()}.`,
    pbs: `Tus marcas han mejorado de forma sostenida en las tres últimas temporadas; la mayor ganancia está en las distancias medias.`,
    predictions: `Con tu estado actual, tu predicción en 10 K es ${s.predictions[1]?.time}. Para bajarla necesitas mover el umbral, no correr más kilómetros.`,
    heat: `Rindes mejor entre ${s.heat.bestRange} y en la franja de ${s.heat.bestHour.toLowerCase()}. La humedad alta te cuesta ${Math.max(0, s.heat.humidityImpact)} s/km.`,
    shoes: `Tienes ${s.shoes.length} modelos en rotación. Revisa las que superan el 80% de vida útil antes de meterles sesiones de calidad.`,
    goals: `Tu objetivo más alcanzable ahora mismo es "${[...s.goals].sort((a, b) => b.probability - a.probability)[0]?.label}".`,
    daily: s.dailyInsight,
  };
}

function usePieNarrative(snapshot: PieSnapshot) {
  const fallback = useMemo(() => fallbackNarrative(snapshot), [snapshot]);
  const [ai, setAi] = useState<Partial<Record<NarrativeKey, string>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const compact = {
      iq: { score: snapshot.iq.score, level: snapshot.iq.level, deltaWeek: snapshot.iq.deltaWeek, deltaMonth: snapshot.iq.deltaMonth, deltaYear: snapshot.iq.deltaYear, components: snapshot.iq.components },
      consistency: { pct: snapshot.consistency.pct, done: snapshot.consistency.done, planned: snapshot.consistency.planned, streak: snapshot.consistency.streakWeeks },
      velocity: { label: snapshot.velocity.label, secPerKmPerMonth: snapshot.velocity.secPerKmPerMonth },
      efficiency: { deltaPct: snapshot.efficiency.deltaPct, then: snapshot.efficiency.then, now: snapshot.efficiency.now, score: snapshot.efficiency.score },
      risk: { level: snapshot.risk.level, acwr: snapshot.risk.acwr, monotony: snapshot.risk.monotony, reasons: snapshot.risk.reasons },
      recovery: { score: snapshot.recovery.score, label: snapshot.recovery.label, detail: snapshot.recovery.detail },
      readiness: { pct: snapshot.readiness.pct, race: snapshot.readiness.race, daysLeft: snapshot.readiness.daysLeft, drivers: snapshot.readiness.drivers },
      trend: { direction: snapshot.trend.direction, slope: snapshot.trend.slope, causes: snapshot.trend.causes },
      balance: { buckets: snapshot.balance.buckets, balanced: snapshot.balance.balanced },
      dna: { archetype: snapshot.dna.archetype, radar: snapshot.dna.radar, idealDistance: snapshot.dna.idealDistance, idealTerrain: snapshot.dna.idealTerrain },
      pbs: snapshot.pbs,
      predictions: snapshot.predictions.map((p) => ({ label: p.label, time: p.time, confidence: p.confidence })),
      heat: { bestRange: snapshot.heat.bestRange, bestHour: snapshot.heat.bestHour, humidityImpact: snapshot.heat.humidityImpact, windImpact: snapshot.heat.windImpact },
      shoes: snapshot.shoes.map((s) => ({ name: s.name, km: s.km, lifePct: s.lifePct, pace: s.pace })),
      goals: snapshot.goals.map((g) => ({ label: g.label, probability: g.probability })),
    };

    void fetch("/api/pie-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(compact),
    })
      .then(async (r) => (r.ok ? ((await r.json()) as Partial<Record<NarrativeKey, string>>) : {}))
      .catch(() => ({}))
      .then((data) => {
        if (!cancelled) {
          setAi(data ?? {});
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  const get = (key: NarrativeKey) => ai[key] ?? fallback[key];
  return { get, loading, aiReady: Object.keys(ai).length > 0 };
}

/* ------------------------------- Primitivas -------------------------------- */

function Card({
  icon: Icon,
  title,
  question,
  children,
  note,
  className,
  delay = 0,
  locked = false,
  teaser,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  question: string;
  children: React.ReactNode;
  note?: string;
  className?: string;
  delay?: number;
  locked?: boolean;
  teaser?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`surface-panel flex flex-col p-5 ${className ?? ""}`}
    >
      <header className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold tracking-tight">
            {title}
            {locked && (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                Pro
              </span>
            )}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{question}</p>
        </div>
      </header>
      <div className="mt-5 flex-1">
        <Locked locked={locked} teaser={teaser}>
          {children}
        </Locked>
      </div>
      {note && (
        <Locked locked={locked} teaser="La lectura del entrenador IA está incluida en PRO.">
          <p className="mt-5 flex gap-2 rounded-2xl border border-border/70 bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>{note}</span>
          </p>
        </Locked>
      )}
    </motion.section>
  );
}


function Ring({ value, label, sub, size = 168 }: { value: number; label: string; sub?: string; size?: number }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-secondary)" strokeWidth={10} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (c * Math.max(0, Math.min(100, value))) / 100 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute grid place-items-center px-4 text-center">
          <p className="font-display text-3xl font-semibold leading-none">{label}</p>
        </div>
      </div>
      {sub && <p className="max-w-[180px] text-center text-[11px] leading-tight text-muted-foreground">{sub}</p>}
    </div>
  );

}

function Meter({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-primary"
        />
      </div>
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const cls = {
    neutral: "border-border text-muted-foreground",
    good: "border-primary/40 bg-primary/10 text-primary",
    warn: "border-warning/40 bg-warning/10 text-warning",
    bad: "border-destructive/40 bg-destructive/10 text-destructive",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${cls}`}>{children}</span>;
}

/* --------------------------------- Panel ---------------------------------- */

export function PieDashboard() {
  const snapshot = useMemo(() => buildSnapshot(), []);
  const { get, loading, aiReady } = usePieNarrative(snapshot);
  const s = snapshot;

  const { isFree } = usePlanTier();
  const [iqRange, setIqRange] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const iqSeries = s.iq[iqRange];

  const riskTone = s.risk.level === "Bajo" ? "good" : s.risk.level === "Moderado" ? "warn" : "bad";
  const recTone = s.recovery.label === "Recuperado" ? "good" : s.recovery.label === "Parcialmente recuperado" ? "warn" : "bad";

  return (
    <div className="space-y-3">
      {isFree && <UpgradeBanner hiddenCount={10} />}
      {/* Daily insight */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="surface-panel relative overflow-hidden p-6"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary">
              <Brain className="size-3.5" /> PACE Intelligence Engine
            </p>
            <h2 className="mt-3 font-display text-xl font-semibold tracking-tight md:text-2xl">
              {get("daily")}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {loading
                ? "Interpretando tus datos con IA…"
                : aiReady
                  ? "Lectura generada por IA a partir de tus últimos 3 años de entrenamientos."
                  : "Lectura calculada con tu histórico de entrenamientos."}
              {" · Se recalcula tras cada entrenamiento y una vez al día."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Ring value={s.iq.score} label={`${s.iq.score}`} sub={`Runner IQ · ${s.iq.level}`} size={140} />
          </div>
        </div>
      </motion.section>

      {/* Runner IQ */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card
          icon={Brain}
          title="Runner IQ"
          question="¿Cuál es mi nivel real como corredor hoy?"
          note={get("iq")}
          className="xl:col-span-2"
        >
          <div className="flex flex-wrap items-center gap-3">
            {(["weekly", "monthly", "yearly"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setIqRange(r)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  iqRange === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {{ weekly: "Semanal", monthly: "Mensual", yearly: "Anual" }[r]}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">
              7 d {s.iq.deltaWeek >= 0 ? "+" : ""}
              {s.iq.deltaWeek} · 30 d {s.iq.deltaMonth >= 0 ? "+" : ""}
              {s.iq.deltaMonth} · 1 año {s.iq.deltaYear >= 0 ? "+" : ""}
              {s.iq.deltaYear}
            </span>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={iqSeries}>
                <defs>
                  <linearGradient id="iqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[(d: number) => Math.max(0, d - 6), (d: number) => Math.min(100, d + 4)]} stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}/100`, "Runner IQ"]} />
                <Area type="monotone" dataKey="iq" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#iqGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card icon={Gauge} title="Factores del Runner IQ" question="¿Qué me está sumando y qué me está restando?" delay={0.05}>
          <div className="space-y-3">
            {s.iq.components.map((c) => (
              <Meter key={c.key} label={`${c.label} · ${Math.round(c.weight * 100)}%`} value={c.value} hint={c.hint} />
            ))}
          </div>
        </Card>
      </div>

      {/* Consistency / Velocity / Efficiency */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card icon={CalendarCheck} title="Consistency Index" question="¿Estoy siendo realmente constante?" note={get("consistency")}>
          <div className="flex items-end gap-4">
            <p className="font-display text-4xl font-semibold">{s.consistency.pct}%</p>
            <div className="pb-1 text-xs text-muted-foreground">
              <p>
                {s.consistency.done} sesiones en 8 semanas (objetivo {s.consistency.planned})
              </p>
              <p className="mt-0.5">
                Racha actual: {s.consistency.streakWeeks} semanas · Mejor: {s.consistency.bestStreak}
              </p>
            </div>
          </div>
          <div className="mt-4 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.consistency.weeks}>
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} />
                <Bar dataKey="sesiones" radius={[6, 6, 0, 0]} barSize={14}>
                  {s.consistency.weeks.map((w) => (
                    <Cell key={w.label} fill={w.sesiones >= 5 ? "var(--color-primary)" : "var(--color-secondary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card icon={Rocket} title="Improvement Velocity" question="¿A qué velocidad estoy mejorando?" note={get("velocity")} delay={0.05}>
          <div className="flex items-center gap-3">
            <Pill tone={s.velocity.label === "Muy rápida" || s.velocity.label === "Rápida" ? "good" : s.velocity.label === "Normal" ? "neutral" : "warn"}>
              {s.velocity.label}
            </Pill>
            <span className="text-xs text-muted-foreground">
              {s.velocity.secPerKmPerMonth > 0 ? "−" : "+"}
              {Math.abs(s.velocity.secPerKmPerMonth)} s/km al mes
            </span>
          </div>
          <div className="mt-4 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={s.velocity.series}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis reversed domain={["dataMin-8", "dataMax+8"]} tickFormatter={(v: number) => fmtPace(v)} stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${fmtPace(v)} /km`, "Ritmo rodaje"]} />
                <Line type="monotone" dataKey="ritmo" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card icon={HeartPulse} title="Efficiency Score" locked={false} teaser="Compara tu coste cardíaco a igual ritmo mes a mes." question="¿Me cuesta menos correr al mismo ritmo?" note={get("efficiency")} delay={0.1}>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border p-3">
              <p className="text-[11px] text-muted-foreground">Hace 3 meses</p>
              <p className="mt-1 font-display text-lg font-semibold">{s.efficiency.then.pace} /km</p>
              <p className="text-xs text-muted-foreground">{s.efficiency.then.hr} ppm</p>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3">
              <p className="text-[11px] text-muted-foreground">Ahora</p>
              <p className="mt-1 font-display text-lg font-semibold">{s.efficiency.now.pace} /km</p>
              <p className="text-xs text-primary">{s.efficiency.now.hr} ppm</p>
            </div>
          </div>
          <div className="mt-4 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.efficiency.series}>
                <defs>
                  <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" hide />
                <YAxis domain={["dataMin-0.05", "dataMax+0.05"]} hide />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} m/latido`, "Eficiencia"]} />
                <Area type="monotone" dataKey="eficiencia" stroke="var(--color-primary)" strokeWidth={2} fill="url(#effGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Fatigue / Recovery / Readiness */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card icon={ShieldAlert} title="Fatigue Risk" locked={false} teaser="Ratio carga aguda/crónica para anticipar el sobreentrenamiento." question="¿Estoy entrenando por encima de lo que aguanto?" note={get("risk")}>
          <div className="flex items-center gap-3">
            <Pill tone={riskTone as "good" | "warn" | "bad"}>{s.risk.level}</Pill>
            <span className="text-xs text-muted-foreground">
              ACWR {s.risk.acwr.toFixed(2)} · Monotonía {s.risk.monotony.toFixed(2)}
            </span>
          </div>
          <div className="mt-4 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.risk.series}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="cronica" stroke="var(--color-muted-foreground)" strokeWidth={1.5} fill="var(--color-secondary)" fillOpacity={0.5} />
                <Area type="monotone" dataKey="aguda" stroke="var(--color-primary)" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            {s.risk.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-[6px] size-1 shrink-0 rounded-full bg-primary" />
                {r}
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1.5 text-xs">
            {s.risk.recommendations.map((r) => (
              <p key={r} className="rounded-xl border border-border bg-background/40 px-3 py-2">
                {r}
              </p>
            ))}
          </div>
        </Card>

        <Card icon={BatteryCharging} title="Recovery Score" question="¿Puedo entrenar fuerte hoy?" note={get("recovery")} delay={0.05}>
          <div className="flex flex-col items-center">
            <Ring value={s.recovery.score} label={`${s.recovery.score}`} sub="Recuperación" size={150} />
            <div className="mt-3">
              <Pill tone={recTone as "good" | "warn" | "bad"}>{s.recovery.label}</Pill>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Última sesión exigente hace {s.recovery.hoursSinceHard} h
            </p>
          </div>
        </Card>

        <Card icon={Flag} title="Race Readiness" locked={isFree} teaser="Cuánto te falta para llegar listo a tu próxima carrera." question="¿Llegaré preparado a mi próxima carrera?" note={get("readiness")} delay={0.1}>
          <div className="flex items-baseline gap-2">
            <p className="font-display text-4xl font-semibold">{s.readiness.pct}%</p>
            <span className="text-xs text-muted-foreground">
              {s.readiness.race} · {s.readiness.date} · faltan {s.readiness.daysLeft} días
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {s.readiness.drivers.map((d) => (
              <Meter key={d.label} label={d.label} value={d.value} />
            ))}
          </div>
        </Card>
      </div>

      {/* Trend / Balance */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card icon={TrendingUp} title="Performance Trend" locked={false} teaser="Tendencia real de rendimiento ajustada por frecuencia cardíaca." question="¿Voy hacia arriba o hacia abajo?" note={get("trend")} className="xl:col-span-2">
          <div className="flex items-center gap-3">
            <Pill tone={s.trend.direction === "Mejorando" ? "good" : s.trend.direction === "Estable" ? "neutral" : "bad"}>
              {s.trend.direction}
            </Pill>
            <span className="text-xs text-muted-foreground">
              {s.trend.slope > 0 ? "+" : ""}
              {s.trend.slope}% de rendimiento ajustado por FC (24 semanas)
            </span>
          </div>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.trend.series}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={["dataMin-0.4", "dataMax+0.4"]} stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={34} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Índice de rendimiento"]} />
                <Area type="monotone" dataKey="rendimiento" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#trendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground md:grid-cols-3">
            {s.trend.causes.map((c) => (
              <li key={c} className="rounded-xl border border-border px-3 py-2">
                {c}
              </li>
            ))}
          </ul>
        </Card>

        <Card icon={Scale} title="Training Balance" locked={false} teaser="Reparto entre suave, umbral y series con corrección semanal." question="¿Está bien repartido mi entrenamiento?" note={get("balance")} delay={0.05}>
          <div className="space-y-3">
            {s.balance.buckets.map((b) => (
              <div key={b.kind}>
                <div className="flex items-baseline justify-between text-xs">
                  <span>{b.label}</span>
                  <span className="text-muted-foreground">
                    {b.pct}% <span className="opacity-60">/ ideal {b.ideal}%</span>
                  </span>
                </div>
                <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${b.pct}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-primary"
                  />
                  <span className="absolute top-0 h-full w-px bg-foreground/50" style={{ left: `${b.ideal}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Pill tone={s.balance.balanced ? "good" : "warn"}>
              {s.balance.balanced ? "Reparto equilibrado" : "Reparto desequilibrado"}
            </Pill>
          </div>
        </Card>
      </div>

      {/* Runner DNA */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card icon={Dna} title="Runner DNA" locked={isFree} teaser="Tu arquetipo de corredor y la distancia donde más rindes." question="¿Qué tipo de corredor soy realmente?" note={get("dna")} className="xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={s.dna.radar} outerRadius="72%">
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="rasgo" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
                  <Radar dataKey="valor" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.25} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {s.dna.archetype}
                </span>
                <Pill>{s.dna.idealDistance}</Pill>
                <Pill>{s.dna.idealTerrain}</Pill>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Fortalezas</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {s.dna.strengths.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-border p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">A mejorar</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {s.dna.weaknesses.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {s.dna.toImprove.map((x) => (
                  <li key={x} className="flex gap-2">
                    <Zap className="mt-0.5 size-3 shrink-0 text-primary" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card icon={Trophy} title="Personal Best Evolution" question="¿Cuánto he mejorado cada marca?" note={get("pbs")} delay={0.05}>
          <div className="space-y-3">
            {s.pbs.map((pb) => (
              <div key={pb.key} className="rounded-2xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{pb.key}</p>
                  <span className="text-xs text-primary">
                    {pb.improvementPct > 0 ? `−${pb.improvementPct}%` : "—"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  {pb.years.map((y) => (
                    <span key={y.year}>
                      <span className="opacity-60">{y.year}</span> {y.time}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Predictions / Goals */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card icon={Target} title="Race Predictions" locked={isFree} teaser="Tu marca estimada hoy de 5 K a maratón." question="¿Qué tiempo haría hoy en cada distancia?" note={get("predictions")} className="xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {s.predictions.map((p) => (
              <div key={p.key} className="rounded-2xl border border-border p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium">{p.label}</p>
                  <span className="text-[11px] text-muted-foreground">{p.confidence}% confianza</span>
                </div>
                <p className="mt-2 font-display text-2xl font-semibold">{p.time}</p>
                <p className="mt-1 text-[11px] text-primary">{p.deltaVsYearAgo}</p>
                <p className="mt-2 text-xs text-muted-foreground">{p.toImprove}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card icon={Activity} title="Goal Probability" locked={isFree} teaser="Probabilidad real de cumplir cada objetivo." question="¿Qué probabilidad real tengo de lograrlo?" note={get("goals")} delay={0.05}>
          <div className="space-y-4">
            {s.goals.map((g) => (
              <div key={g.id}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{g.label}</span>
                  <span className="font-display font-semibold">{g.probability}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${g.probability}%` }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{g.gapText}</p>
                <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
                  {g.levers.map((l) => (
                    <li key={l} className="flex gap-2">
                      <span className="mt-[6px] size-1 shrink-0 rounded-full bg-primary" />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Heat / Shoes */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card icon={CloudSun} title="Heat Performance" locked={false} teaser="Temperatura, humedad y franja horaria donde rindes más." question="¿En qué condiciones rindo mejor?" note={get("heat")} className="xl:col-span-2">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.heat.tempBuckets}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="rango" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis reversed domain={["dataMin-10", "dataMax+10"]} tickFormatter={(v: number) => fmtPace(v)} stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} formatter={(v: number, n) => (n === "ritmo" ? [`${fmtPace(v)} /km`, "Ritmo medio"] : [v, n])} />
                <Bar dataKey="ritmo" radius={[8, 8, 0, 0]} barSize={26}>
                  {s.heat.tempBuckets.map((b) => (
                    <Cell key={b.rango} fill={b.rango === s.heat.bestRange ? "var(--color-primary)" : "var(--color-secondary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <p className="rounded-xl border border-border px-3 py-2">
              Mejor franja horaria: <span className="text-foreground">{s.heat.bestHour}</span>
            </p>
            <p className="rounded-xl border border-border px-3 py-2">
              Humedad &gt;75%: {s.heat.humidityImpact > 0 ? `+${s.heat.humidityImpact}` : s.heat.humidityImpact} s/km · Viento &gt;18 km/h:{" "}
              {s.heat.windImpact > 0 ? `+${s.heat.windImpact}` : s.heat.windImpact} s/km
            </p>
          </div>
        </Card>

        <Card icon={Footprints} title="Shoe Analytics" locked={false} teaser="Rendimiento y vida útil de cada zapatilla." question="¿Con qué zapatillas rindo más y cuáles debo jubilar?" note={get("shoes")} delay={0.05}>
          <div className="space-y-3">
            {s.shoes.map((sh) => (
              <div key={sh.name} className="rounded-2xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{sh.name}</p>
                  <Pill tone={sh.status === "Jubilar" ? "bad" : sh.status === "Revisar pronto" ? "warn" : "good"}>
                    {sh.status}
                  </Pill>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, sh.lifePct)}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {sh.km} km · {sh.pace} · {sh.hr} ppm · {sh.elevation} m D+ · {sh.records} sesiones en su mejor rango
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI insight del último entrenamiento + recomendaciones */}
      <div className="grid gap-3 xl:grid-cols-2">
        <Card icon={Sparkles} title="AI Insight del último entrenamiento" locked={isFree} teaser="Lectura del entrenador IA sobre cada sesión." question="¿Qué me dice mi última sesión?">
          <p className="text-sm font-medium">
            {s.report.activity.distanceKm.toFixed(1)} km ·{" "}
            {new Date(s.report.activity.date).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fmtPace(s.report.activity.paceS)} /km · {s.report.activity.avgHr} ppm · {s.report.activity.cadence} spm ·{" "}
            {s.report.activity.elevationM} m D+
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-primary">Qué ha salido bien</p>
              <ul className="mt-2 space-y-1 text-xs">
                {s.report.good.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Qué mejorar</p>
              <ul className="mt-2 space-y-1 text-xs">
                {s.report.improve.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            <p className="rounded-xl border border-border px-3 py-2">{s.report.goalImpact}</p>
            <p className="rounded-xl border border-border px-3 py-2">{s.report.iqImpact}</p>
            <p className="rounded-xl border border-border px-3 py-2">Mañana: {s.report.tomorrow}</p>
          </div>
        </Card>

        <Card icon={Zap} title="Smart Recommendations" locked={isFree} teaser="Qué hacer exactamente hoy, mañana y esta semana." question="¿Qué debería hacer exactamente ahora?" delay={0.05}>
          <div className="space-y-2">
            {s.recommendations.map((r) => (
              <div key={r.action} className="rounded-2xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${
                      r.tone === "positivo" ? "bg-primary" : r.tone === "cuidado" ? "bg-destructive" : "bg-muted-foreground"
                    }`}
                  />
                  <p className="text-sm font-medium">{r.action}</p>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{r.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
