import { Link } from "@tanstack/react-router";
import { Check, ArrowRight, Activity } from "lucide-react";
import { Reveal, SectionLabel } from "@/components/motion-primitives";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const tiers = [
  {
    name: "Free",
    price: "0 €",
    period: "/mes",
    description: "Para empezar a entender tus datos.",
    features: [
      "Métricas básicas: km, ritmo y FC",
      "Runner IQ y consistencia",
      "30 días de histórico",
      "IA Coach: 5 mensajes/día",
    ],
    cta: "Empieza Gratis",
    featured: false,
  },
  {
    name: "Pro",
    price: "12 €",
    period: "/mes",
    description: "El estándar para corredores con objetivo.",
    features: [
      "IA Coach ilimitado y análisis de cada sesión",
      "Predicciones de 5 K a maratón",
      "Eficiencia, fatiga, Runner DNA y objetivos",
      "Planes adaptativos e informe semanal",
      "Histórico ilimitado",
    ],
    cta: "Probar 14 días",
    featured: true,
  },
  {
    name: "Elite",
    price: "29 €",
    period: "/mes",
    description: "Clubes y entrenadores con varios atletas.",
    features: [
      "Todo lo de Pro",
      "Panel de entrenador (hasta 25 atletas)",
      "Exportación CSV/GPX y API",
      "Soporte prioritario",
    ],
    cta: "Hablar con ventas",
    featured: false,
  },
];


export function Pricing() {
  return (
    <section id="precios" className="border-y border-border bg-surface/30 py-28">
      <div className="mx-auto w-[min(1200px,92vw)]">
        <Reveal className="max-w-2xl">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.05]">
            Precio simple. Cancela cuando quieras.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <Reveal key={tier.name} delay={i}>
              <div
                className={`relative flex h-full flex-col rounded-3xl border p-7 ${
                  tier.featured
                    ? "border-primary/40 bg-surface"
                    : "border-border bg-background/50"
                }`}
                style={tier.featured ? { boxShadow: "var(--shadow-glow)" } : undefined}
              >
                {tier.featured && (
                  <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground">
                    Más popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
                <p className="mt-6 font-display text-4xl font-semibold">
                  {tier.price}
                  <span className="text-base font-normal text-muted-foreground">{tier.period}</span>
                </p>
                <ul className="mt-7 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-8 rounded-full"
                  variant={tier.featured ? "default" : "outline"}
                >
                  <Link to="/dashboard">{tier.cta}</Link>
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  {
    q: "¿Necesito un reloj concreto?",
    a: "No. PACE se conecta con Strava, Garmin, Coros, Apple Watch, Polar y Suunto. Con cualquiera de ellos tienes el análisis completo.",
  },
  {
    q: "¿Cómo calcula la IA mis predicciones?",
    a: "Combinamos tu curva de ritmo-duración, la deriva cardíaca en sesiones largas y tu historial de carga para estimar la marca con un intervalo de confianza que se actualiza cada día.",
  },
  {
    q: "¿Puedo seguir con mi entrenador?",
    a: "Sí. PACE funciona como capa de análisis: tu entrenador puede acceder al panel de equipo y usar nuestros informes.",
  },
  {
    q: "¿Qué pasa si cancelo?",
    a: "Mantienes tu cuenta gratuita y puedes exportar todo tu histórico en CSV o GPX cuando quieras.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Cifrado en tránsito y en reposo, aislamiento por usuario a nivel de base de datos y borrado total bajo petición.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="mx-auto w-[min(900px,92vw)] py-28">
      <Reveal>
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.05]">
          Preguntas frecuentes
        </h2>
      </Reveal>
      <Reveal delay={1}>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-border">
              <AccordionTrigger className="text-left text-base hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="mx-auto w-[min(1200px,92vw)] pb-28">
      <Reveal>
        <div
          className="relative overflow-hidden rounded-[2rem] border border-border p-10 md:p-16"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
          <h2 className="relative max-w-xl text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05]">
            Tu próxima marca empieza hoy.
          </h2>
          <p className="relative mt-4 max-w-md text-muted-foreground">
            Conecta tu reloj y recibe tu primer análisis en menos de un minuto.
          </p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/dashboard">
                Empieza Gratis <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-7">
              <a href="#dashboard">Ver Demo</a>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

const footerCols = [
  { title: "Producto", links: ["Dashboard", "IA Coach", "Predicciones", "Planes", "Calculadoras"] },
  { title: "Empresa", links: ["Sobre PACE", "Blog", "Empleo", "Prensa"] },
  { title: "Recursos", links: ["Documentación", "API", "Estado del servicio", "Soporte"] },
  { title: "Legal", links: ["Privacidad", "Términos", "Cookies", "RGPD"] },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto grid w-[min(1200px,92vw)] gap-10 py-16 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="size-4" strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-semibold">PACE</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            La plataforma inteligente que analiza tus entrenamientos para ayudarte a correr más
            rápido.
          </p>
        </div>
        {footerCols.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-medium">{col.title}</p>
            <ul className="mt-4 space-y-2">
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-[min(1200px,92vw)] flex-wrap items-center justify-between gap-3 py-6 text-xs text-muted-foreground">
          <p>© 2026 PACE Labs S.L. Todos los derechos reservados.</p>
          <p>Hecho para corredores obsesivos.</p>
        </div>
      </div>
    </footer>
  );
}
