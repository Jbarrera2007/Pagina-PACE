import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Menu, Activity } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-runners.jpg";

const navItems = [
  { label: "Beneficios", href: "#beneficios" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Precios", href: "#precios" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-4 flex w-[min(1200px,94vw)] items-center justify-between rounded-full border border-border bg-background/70 px-4 py-2.5 backdrop-blur-xl">
        <Link to="/" className="flex items-center gap-2 pl-1">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">PACE</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/dashboard">Iniciar sesión</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/dashboard">
              Empieza Gratis <ArrowRight className="size-3.5" />
            </Link>
          </Button>
          <button
            aria-label="Abrir menú"
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-full border border-border md:hidden"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </div>

      {open && (
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-2 flex w-[min(1200px,94vw)] flex-col gap-1 rounded-3xl border border-border bg-background/95 p-3 backdrop-blur-xl md:hidden"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </motion.nav>
      )}
    </header>
  );
}

export function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 90]);
  const scale = useTransform(scrollY, [0, 600], [1, 1.08]);

  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden pt-32">
      <motion.div style={{ y, scale }} className="absolute inset-0 -z-10">
        <img
          src={heroImage}
          alt="Dos corredores de élite entrenando al amanecer en una calle mojada"
          width={1600}
          height={1200}
          className="size-full object-cover object-[70%_center] opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/70" />
      </motion.div>

      <div className="mx-auto flex w-[min(1200px,92vw)] flex-col justify-center pb-24 pt-10 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Nuevo · IA Coach adaptativo en tiempo real
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-3xl text-[clamp(2.75rem,8vw,5.75rem)] font-semibold leading-[0.95]"
        >
          Train Smarter.
          <br />
          <span className="text-gradient">Run Faster.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-xl text-lg text-muted-foreground"
        >
          La plataforma inteligente que analiza automáticamente tus entrenamientos para ayudarte a
          correr más rápido.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <Button asChild size="lg" className="rounded-full px-7">
            <Link to="/dashboard">
              Empieza Gratis <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full border-border px-7">
            <a href="#dashboard">Ver Demo</a>
          </Button>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-border pt-8"
        >
          {[
            { k: "128 K", v: "corredores activos" },
            { k: "-4:12", v: "mejora media en maratón" },
            { k: "9,4 M", v: "sesiones analizadas" },
          ].map((s) => (
            <div key={s.k}>
              <dt className="font-display text-2xl font-semibold md:text-3xl">{s.k}</dt>
              <dd className="mt-1 text-xs text-muted-foreground">{s.v}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

const brands = ["Strava", "Garmin", "Coros", "Apple Watch", "Polar", "Suunto"];

export function LogoStrip() {
  return (
    <section className="border-y border-border bg-surface/40 py-10">
      <div className="mx-auto w-[min(1200px,92vw)]">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Sincroniza con
        </p>
        <div className="mt-6 grid grid-cols-3 items-center gap-6 md:grid-cols-6">
          {brands.map((b, i) => (
            <motion.span
              key={b}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className="text-center font-display text-base font-medium text-muted-foreground transition-colors hover:text-foreground md:text-lg"
            >
              {b}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
