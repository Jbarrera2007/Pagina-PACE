import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
  Bell,
  Calculator,
  CalendarRange,
  Check,
  Flag,
  Globe,
  Lock,
  Moon,
  Mountain,
  Ruler,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import { recentWorkouts, trainingPlans } from "@/lib/pace-data";
import { WeekComparison } from "@/components/dashboard/week-compare";
import { StravaConnect } from "@/components/dashboard/strava-connect";
import {
  EditorUnlock,
  Locked,
  PlanComparison,
  requestUpgrade,
  usePlanTier,
} from "@/components/dashboard/plan";


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
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`surface-panel p-5 ${className ?? ""}`}
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </header>
      <div className="mt-4">{children}</div>
    </motion.section>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end gap-1">
        <span className="font-display text-2xl font-semibold">{value}</span>
        {unit && <span className="pb-0.5 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

/** Panel con contenido exclusivo de PRO/ELITE: se difumina en el plan Free. */
function PremiumPanel({
  title,
  subtitle,
  teaser,
  children,
  className,
  label = "PRO",
}: {
  title: string;
  subtitle?: string;
  teaser: string;
  children: React.ReactNode;
  className?: string;
  label?: "PRO" | "ELITE";
}) {
  const { tier } = usePlanTier();
  const locked = label === "ELITE" ? tier !== "elite" : tier === "free";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`surface-panel p-5 ${className ?? ""}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          {title}
          {locked && (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              {label}
            </span>
          )}
        </h2>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </header>
      <div className="mt-4">
        <Locked locked={locked} label={label} teaser={teaser}>
          {children}
        </Locked>
      </div>
    </motion.section>
  );
}


/* ------------------------------ Entrenamientos ----------------------------- */

const monthlyVolume = [
  { mes: "Feb", km: 182 },
  { mes: "Mar", km: 214 },
  { mes: "Abr", km: 236 },
  { mes: "May", km: 198 },
  { mes: "Jun", km: 251 },
  { mes: "Jul", km: 268 },
];

const surfaceSplit = [
  { tipo: "Asfalto", km: 168 },
  { tipo: "Pista", km: 42 },
  { tipo: "Trail", km: 38 },
  { tipo: "Cinta", km: 20 },
];

export function TrainingsSection() {
  const [filter, setFilter] = useState<"Todos" | "Suave" | "Moderado" | "Duro">("Todos");
  const list = useMemo(
    () => recentWorkouts.filter((w) => filter === "Todos" || w.effort === filter),
    [filter],
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Sesiones del mes" value="24" />
        <Stat label="Volumen del mes" value="268" unit="km" />
        <Stat label="Desnivel acumulado" value="3 140" unit="m" />
        <Stat label="Tiempo en movimiento" value="21:48" unit="h" />
      </div>

      <WeekComparison />

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Volumen mensual" subtitle="6 meses" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyVolume}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={34} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="km" stroke="var(--color-primary)" strokeWidth={2} fill="url(#volGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Superficie" subtitle="últimos 90 días">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={surfaceSplit} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="tipo" type="category" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={60} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} />
                <Bar dataKey="km" radius={[0, 8, 8, 0]} fill="var(--color-primary)" barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Historial de sesiones" subtitle={`${list.length} resultados`}>
        <div className="mb-4 flex flex-wrap gap-2">
          {(["Todos", "Suave", "Moderado", "Duro"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                filter === f
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="divide-y divide-border">
          {list.map((w) => (
            <div key={w.id} className="grid grid-cols-2 gap-2 py-3 text-sm md:grid-cols-5">
              <div className="col-span-2 md:col-span-2">
                <p className="font-medium">{w.title}</p>
                <p className="text-xs text-muted-foreground">{w.date}</p>
              </div>
              <span className="text-muted-foreground">{w.distance}</span>
              <span className="text-muted-foreground">{w.pace}</span>
              <span className="text-muted-foreground">{w.hr} bpm</span>
            </div>
          ))}
        </div>
      </Panel>

      <PremiumPanel
        title="Análisis IA por entrenamiento"
        subtitle="lectura del entrenador"
        teaser="La IA analiza cada sesión: calidad del estímulo, coste cardíaco y qué hacer mañana."
      >
        <div className="space-y-2">
          {[
            { s: "Series 8 × 800 m", t: "Estímulo VO2 correcto. Deriva cardíaca del 3,1 %: aún tienes margen para bajar 4″/km." },
            { s: "Tirada larga 26 km", t: "Últimos 6 km a +12″/km: aparece fatiga glucogénica, añade avituallamiento a partir del km 16." },
            { s: "Tempo 25 min", t: "Ritmo umbral estable a 4:05. Sube a 27 min la próxima semana antes de tocar el ritmo." },
          ].map((a) => (
            <div key={a.s} className="rounded-2xl border border-border p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Zap className="size-3.5 text-primary" /> {a.s}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.t}</p>
            </div>
          ))}
        </div>
      </PremiumPanel>
    </div>

  );
}

/* ---------------------------------- Planes --------------------------------- */

const planWeeks = [
  { semana: "S1", km: 48, calidad: 2 },
  { semana: "S2", km: 54, calidad: 2 },
  { semana: "S3", km: 61, calidad: 3 },
  { semana: "S4", km: 42, calidad: 1 },
  { semana: "S5", km: 66, calidad: 3 },
  { semana: "S6", km: 72, calidad: 3 },
];

const weekSessions = [
  { day: "Lun", title: "Descanso activo", detail: "Movilidad 20 min" },
  { day: "Mar", title: "Series 8 × 800 m", detail: "3:35 /km · rec 90″" },
  { day: "Mié", title: "Rodaje suave", detail: "10 km · 5:30 /km" },
  { day: "Jue", title: "Tempo 25 min", detail: "4:05 /km" },
  { day: "Vie", title: "Descanso", detail: "—" },
  { day: "Sáb", title: "Fartlek colinas", detail: "12 × 45″" },
  { day: "Dom", title: "Tirada larga", detail: "26 km · 5:05 /km" },
];

export function PlansSection() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Progresión del bloque" subtitle="Semana 6 de 18" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planWeeks}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="semana" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={34} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} />
                <Bar dataKey="km" radius={[8, 8, 0, 0]} barSize={26}>
                  {planWeeks.map((w) => (
                    <Cell
                      key={w.semana}
                      fill={w.calidad >= 3 ? "var(--color-primary)" : "var(--color-secondary)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Planes disponibles">
          <div className="space-y-2">
            {trainingPlans.map((p) => (
              <div key={p.name} className="rounded-2xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <CalendarRange className="size-4 text-primary" />
                  <p className="text-sm font-medium">{p.name}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.weeks} semanas · {p.sessions} sesiones/sem · {p.level}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Plan adaptativo IA"
        subtitle="se recalcula cada semana"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { t: "Ajuste de la semana", v: "−8 % de volumen por ACWR alto (1,42)" },
            { t: "Sesión clave sustituida", v: "Series 8 × 800 → 6 × 1000 a umbral" },
            { t: "Proyección al objetivo", v: "Sub 1:20 alcanzable en 9 semanas" },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{x.t}</p>
              <p className="mt-2 text-sm font-medium">{x.v}</p>
            </div>
          ))}
        </div>
      </Panel>



      <Panel title="Semana actual" subtitle="Bloque específico">
        <div className="grid gap-2 md:grid-cols-7">
          {weekSessions.map((s) => (
            <div key={s.day} className="rounded-2xl border border-border p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{s.day}</p>
              <p className="mt-2 text-sm font-medium">{s.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- Carreras -------------------------------- */

interface Race {
  id: string;
  name: string;
  date: string; // yyyy-mm-dd
  dist: string;
  goal: string;
}

const RACES_KEY = "pace:races";

const defaultRaces: Race[] = [
  { id: "r1", name: "Maratón de Valencia", date: "2026-12-07", dist: "42,2 km", goal: "Sub 2:55" },
  { id: "r2", name: "Media de Madrid", date: "2026-10-18", dist: "21,1 km", goal: "Sub 1:20" },
  { id: "r3", name: "10K Nocturna Bilbao", date: "2026-09-05", dist: "10 km", goal: "Sub 36:30" },
  { id: "r4", name: "Meeting 1500 Barcelona", date: "2026-08-22", dist: "1 500 m", goal: "Sub 4:15" },
  { id: "r5", name: "Control 800 en pista", date: "2026-08-09", dist: "800 m", goal: "Sub 2:02" },
  { id: "r6", name: "3000 m Cto. Autonómico", date: "2026-09-12", dist: "3 000 m", goal: "Sub 9:20" },
];

const DIST_OPTIONS = ["800 m", "1 500 m", "3 000 m", "5 km", "10 km", "21,1 km", "42,2 km"];

function daysUntil(date: string) {
  const d = new Date(`${date}T00:00:00`).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.max(0, Math.round((d - Date.now()) / 86_400_000));
}

function formatRaceDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function RaceCard({
  race,
  onChange,
  onDelete,
}: {
  race: Race;
  onChange: (r: Race) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(race);

  useEffect(() => setDraft(race), [race]);

  const input =
    "w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-panel p-5"
    >
      {editing ? (
        <div className="space-y-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Nombre de la carrera"
            className={input}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className={input}
            />
            <select
              value={draft.dist}
              onChange={(e) => setDraft({ ...draft, dist: e.target.value })}
              className={input}
            >
              {DIST_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <input
            value={draft.goal}
            onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
            placeholder="Objetivo (ej. Sub 4:15)"
            className={input}
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                onChange(draft);
                setEditing(false);
              }}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setDraft(race);
                setEditing(false);
              }}
              className="rounded-full border border-border px-4 py-1.5 text-xs"
            >
              Cancelar
            </button>
            <button
              onClick={onDelete}
              className="ml-auto rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <Flag className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{race.name}</p>
              <p className="text-xs text-muted-foreground">{formatRaceDate(race.date)}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="ml-auto rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Editar
            </button>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="font-display text-2xl font-semibold">{daysUntil(race.date)}</p>
              <p className="text-xs text-muted-foreground">días restantes</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
              {race.goal}
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{race.dist}</p>
        </>
      )}
    </motion.div>
  );
}

const raceHistory = [
  { year: "2022", tiempo: 3.35 },
  { year: "2023", tiempo: 3.18 },
  { year: "2024", tiempo: 3.07 },
  { year: "2025", tiempo: 2.98 },
  { year: "2026", tiempo: 2.91 },
];

export function RacesSection() {
  const [races, setRaces] = useState<Race[]>(defaultRaces);

  useEffect(() => {
    const raw = window.localStorage.getItem(RACES_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Race[];
        if (Array.isArray(parsed)) setRaces(parsed);
      } catch {
        /* ignora datos corruptos */
      }
    }
  }, []);

  const save = (next: Race[]) => {
    setRaces(next);
    window.localStorage.setItem(RACES_KEY, JSON.stringify(next));
  };

  const sorted = [...races].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Próximas carreras</h2>
          <p className="text-xs text-muted-foreground">
            Añade tus competiciones y objetivos: de 800 m a maratón.
          </p>
        </div>
        <button
          onClick={() =>
            save([
              ...races,
              {
                id: crypto.randomUUID(),
                name: "Nueva carrera",
                date: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
                dist: "1 500 m",
                goal: "Sub 4:20",
              },
            ])
          }
          className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          + Añadir carrera
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {sorted.map((r) => (
          <RaceCard
            key={r.id}
            race={r}
            onChange={(next) => save(races.map((x) => (x.id === r.id ? next : x)))}
            onDelete={() => save(races.filter((x) => x.id !== r.id))}
          />
        ))}
      </div>


      <Panel title="Evolución en maratón" subtitle="mejor marca por año (horas)">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={raceHistory}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="year" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis domain={[2.8, 3.5]} stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={34} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="tiempo" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <PremiumPanel
        title="Predicción de marca IA"
        subtitle="modelo Riegel + carga real"
        teaser="Predicciones de 800 m a maratón calculadas con tus últimas 12 semanas y tu nivel de fatiga."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { d: "800 m", t: "2:04", c: "90 %" },
            { d: "1 500 m", t: "4:18", c: "89 %" },
            { d: "3 000 m", t: "9:26", c: "90 %" },
            { d: "5 K", t: "17:24", c: "92 %" },
            { d: "10 K", t: "36:10", c: "88 %" },
            { d: "21 K", t: "1:19:42", c: "81 %" },
            { d: "42 K", t: "2:53:05", c: "74 %" },
          ].map((p) => (

            <div key={p.d} className="rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{p.d}</p>
              <p className="mt-2 font-display text-2xl font-semibold">{p.t}</p>
              <p className="mt-1 text-[11px] text-primary">confianza {p.c}</p>
            </div>
          ))}
        </div>
      </PremiumPanel>
    </div>

  );
}

/* -------------------------------- Objetivos -------------------------------- */

interface Objective {
  id: string;
  label: string;
  progress: number;
  due: string;
  type: string;
}

const initialObjectives: Objective[] = [
  { id: "o1", label: "Sub 1:20 en media maratón", progress: 72, due: "18 oct 2026", type: "Marca" },
  { id: "o2", label: "80 km semanales", progress: 78, due: "Semanal", type: "Volumen" },
  { id: "o3", label: "VO2 máx 60", progress: 64, due: "Dic 2026", type: "Fisiología" },
  { id: "o4", label: "12 sesiones de fuerza", progress: 41, due: "Mensual", type: "Fuerza" },
];

const records = [
  { dist: "1 K", time: "3:02", date: "12 jun 2026" },
  { dist: "5 K", time: "17:42", date: "3 may 2026" },
  { dist: "10 K", time: "36:58", date: "21 mar 2026" },
  { dist: "21 K", time: "1:22:14", date: "9 feb 2026" },
  { dist: "42 K", time: "2:54:36", date: "1 dic 2025" },
];

function GoalRow({
  goal,
  onChange,
  onDelete,
}: {
  goal: Objective;
  onChange: (g: Objective) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="space-y-3 rounded-2xl border border-border p-4">
        <input
          value={goal.label}
          onChange={(e) => onChange({ ...goal, label: e.target.value })}
          placeholder="Nombre del objetivo"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={goal.type}
            onChange={(e) => onChange({ ...goal, type: e.target.value })}
            placeholder="Tipo"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={goal.due}
            onChange={(e) => onChange({ ...goal, due: e.target.value })}
            placeholder="Fecha límite"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={goal.progress}
            onChange={(e) => onChange({ ...goal, progress: Number(e.target.value) })}
            className="h-1.5 flex-1 accent-[var(--color-primary)]"
            aria-label="Progreso"
          />
          <span className="w-10 text-right text-xs text-muted-foreground">{goal.progress}%</span>
        </div>
        <div className="flex justify-between">
          <button
            onClick={onDelete}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Eliminar
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Guardar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <Target className="size-3.5 text-primary" />
          {goal.label || "Sin nombre"}
        </span>
        <span className="flex items-center gap-3">
          <span className="text-muted-foreground">{goal.progress}%</span>
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] text-primary underline-offset-2 hover:underline"
          >
            Editar
          </button>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${goal.progress}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-primary"
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {goal.type} · {goal.due}
      </p>
    </div>
  );
}

export function GoalsSection() {
  const [objectives, setObjectives] = useState<Objective[]>(initialObjectives);

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <Panel title="Objetivos activos" subtitle={`${objectives.length} en curso`}>
        <div className="space-y-4">
          {objectives.map((g) => (
            <GoalRow
              key={g.id}
              goal={g}
              onChange={(next) =>
                setObjectives((prev) => prev.map((o) => (o.id === next.id ? next : o)))
              }
              onDelete={() => setObjectives((prev) => prev.filter((o) => o.id !== g.id))}
            />
          ))}
          <button
            onClick={() =>
              setObjectives((prev) => [
                ...prev,
                {
                  id: `o${Date.now()}`,
                  label: "Nuevo objetivo",
                  progress: 0,
                  due: "Sin fecha",
                  type: "Personal",
                },
              ])
            }
            className="w-full rounded-2xl border border-dashed border-border py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            + Añadir objetivo
          </button>
        </div>
      </Panel>


      <Panel title="Récords personales" subtitle="todas las distancias">
        <div className="divide-y divide-border">
          {records.map((r) => (
            <div key={r.dist} className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 text-sm">
                <Trophy className="size-3.5 text-primary" />
                {r.dist}
              </span>
              <span className="font-display text-lg font-semibold">{r.time}</span>
              <span className="text-xs text-muted-foreground">{r.date}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        className="xl:col-span-2"
        title="Probabilidad de conseguir tus objetivos"
        subtitle="simulación IA"
      >
        <div className="space-y-4">
          {[
            { g: "Sub 1:20 en media maratón", p: 68, a: "Añade 1 sesión de umbral/semana" },
            { g: "80 km semanales", p: 84, a: "Ritmo de progresión correcto" },
            { g: "VO2 máx 60", p: 47, a: "Faltan estímulos de VO2 máx" },
          ].map((x) => (
            <div key={x.g}>
              <div className="flex items-center justify-between text-sm">
                <span>{x.g}</span>
                <span className="text-primary">{x.p} %</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${x.p}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{x.a}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>

  );
}

/* ------------------------------- Calculadoras ------------------------------ */

function paceFromTime(totalSeconds: number, km: number) {
  const perKm = totalSeconds / km;
  const m = Math.floor(perKm / 60);
  const s = Math.round(perKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CalculatorsSection() {
  const [dist, setDist] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [hrMax, setHrMax] = useState("");

  const num = (v: string) => (v.trim() === "" ? 0 : Number(v));
  const distN = num(dist);
  const hrMaxN = num(hrMax) || 190;

  const total = num(hours) * 3600 + num(minutes) * 60 + num(seconds);
  const pace = total > 0 && distN > 0 ? paceFromTime(total, distN) : "—";
  const speed = total > 0 && distN > 0 ? ((distN / total) * 3600).toFixed(2) : "—";


  const zones = [
    { z: "Z1 Recuperación", lo: 0.5, hi: 0.6 },
    { z: "Z2 Aeróbico", lo: 0.6, hi: 0.7 },
    { z: "Z3 Tempo", lo: 0.7, hi: 0.8 },
    { z: "Z4 Umbral", lo: 0.8, hi: 0.9 },
    { z: "Z5 VO2 máx", lo: 0.9, hi: 1 },
  ];

  const inputCls =
    "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary";

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <Panel title="Calculadora de ritmo" subtitle="distancia y tiempo">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="text-xs text-muted-foreground sm:col-span-4">
            Distancia (km)
            <input type="number" inputMode="decimal" placeholder="0" value={dist} min={0.1} step={0.1} onChange={(e) => setDist(e.target.value)} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-xs text-muted-foreground">
            Horas
            <input type="number" inputMode="numeric" placeholder="0" value={hours} min={0} onChange={(e) => setHours(e.target.value)} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-xs text-muted-foreground">
            Minutos
            <input type="number" inputMode="numeric" placeholder="0" value={minutes} min={0} onChange={(e) => setMinutes(e.target.value)} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-xs text-muted-foreground">
            Segundos
            <input type="number" inputMode="numeric" placeholder="0" value={seconds} min={0} onChange={(e) => setSeconds(e.target.value)} className={`mt-1 ${inputCls}`} />

          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="size-3.5 text-primary" /> Ritmo medio
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">{pace} /km</p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="size-3.5 text-primary" /> Velocidad
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">{speed} km/h</p>
          </div>
        </div>
      </Panel>

      <Panel title="Zonas de frecuencia cardíaca" subtitle="según FC máx">
        <label className="text-xs text-muted-foreground">
          FC máxima (bpm)
          <input type="number" inputMode="numeric" placeholder="190" value={hrMax} min={120} max={230} onChange={(e) => setHrMax(e.target.value)} className={`mt-1 ${inputCls}`} />
        </label>
        <div className="mt-4 space-y-2">
          {zones.map((z) => (
            <div key={z.z} className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-sm">
              <span>{z.z}</span>
              <span className="text-muted-foreground">
                {Math.round(hrMaxN * z.lo)}–{Math.round(hrMaxN * z.hi)} bpm
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Equivalencias de distancia" subtitle="conversión rápida" className="xl:col-span-2">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "800 m", km: 0.8 },
            { label: "1 500 m", km: 1.5 },
            { label: "3 000 m", km: 3 },
            { label: "5 K", km: 5 },
            { label: "10 K", km: 10 },
            { label: "Media", km: 21.0975 },
            { label: "Maratón", km: 42.195 },

          ].map((d) => (
            <div key={d.label} className="rounded-2xl border border-border p-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Ruler className="size-3.5 text-primary" /> {d.label}
              </p>
              <p className="mt-2 font-display text-lg font-semibold">
                {total > 0 && distN > 0 ? paceFromTime((total / distN) * d.km, 1) : "—"} /km
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {(d.km * 0.621371).toFixed(2)} millas
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* -------------------------------- Estadísticas ------------------------------ */

const radarData = [
  { skill: "Resistencia", valor: 88 },
  { skill: "Velocidad", valor: 71 },
  { skill: "Umbral", valor: 82 },
  { skill: "Economía", valor: 76 },
  { skill: "Fuerza", valor: 58 },
  { skill: "Recuperación", valor: 84 },
];

const yearly = [
  { mes: "Ene", km: 165, elev: 1200 },
  { mes: "Feb", km: 182, elev: 1450 },
  { mes: "Mar", km: 214, elev: 1810 },
  { mes: "Abr", km: 236, elev: 2050 },
  { mes: "May", km: 198, elev: 1620 },
  { mes: "Jun", km: 251, elev: 2380 },
  { mes: "Jul", km: 268, elev: 3140 },
];

export function StatsSection() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total 2026" value="1 514" unit="km" />
        <Stat label="Desnivel total" value="13 650" unit="m" />
        <Stat label="Sesiones" value="168" />
        <Stat label="Horas corriendo" value="126" unit="h" />
      </div>

      <WeekComparison />

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Volumen y desnivel" subtitle="año en curso" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yearly}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="km" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={34} />
                <YAxis yAxisId="elev" orientation="right" hide />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} />
                <Bar yAxisId="km" dataKey="km" radius={[8, 8, 0, 0]} fill="var(--color-primary)" barSize={22} />
                <Line yAxisId="elev" type="monotone" dataKey="elev" stroke="var(--color-chart-2, var(--color-muted-foreground))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Perfil de corredor" subtitle="índice 0-100">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <Radar dataKey="valor" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.25} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Momentos destacados" subtitle="temporada 2026">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { icon: Mountain, title: "Mayor desnivel", value: "1 240 m · Trail Guadarrama" },
            { icon: Timer, title: "Sesión más rápida", value: "3:38 /km · 5 × 1000 m" },
            { icon: Trophy, title: "Mejor marca", value: "17:42 en 5 K" },
          ].map((h) => (
            <div key={h.title} className="rounded-2xl border border-border p-4">
              <h.icon className="size-4 text-primary" />
              <p className="mt-3 text-sm font-medium">{h.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{h.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Comparativa con corredores de tu nivel"
        subtitle="percentiles PACE"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { k: "Volumen semanal", v: "Top 12 %" },
            { k: "Consistencia", v: "Top 8 %" },
            { k: "Eficiencia", v: "Top 21 %" },
            { k: "Progresión anual", v: "Top 15 %" },
          ].map((c) => (
            <div key={c.k} className="rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{c.k}</p>
              <p className="mt-2 font-display text-xl font-semibold text-primary">{c.v}</p>
            </div>
          ))}
        </div>
      </Panel>

      <PremiumPanel
        label="ELITE"
        title="Exportación e informes avanzados"
        subtitle="CSV · GPX · API"
        teaser="Descarga todos tus datos, conecta la API de PACE y genera informes para tu entrenador."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { t: "Exportar temporada", v: "CSV con 168 sesiones" },
            { t: "Archivos GPX", v: "Descarga masiva de rutas" },
            { t: "API PACE", v: "Token personal + webhooks" },
          ].map((e) => (
            <div key={e.t} className="rounded-2xl border border-border p-4">
              <p className="text-sm font-medium">{e.t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{e.v}</p>
            </div>
          ))}
        </div>
      </PremiumPanel>
    </div>

  );
}

/* ---------------------------------- Perfil --------------------------------- */

export function ProfileSection({ name, email }: { name: string; email: string }) {
  const { tier } = usePlanTier();
  const isFree = tier === "free";
  const fields = [
    { label: "Nombre", value: name },
    { label: "Email", value: email },
    { label: "Ciudad", value: "Madrid, España" },
    { label: "Peso", value: "68 kg" },
    { label: "Altura", value: "178 cm" },
    { label: "FC máx", value: "190 bpm" },
    { label: "FC reposo", value: "42 bpm" },
    { label: "VO2 máx", value: "58,3 ml/kg" },
  ];

  const perks: Record<string, string[]> = {
    free: ["Métricas básicas", "Runner IQ y consistencia", "30 días de histórico"],
    pro: ["IA Coach ilimitado", "Planes adaptativos", "Predicciones avanzadas"],
    elite: ["Todo lo de PRO", "Panel de entrenador", "Exportación y API"],
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Tu perfil" subtitle="datos personales" className="xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label} className="rounded-2xl border border-border p-4">
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className="mt-1 truncate text-sm font-medium">{f.value}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Suscripción" subtitle={`Plan ${tier}`}>
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
            <p className="font-display text-xl font-semibold uppercase">{tier}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isFree ? "Sin coste · funciones limitadas" : "Renovación 12 sep 2026"}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {(perks[tier] ?? perks["free"]!).map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="size-3.5 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
            {isFree && (
              <button
                onClick={requestUpgrade}
                className="mt-5 w-full rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                Pasar a PRO · 12 €/mes
              </button>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            key: "free",
            name: "Free",
            price: "0 €",
            desc: "Lo esencial para seguir tu entrenamiento",
            has: ["Métricas básicas: km, ritmo, FC", "Runner IQ y consistencia", "Historial de 30 días", "5 mensajes/día con la IA"],
            not: ["Efficiency Score", "Fatigue Risk avanzado", "Predicciones de marca", "Runner DNA", "Planes adaptativos", "Informe semanal"],
          },
          {
            key: "pro",
            name: "Pro",
            price: "12 €/mes",
            desc: "Toda la inteligencia PACE sobre tus datos",
            has: ["Todo lo de Free, sin límites", "Efficiency Score y Fatigue Risk", "Predicciones de 5 K a maratón", "Runner DNA y Training Balance", "IA Coach ilimitado + análisis por sesión", "Planes adaptativos e informe semanal"],
            not: ["Panel de entrenador y equipo", "Exportación CSV/GPX y API"],
          },
          {
            key: "elite",
            name: "Elite",
            price: "29 €/mes",
            desc: "Para entrenadores y corredores avanzados",
            has: ["Todo lo de PRO", "Panel de entrenador y equipo", "Exportación CSV/GPX y API", "Soporte prioritario"],
            not: [],
          },
        ].map((p) => (
          <div
            key={p.key}
            className={`surface-panel p-5 ${p.key === tier ? "border-primary/50 ring-1 ring-primary/30" : ""}`}
          >
            <div className="flex items-baseline justify-between">
              <p className="font-display text-lg font-semibold">{p.name}</p>
              <span className="text-xs text-muted-foreground">{p.price}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
            <ul className="mt-4 space-y-2 text-xs">
              {p.has.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
              {p.not.map((f) => (
                <li key={f} className="flex gap-2 text-muted-foreground/70">
                  <Lock className="mt-0.5 size-3.5 shrink-0" />
                  <span className="line-through decoration-muted-foreground/40">{f}</span>
                </li>
              ))}
            </ul>
            {p.key !== tier && p.key !== "free" && (
              <button
                onClick={requestUpgrade}
                className="mt-5 w-full rounded-full border border-primary/50 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Pasar a {p.name}
              </button>
            )}
          </div>
        ))}
      </div>

      <PlanComparison tier={tier} />

      <StravaConnect />

      <EditorUnlock />



    </div>
  );
}


/* ------------------------------- Configuración ------------------------------ */

function Toggle({ label, hint, defaultOn }: { label: string; hint: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className="flex w-full items-center justify-between rounded-2xl border border-border p-4 text-left transition-colors hover:bg-secondary/40"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-secondary"}`}>
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={`absolute top-1 size-4 rounded-full bg-background ${on ? "left-6" : "left-1"}`}
        />
      </span>
    </button>
  );
}

export function SettingsSection() {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <Panel title="Notificaciones" subtitle="avisos y resúmenes">
        <div className="space-y-2">
          <Toggle label="Email" hint="Resumen semanal y análisis IA" defaultOn />
          <Toggle label="Push" hint="Nuevas actividades y récords" defaultOn />
          <Toggle label="Informe semanal" hint="Cada lunes a las 8:00" defaultOn />
        </div>
      </Panel>

      <Panel title="Preferencias" subtitle="app y unidades">
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <span className="flex items-center gap-2 text-sm">
              <Globe className="size-4 text-primary" /> Idioma
            </span>
            <span className="text-sm text-muted-foreground">Español</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <span className="flex items-center gap-2 text-sm">
              <Calculator className="size-4 text-primary" /> Unidades
            </span>
            <span className="text-sm text-muted-foreground">Métricas (km)</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <span className="flex items-center gap-2 text-sm">
              <Moon className="size-4 text-primary" /> Tema
            </span>
            <span className="text-sm text-muted-foreground">Oscuro</span>
          </div>
          <Toggle label="Análisis IA automático" hint="Analiza cada entrenamiento al importarlo" defaultOn />
          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <span className="flex items-center gap-2 text-sm">
              <Bell className="size-4 text-primary" /> Recordatorios
            </span>
            <span className="text-sm text-muted-foreground">1 h antes</span>
          </div>
        </div>
      </Panel>

      <PremiumPanel
        className="xl:col-span-2"
        title="Automatizaciones PRO"
        subtitle="informes y avisos inteligentes"
        teaser="Informe semanal automático, alertas de fatiga y análisis IA de cada entrenamiento importado."
      >
        <div className="space-y-2">
          <Toggle label="Informe semanal IA" hint="Resumen con carga, forma y plan de la semana" defaultOn />
          <Toggle label="Alerta de fatiga" hint="Aviso cuando tu ACWR supera 1,3" defaultOn />
          <Toggle label="Aviso de récord" hint="Detecta marcas personales al importar" defaultOn />
        </div>
      </PremiumPanel>
    </div>
  );
}

