import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Bot, Flag, Sparkles } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard-data";

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
};

function Panel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface-panel p-5 ${className ?? ""}`}>
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

export function MetricGrid() {
  const { metrics, loading } = useDashboard();

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          "Distancia semanal",
          "Ritmo medio",
          "Tiempo en movimiento",
          "Desnivel positivo",
        ].map((label) => (
          <article
            key={label}
            className="surface-panel p-3.5 sm:p-4"
          >
            <div className="text-xs text-muted-foreground">
              {label}
            </div>

            <div className="mt-1 text-xl font-semibold">
              …
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              Cargando…
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="surface-panel p-5 text-sm text-muted-foreground">
        No hay datos de actividad para calcular las métricas semanales.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m, i) => {
        const hasDelta = m.delta !== null;
        const positive =
          m.delta !== null && m.delta >= 0;

        return (
          <motion.article
            key={m.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.04,
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="surface-panel p-3.5 sm:p-4"
          >
            <div className="text-xs text-muted-foreground">
              {m.label}
            </div>

            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-semibold">
                {m.value}
              </span>

              {m.unit && (
                <span className="text-xs text-muted-foreground">
                  {m.unit}
                </span>
              )}
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              {m.hint}
            </div>

            <span
              className={`mt-2 inline-flex items-center gap-0.5 text-[11px] ${
                !hasDelta
                  ? "text-muted-foreground"
                  : positive
                    ? "text-success"
                    : "text-destructive"
              }`}
            >
              {hasDelta ? (
                <>
                  {positive ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}

                  {Math.abs(m.delta ?? 0)}%
                </>
              ) : (
                "Sin referencia"
              )}
            </span>
          </motion.article>
        );
      })}
    </div>
  );
}

export function LoadChart() {
  const { loadSeries, hasActivities } = useDashboard();

  return (
    <Panel title="Carga, forma y fatiga" subtitle="7 semanas" className="xl:col-span-2">
      {!hasActivities ? (
        <EmptyState>
          Sin entrenamientos registrados todavía. Sincroniza Strava o añade una sesión para ver tu
          carga real.
        </EmptyState>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={loadSeries}>
              <defs>
                <linearGradient id="dCarga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                yAxisId="carga"
                tickLine={false}
                axisLine={false}
                width={32}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <YAxis yAxisId="idx" orientation="right" hide />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                yAxisId="carga"
                type="monotone"
                dataKey="carga"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                fill="url(#dCarga)"
              />
              <Area
                yAxisId="idx"
                type="monotone"
                dataKey="forma"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                fill="none"
              />
              <Area
                type="monotone"
                yAxisId="idx"
                dataKey="fatiga"
                stroke="var(--color-chart-3)"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function formatPace(v: number) {
  const total = Math.round(v * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

export function PaceChart() {
  const { paceSeries, hasActivities } = useDashboard();

  return (
    <Panel title="Ritmo y frecuencia cardíaca" subtitle="Última semana · min/km">
      {!hasActivities ? (
        <EmptyState>Sin sesiones en los últimos 7 días.</EmptyState>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={paceSeries}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                yAxisId="pace"
                width={54}
                reversed
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                tickFormatter={(v: number) => formatPace(v).replace(" /km", "")}
              />
              <YAxis yAxisId="hr" orientation="right" hide />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) =>
                  name === "ritmo" ? [formatPace(value), "Ritmo"] : [`${value} ppm`, "FC"]
                }
              />
              <Line
                yAxisId="pace"
                type="monotone"
                dataKey="ritmo"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="fc"
                stroke="var(--color-chart-4)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

export function VolumeChart() {
  const { volumeSeries, hasActivities } = useDashboard();

  return (
    <Panel title="Volumen diario" subtitle="km">
      {!hasActivities ? (
        <EmptyState>Sin volumen registrado.</EmptyState>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeSeries}>
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <Tooltip cursor={{ fill: "var(--color-secondary)" }} contentStyle={tooltipStyle} />
              <Bar dataKey="km" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

export function ZonesPanel() {
  const { zoneSplit } = useDashboard();

  return (
    <Panel title="Distribución por zonas" subtitle="% del tiempo">
      {zoneSplit.length === 0 ? (
        <EmptyState>
          Necesitamos tu FC máxima en el perfil y sesiones con pulsómetro para calcular las zonas.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {zoneSplit.map((z, i) => (
            <li key={z.zone} className="flex items-center gap-3">
              <span className="w-7 text-xs text-muted-foreground">{z.zone}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${z.pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.06 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
              <span className="w-8 text-right text-xs">{z.pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function PredictionPanel() {
  const { predictions } = useDashboard();

  return (
    <Panel title="Predicción IA">
      {predictions.length === 0 ? (
        <EmptyState>Aún no hay predicciones calculadas para tus distancias.</EmptyState>
      ) : (
        <ul className="divide-y divide-border">
          {predictions.map((p) => (
            <li key={p.distance} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">{p.distance}</span>
              <span className="font-display text-lg font-semibold">{p.time}</span>
              <span className="text-xs text-primary">{p.confidence}%</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function NextRacePanel() {
  const { nextRace } = useDashboard();

  return (
    <Panel title="Próxima carrera">
      {!nextRace ? (
        <EmptyState>No tienes ninguna carrera objetivo en un plan activo.</EmptyState>
      ) : (
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
            <Flag className="size-4" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">{nextRace.name}</p>
            <p className="text-xs text-muted-foreground">
              {nextRace.date} · faltan {nextRace.daysLeft} días
            </p>
            <p className="mt-3 text-xs text-muted-foreground">{nextRace.plan}</p>
            <span className="mt-3 inline-block rounded-full bg-primary/15 px-2.5 py-1 text-[11px] text-primary">
              Objetivo {nextRace.goal}
            </span>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function GoalsPanel() {
  const { goals } = useDashboard();

  return (
    <Panel title="Objetivos">
      {goals.length === 0 ? (
        <EmptyState>Todavía no has creado objetivos.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {goals.map((g, i) => (
            <li key={g.id}>
              <div className="flex justify-between text-sm">
                <span>{g.label}</span>
                <span className="text-muted-foreground">{g.progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${g.progress}%` }}
                  transition={{ duration: 0.9, delay: i * 0.08 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function CoachPanel() {
  const { insights } = useDashboard();

  return (
    <Panel title="IA Coach" subtitle={insights.length > 0 ? `${insights.length} análisis` : ""}>
      {insights.length === 0 ? (
        <EmptyState>
          Aún no hay análisis guardados. Habla con tu IA Coach para generar el primero.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {insights.map((c) => (
            <li key={c.title} className="rounded-2xl border border-border bg-background/50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-3.5 text-primary" />
                {c.title}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("pace:open-coach"))}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs text-foreground transition-colors hover:bg-surface-2"
      >
        <Bot className="size-3.5 text-primary" /> Preguntar al coach
      </button>
    </Panel>
  );
}

const effortStyles: Record<string, string> = {
  Suave: "bg-secondary text-muted-foreground",
  Moderado: "bg-accent/15 text-accent",
  Duro: "bg-primary/15 text-primary",
  "Muy duro": "bg-destructive/15 text-destructive",
  "—": "bg-secondary text-muted-foreground",
};

export function WorkoutsPanel() {
  const { workouts } = useDashboard();

  return (
    <Panel title="Últimos entrenamientos" subtitle="7 días" className="min-w-0 xl:col-span-2">
      {workouts.length === 0 ? (
        <EmptyState>Sin entrenamientos en los últimos 7 días.</EmptyState>
      ) : (
        <div className="-mx-1 max-w-full overflow-x-auto px-1">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-3 font-normal">Sesión</th>
                <th className="pb-3 font-normal">Distancia</th>
                <th className="pb-3 font-normal">Ritmo</th>
                <th className="pb-3 font-normal">FC</th>
                <th className="pb-3 font-normal">Esfuerzo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {workouts.map((w) => (
                <tr key={w.id} className="transition-colors hover:bg-secondary/40">
                  <td className="py-3 pr-4">
                    <span className="block font-medium">{w.title}</span>
                    <span className="text-xs text-muted-foreground">{w.date}</span>
                  </td>
                  <td className="py-3 pr-4">{w.distance}</td>
                  <td className="py-3 pr-4">{w.pace}</td>
                  <td className="py-3 pr-4">{w.hr > 0 ? `${w.hr} bpm` : "—"}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
                        effortStyles[w.effort] ?? "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {w.effort}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
