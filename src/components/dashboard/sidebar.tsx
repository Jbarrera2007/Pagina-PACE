import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  BarChart3,
  Bot,
  Brain,
  Calculator,
  CalendarRange,
  Flag,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Target,
  Timer,
  User,
  X,
} from "lucide-react";

export const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "PACE IQ", icon: Brain },
  { label: "Entrenamientos", icon: Timer },
  { label: "IA Coach", icon: Bot },
  { label: "Planes", icon: CalendarRange },
  { label: "Carreras", icon: Flag },
  { label: "Objetivos", icon: Target },
  { label: "Calculadoras", icon: Calculator },
  { label: "Estadísticas", icon: BarChart3 },
  { label: "Perfil", icon: User },
  { label: "Configuración", icon: Settings },
];

/** Accesos rápidos de la barra inferior en móvil. */
const quickItems = navItems.filter((i) =>
  ["Dashboard", "PACE IQ", "Entrenamientos", "IA Coach"].includes(i.label),
);

export function DashboardSidebar({
  active: activeProp,
  onSelect,
}: {
  active?: string;
  onSelect?: (label: string) => void;
} = {}) {
  const [internal, setInternal] = useState("Dashboard");
  const active = activeProp ?? internal;
  const setActive = (label: string) => {
    setInternal(label);
    onSelect?.(label);
  };
  const [open, setOpen] = useState(false);

  const activeIcon = navItems.find((i) => i.label === active)?.icon ?? LayoutDashboard;
  const ActiveIcon = activeIcon;

  return (
    <>
      {/* ---------------------------- Móvil: top bar ---------------------------- */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="size-4" strokeWidth={2.5} />
          </span>
          <span className="font-display font-semibold tracking-tight">PACE</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs"
        >
          <ActiveIcon className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">{active}</span>
          <LayoutGrid className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </div>

      {/* --------------------------- Móvil: menú sheet -------------------------- */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm lg:hidden"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 max-h-[88svh] overflow-y-auto rounded-t-3xl border-t border-sidebar-border bg-sidebar p-5 pb-8"
            >
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-semibold tracking-tight">Navegación</p>
                <button
                  aria-label="Cerrar"
                  onClick={() => setOpen(false)}
                  className="grid size-9 place-items-center rounded-full border border-border"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {navItems.map((item, i) => {
                  const isActive = item.label === active;
                  return (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * i, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setActive(item.label);
                        setOpen(false);
                      }}
                      className={`flex flex-col items-start gap-3 rounded-2xl border p-3.5 text-left text-sm transition-colors ${
                        isActive
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-border bg-background/40 text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`grid size-9 place-items-center rounded-xl ${
                          isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                        }`}
                      >
                        <item.icon className="size-4" />
                      </span>
                      <span className="truncate font-medium">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl border border-sidebar-border bg-background/50 p-4">
                <p className="text-xs font-medium">Plan Pro</p>
                <p className="mt-1 text-xs text-muted-foreground">Renovación 12 sep 2026</p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-[64%] rounded-full bg-primary" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------- Móvil: barra inferior ------------------------ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-1 border-t border-sidebar-border bg-sidebar/85 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        {quickItems.map((item) => {
          const isActive = item.label === active;
          return (
            <button
              key={item.label}
              onClick={() => setActive(item.label)}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute inset-0 -z-10 rounded-xl bg-primary/10"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <item.icon className="size-[18px]" />
              <span className="max-w-full truncate">{item.label === "Entrenamientos" ? "Sesiones" : item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground"
        >
          <LayoutGrid className="size-[18px]" />
          <span>Más</span>
        </button>
      </nav>

      {/* ---------------------------- Escritorio ------------------------------- */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2 pt-2">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="size-4" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">PACE</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const isActive = item.label === active;
            return (
              <button
                key={item.label}
                onClick={() => setActive(item.label)}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 -z-10 rounded-xl bg-sidebar-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <item.icon className={`size-4 ${isActive ? "text-primary" : ""}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-4 rounded-2xl border border-sidebar-border bg-background/50 p-4">
          <p className="text-xs font-medium">Plan Pro</p>
          <p className="mt-1 text-xs text-muted-foreground">Renovación 12 sep 2026</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-[64%] rounded-full bg-primary" />
          </div>
        </div>
      </aside>
    </>
  );
}
