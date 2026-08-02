import { useMemo } from "react";
import { motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BatteryCharging,
  Brain,
  CalendarCheck,
  CheckCircle2,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { buildSnapshot } from "@/lib/pie/engine";

const ease = [0.16, 1, 0.3, 1] as const;

function Card({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease, delay: delay * 0.06 }}
      className={`surface-panel relative overflow-hidden p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function QuestionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {text}
    </p>
  );
}

function Ring({ value, label, sub }: { value: number; label: string; sub: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[86px] shrink-0">
        <svg viewBox="0 0 80 80" className="size-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-border)" strokeWidth="7" />
          <motion.circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (c * Math.min(100, Math.max(0, value))) / 100 }}
            transition={{ duration: 1.1, ease }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-display text-xl font-semibold">
          {Math.round(value)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

/**
 * Mission Control — la pantalla que responde en menos de 10 segundos a:
 * 1) ¿Cómo estoy hoy?  2) ¿Qué debería hacer hoy?  3) ¿Estoy más cerca de mi objetivo?
 * 4) ¿En qué estoy mejorando?  5) ¿Qué debo corregir?
 */
export function MissionControl({ name }: { name?: string | undefined }) {
  const s = useMemo(() => buildSnapshot(), []);

  const readiness = Math.round((s.recovery.score * 0.5 + (100 - s.risk.acwr * 40) * 0.2 + s.iq.score * 0.3));
  const topGoal = [...s.goals].sort((a, b) => b.probability - a.probability)[0]!;
  const primary = s.recommendations[0];
  const alerts = s.recommendations.filter((r) => r.tone === "cuidado").slice(0, 3);
  const wins = [
    s.velocity.secPerKmPerMonth !== 0
      ? `Mejoras ${Math.abs(s.velocity.secPerKmPerMonth)} s/km al mes (${s.velocity.label.toLowerCase()})`
      : null,
    s.efficiency.deltaPct !== 0
      ? `Eficiencia ${s.efficiency.deltaPct > 0 ? "+" : ""}${s.efficiency.deltaPct}% en 3 meses`
      : null,
    `${s.consistency.streakWeeks} semanas seguidas cumpliendo el plan`,
    `Runner IQ ${s.iq.deltaMonth >= 0 ? "+" : ""}${s.iq.deltaMonth} puntos en 30 días`,
  ].filter(Boolean) as string[];

  const state =
    readiness >= 75 ? "Listo para calidad" : readiness >= 55 ? "Entrena con cabeza" : "Prioriza recuperar";

  return (
    <section className="space-y-3">
      <Card delay={0} className="p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary">
              <Sparkles className="size-3.5" /> Mission Control
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {name ? `${name}, hoy estás: ${state.toLowerCase()}` : `Hoy estás: ${state.toLowerCase()}`}
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
              {s.dailyInsight}
            </p>
          </div>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary">
            Actualizado {s.updatedAt}
          </span>
        </div>
      </Card>

      <div className="grid gap-3 xl:grid-cols-3">
        {/* 1 · ¿Cómo estoy hoy? */}
        <Card delay={1}>
          <QuestionLabel icon={<BatteryCharging className="size-3.5" />} text="¿Cómo estoy hoy?" />
          <div className="mt-4">
            <Ring
              value={readiness}
              label={`Readiness ${state}`}
              sub={`${s.recovery.label} · riesgo de fatiga ${s.risk.level.toLowerCase()} (ACWR ${s.risk.acwr.toFixed(2)})`}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: <Brain className="size-3.5" />, l: "Runner IQ", v: `${s.iq.score}` },
              { icon: <Activity className="size-3.5" />, l: "Recuperación", v: `${s.recovery.score}` },
              { icon: <Flame className="size-3.5" />, l: "Monotonía", v: s.risk.monotony.toFixed(1) },
            ].map((m) => (
              <div key={m.l} className="rounded-2xl border border-border p-3">
                <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="text-primary">{m.icon}</span>
                  {m.l}
                </p>
                <p className="mt-1 font-display text-lg font-semibold">{m.v}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* 2 · ¿Qué debería hacer hoy? */}
        <Card delay={2}>
          <QuestionLabel icon={<CalendarCheck className="size-3.5" />} text="¿Qué debería hacer hoy?" />
          <p className="mt-4 font-display text-xl font-semibold leading-snug">
            {primary?.action ?? "Rodaje suave 45 min en Z2"}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {primary?.reason ?? s.recovery.detail}
          </p>
          <div className="mt-4 space-y-2">
            {s.recommendations.slice(1, 4).map((r) => (
              <div
                key={r.action}
                className="flex items-start gap-2 rounded-xl border border-border px-3 py-2 text-xs"
              >
                <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="min-w-0">{r.action}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Mañana: {s.report.tomorrow.toLowerCase()}
          </p>
        </Card>

        {/* 3 · ¿Estoy más cerca de mi objetivo? */}
        <Card delay={3}>
          <QuestionLabel icon={<Target className="size-3.5" />} text="¿Estoy más cerca de mi objetivo?" />
          <div className="mt-4">
            <div className="flex items-end justify-between">
              <p className="text-sm font-medium">{topGoal.label}</p>
              <p className="font-display text-2xl font-semibold text-primary">{topGoal.probability}%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${topGoal.probability}%` }}
                transition={{ duration: 1, ease }}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{topGoal.gapText}</p>
          </div>
          <div className="mt-4 rounded-2xl border border-border p-3">
            <p className="text-[11px] text-muted-foreground">{s.readiness.race}</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="font-display text-xl font-semibold">{s.readiness.pct}%</p>
              <p className="text-[11px] text-muted-foreground">{s.readiness.daysLeft} días</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {topGoal.levers.slice(0, 2).map((l) => (
              <li key={l} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-primary" />
                {l}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {/* 4 · ¿En qué estoy mejorando? */}
        <Card delay={4}>
          <QuestionLabel icon={<TrendingUp className="size-3.5" />} text="¿En qué estoy mejorando?" />
          <p className="mt-3 text-sm">
            Tendencia global:{" "}
            <span className="text-primary">{s.trend.direction.toLowerCase()}</span> (
            {s.trend.slope > 0 ? "+" : ""}
            {s.trend.slope}% de rendimiento ajustado por FC)
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {wins.map((w) => (
              <div key={w} className="flex items-start gap-2 rounded-xl border border-border px-3 py-2.5 text-xs">
                <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="min-w-0 leading-relaxed">{w}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 5 · ¿Qué debo corregir? */}
        <Card delay={5}>
          <QuestionLabel icon={<AlertTriangle className="size-3.5" />} text="¿Qué debo corregir?" />
          <div className="mt-4 space-y-2">
            {(alerts.length > 0
              ? alerts.map((a) => ({ title: a.action, detail: a.reason }))
              : [
                  { title: s.balance.note, detail: "Ajuste de reparto por tipo de sesión." },
                  ...s.report.improve.slice(0, 2).map((i) => ({
                    title: i,
                    detail: "Detectado en tu última sesión.",
                  })),
                ]
            ).map((a) => (
              <div key={a.title} className="rounded-2xl border border-border p-3">
                <p className="flex items-start gap-2 text-xs font-medium">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span className="min-w-0">{a.title}</span>
                </p>
                <p className="mt-1 pl-5 text-[11px] leading-relaxed text-muted-foreground">{a.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
