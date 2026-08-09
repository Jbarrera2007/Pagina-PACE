import { motion } from "motion/react";
import {
  Activity,
  Brain,
  CalendarCheck,
  Gauge,
  HeartPulse,
  LineChart,
  Sparkles,
  Target,
  Timer,
  Watch,
  Zap,
} from "lucide-react";
import { Reveal, SectionLabel } from "@/components/motion-primitives";
// Catálogo real de planes que ofrece PACE (definición de producto, no datos de usuario).
const trainingPlans = [
  { name: "10K en 12 semanas", weeks: 12, level: "Intermedio" },
  { name: "Media maratón en 16 semanas", weeks: 16, level: "Intermedio" },
  { name: "Maratón en 20 semanas", weeks: 20, level: "Avanzado" },
];

function SectionHeader({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <Reveal className="max-w-2xl">
      <SectionLabel>{label}</SectionLabel>
      <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.05]">
        {title}
      </h2>
      {description && <p className="mt-4 text-muted-foreground">{description}</p>}
    </Reveal>
  );
}

const benefits = [
  {
    icon: Brain,
    title: "Análisis automático",
    body: "Cada sesión se descompone en carga, zonas, deriva cardíaca y eficiencia sin que toques nada.",
  },
  {
    icon: Gauge,
    title: "Carga bajo control",
    body: "Ratio agudo/crónico en vivo para entrenar al límite sin cruzar la línea de la lesión.",
  },
  {
    icon: Timer,
    title: "Predicciones fiables",
    body: "Marcas estimadas de 5 K a maratón con intervalo de confianza actualizado a diario.",
  },
  {
    icon: HeartPulse,
    title: "Recuperación real",
    body: "HRV, sueño y fatiga combinados en un único índice accionable cada mañana.",
  },
  {
    icon: Watch,
    title: "Todo sincronizado",
    body: "Strava, Garmin, Coros, Apple Watch, Polar y Suunto en segundos, sin CSV.",
  },
  {
    icon: Target,
    title: "Objetivos vivos",
    body: "El plan se reescribe solo cuando cambias de carrera, de forma o de calendario.",
  },
];

export function Benefits() {
  return (
    <section id="beneficios" className="mx-auto w-[min(1200px,92vw)] py-28">
      <SectionHeader
        label="Beneficios"
        title="Todo lo que un entrenador vería. Cada día."
        description="PACE convierte datos crudos de tu reloj en decisiones concretas de entrenamiento."
      />
      <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {benefits.map((b, i) => (
          <Reveal key={b.title} delay={i % 3}>
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="surface-panel h-full p-6"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <b.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const steps = [
  {
    n: "01",
    title: "Conecta tu reloj",
    body: "Autoriza Strava o Garmin una vez. Importamos tu histórico completo en menos de un minuto.",
  },
  {
    n: "02",
    title: "La IA analiza",
    body: "Modelamos tu fisiología: umbrales, zonas reales, curva de potencia y tolerancia a la carga.",
  },
  {
    n: "03",
    title: "Corres más rápido",
    body: "Recibes el entrenamiento del día, el ajuste semanal y la predicción de tu próxima marca.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-y border-border bg-surface/30 py-28">
      <div className="mx-auto w-[min(1200px,92vw)]">
        <SectionHeader label="Cómo funciona" title="Tres pasos. Cero hojas de cálculo." />
        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i} className="bg-background">
              <div className="h-full p-8">
                <span className="font-display text-sm text-primary">{s.n}</span>
                <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DashboardShowcase() {
  return (
    <section id="dashboard" className="relative mx-auto w-[min(1200px,92vw)] py-28">
      <SectionHeader
        label="Dashboard"
        title="Tu temporada entera en una sola pantalla."
        description="Carga, forma y fatiga en tiempo real. Diseñado para leerse en tres segundos."
      />
      <Reveal delay={1}>
        <div className="surface-panel mt-14 overflow-hidden p-4 md:p-6" style={{ boxShadow: "var(--shadow-elevated)" }}>
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl border border-border bg-background/60 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Carga vs Forma</p>
                <span className="text-xs text-muted-foreground">Últimas 7 semanas</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                PACE calcula tu carga aguda y crónica a partir de cada sesión que sincronizas y te
                muestra cómo evoluciona tu forma semana a semana. Sin estimaciones inventadas: solo
                tus entrenamientos.
              </p>
            </div>
            <div className="grid gap-4">
              {[
                { icon: Activity, k: "Volumen semanal", v: "Kilómetros y tiempo reales de cada semana" },
                { icon: Zap, k: "Carga y fatiga", v: "Calculadas con tus sesiones sincronizadas" },
                { icon: LineChart, k: "Ritmo medio", v: "Media ponderada por distancia recorrida" },
              ].map((c) => (
                <div key={c.k} className="rounded-2xl border border-border bg-background/60 p-5">
                  <c.icon className="size-4 text-primary" />
                  <p className="mt-4 font-display text-lg font-semibold">{c.k}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function AICoach() {
  return (
    <section className="border-y border-border bg-surface/30 py-28">
      <div className="mx-auto grid w-[min(1200px,92vw)] gap-14 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeader
            label="IA Coach"
            title="Un entrenador que nunca duerme."
            description="Cada mañana recibes una instrucción clara: qué correr, a qué ritmo y por qué."
          />
          <div className="mt-8 space-y-3">
            {[
              "Ajusta el plan cuando faltas a una sesión",
              "Detecta fatiga acumulada antes de que la sientas",
              "Explica cada decisión en lenguaje humano",
            ].map((t, i) => (
              <Reveal key={t} delay={i}>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Sparkles className="size-4 text-primary" />
                  {t}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal delay={1}>
          <div className="surface-panel space-y-3 p-5">
            <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm">
              <p className="text-xs text-primary">PACE IA Coach</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                El coach lee tus entrenamientos sincronizados, tu carga acumulada y tus objetivos, y
                responde sobre tu situación concreta: qué sesión toca, a qué ritmo y por qué. Todas
                sus respuestas parten de tus datos, nunca de ejemplos genéricos.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Predictions() {
  return (
    <section className="mx-auto w-[min(1200px,92vw)] py-28">
      <SectionHeader
        label="Predicciones"
        title="Sabe tu marca antes de la salida."
        description="Modelo entrenado con millones de sesiones reales y calibrado con tu fisiología."
      />
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {[
          {
            title: "5K y 10K",
            body: "Proyección a partir de tus mejores marcas y de tu ritmo sostenido reciente.",
          },
          {
            title: "Media maratón",
            body: "Ajustada con tu volumen semanal y tu resistencia en tiradas largas.",
          },
          {
            title: "Maratón",
            body: "Calibrada con la carga acumulada del ciclo y tu ritmo en rodajes largos.",
          },
        ].map((p, i) => (
          <Reveal key={p.title} delay={i}>
            <div className="surface-panel h-full p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{p.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Plans() {
  return (
    <section className="border-y border-border bg-surface/30 py-28">
      <div className="mx-auto w-[min(1200px,92vw)]">
        <SectionHeader
          label="Planes"
          title="Planes que se adaptan a tu vida, no al revés."
        />
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {trainingPlans.map((p, i) => (
            <Reveal key={p.name} delay={i}>
              <motion.div whileHover={{ y: -4 }} className="surface-panel h-full p-6">
                <CalendarCheck className="size-5 text-primary" />
                <h3 className="mt-5 text-lg font-semibold">{p.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.weeks} semanas
                </p>
                <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
                  {p.level}
                </p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const testimonials = [
  {
    quote:
      "Bajé de 3:12 a 2:56 en un ciclo. Por primera vez entendí por qué corría cada sesión.",
    name: "Marta Ferrer",
    role: "Maratón · Barcelona",
  },
  {
    quote: "El control de carga me quitó las lesiones recurrentes de gemelo. Sin drama.",
    name: "Iván Oliveira",
    role: "Trail · Lisboa",
  },
  {
    quote: "La predicción de 10 K falló por 4 segundos. Da algo de miedo, la verdad.",
    name: "Nora Lindqvist",
    role: "Pista · Estocolmo",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto w-[min(1200px,92vw)] py-28">
      <SectionHeader label="Opiniones" title="Corredores que ya bajaron su marca." />
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delay={i}>
            <figure className="surface-panel h-full p-6">
              <blockquote className="text-base leading-relaxed">“{t.quote}”</blockquote>
              <figcaption className="mt-6 text-sm">
                <span className="font-medium">{t.name}</span>
                <span className="block text-xs text-muted-foreground">{t.role}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
