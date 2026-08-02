import { motion } from "motion/react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
};

/** Comparativa semana actual vs semana anterior (datos de ejemplo realistas). */
export const weekMetrics = [
  { key: "Distancia", now: 72.4, prev: 64.8, unit: "km", better: "up" as const },
  { key: "Sesiones", now: 6, prev: 5, unit: "", better: "up" as const },
  { key: "Tiempo", now: 6.3, prev: 5.6, unit: "h", better: "up" as const },
  { key: "Desnivel", now: 820, prev: 940, unit: "m", better: "up" as const },
  { key: "Ritmo medio", now: 4.72, prev: 4.85, unit: "min/km", better: "down" as const },
  { key: "FC media", now: 146, prev: 151, unit: "bpm", better: "down" as const },
  { key: "Carga", now: 412, prev: 368, unit: "", better: "up" as const },
];

const last8Weeks = [
  { semana: "S-7", km: 51, prev: 47 },
  { semana: "S-6", km: 58, prev: 51 },
  { semana: "S-5", km: 44, prev: 58 },
  { semana: "S-4", km: 63, prev: 44 },
  { semana: "S-3", km: 69, prev: 63 },
  { semana: "S-2", km: 57, prev: 69 },
  { semana: "S-1", km: 64.8, prev: 57 },
  { semana: "Actual", km: 72.4, prev: 64.8 },
];

function fmt(v: number, unit: string) {
  if (unit === "min/km") {
    const m = Math.floor(v);
    const s = Math.round((v - m) * 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export function WeekComparison({ className }: { className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`surface-panel p-5 ${className ?? ""}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Esta semana vs semana pasada</h2>
        <span className="text-xs text-muted-foreground">27 jul – 2 ago · vs 20–26 jul</span>
      </header>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {weekMetrics.map((m) => {
          const diff = m.now - m.prev;
          const pct = m.prev === 0 ? 0 : (diff / m.prev) * 100;
          const positive = m.better === "up" ? diff > 0 : diff < 0;
          const flat = Math.abs(pct) < 0.5;
          const Icon = flat ? ArrowRight : diff > 0 ? ArrowUpRight : ArrowDownRight;
          return (
            <div key={m.key} className="rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{m.key}</p>
              <p className="mt-1.5 font-display text-xl font-semibold">
                {fmt(m.now, m.unit)}
                {m.unit && m.unit !== "min/km" && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">{m.unit}</span>
                )}
              </p>
              <p
                className={`mt-1 flex items-center gap-1 text-[11px] ${
                  flat ? "text-muted-foreground" : positive ? "text-primary" : "text-destructive"
                }`}
              >
                <Icon className="size-3" />
                {flat ? "sin cambios" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)} %`}
                <span className="text-muted-foreground">
                  · antes {fmt(m.prev, m.unit)}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={last8Weeks} barGap={2}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="semana"
              stroke="var(--color-muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={34}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              name="Semana anterior"
              dataKey="prev"
              radius={[6, 6, 0, 0]}
              fill="var(--color-secondary)"
              barSize={14}
            />
            <Bar
              name="Semana"
              dataKey="km"
              radius={[6, 6, 0, 0]}
              fill="var(--color-primary)"
              barSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Llevas <span className="text-foreground">+7,6 km</span> y una sesión más que la semana
        pasada, con el ritmo medio 13″/km más rápido y la frecuencia cardíaca 5 ppm más baja: mejor
        eficiencia con más volumen.
      </p>
    </motion.section>
  );
}
