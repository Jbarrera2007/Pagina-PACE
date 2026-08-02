import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Crown, Lock, Minus, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export type PlanTier = "free" | "pro" | "elite";

/* ------------------------- Desbloqueo para el editor ----------------------- */

const OVERRIDE_KEY = "pace:tier-override";

/** Códigos privados del creador. Solo afectan a este navegador. */
const UNLOCK_CODES: Record<string, PlanTier> = {
  "pace-pro-2026": "pro",
  "pace-elite-2026": "elite",
  "pace-free": "free",
};

export function readTierOverride(): PlanTier | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(OVERRIDE_KEY);
  return v === "pro" || v === "elite" || v === "free" ? v : null;
}

/** Aplica un código. Devuelve el plan activado o null si el código no existe. */
export function applyUnlockCode(code: string): PlanTier | null {
  const tier = UNLOCK_CODES[code.trim().toLowerCase()];
  if (!tier) return null;
  window.localStorage.setItem(OVERRIDE_KEY, tier);
  window.dispatchEvent(new CustomEvent("pace:tier-override"));
  return tier;
}

export function clearUnlockCode() {
  window.localStorage.removeItem(OVERRIDE_KEY);
  window.dispatchEvent(new CustomEvent("pace:tier-override"));
}

/** Lee el plan real del usuario. Por defecto: free. */
export function usePlanTier() {
  const { user } = useAuth();
  const [tier, setTier] = useState<PlanTier>("free");
  const [override, setOverride] = useState<PlanTier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sync = () => setOverride(readTierOverride());
    sync();
    window.addEventListener("pace:tier-override", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pace:tier-override", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setTier("free");
      setLoading(false);
      return;
    }
    let alive = true;
    void supabase
      .from("subscriptions")
      .select("tier,status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setTier((data?.tier as PlanTier | undefined) ?? "free");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  const effective = override ?? tier;
  return {
    tier: effective,
    loading,
    isFree: effective === "free",
    isPro: effective !== "free",
    isOverridden: override !== null,
  };
}

export function requestUpgrade() {
  window.dispatchEvent(new CustomEvent("pace:upgrade"));
}

/** Caja privada del creador: introduce un código y desbloquea PRO/ELITE en este navegador. */
export function EditorUnlock() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const { tier, isOverridden } = usePlanTier();

  return (
    <div className="surface-panel p-5">
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary">
        <Crown className="size-3.5" /> Acceso de creador
      </p>
      <h2 className="mt-2 text-sm font-semibold tracking-tight">Desbloquear PRO / ELITE con código</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Introduce tu palabra clave para activar cualquier plan en este dispositivo, sin pasar por el
        pago. Plan activo ahora: <span className="text-foreground">{tier.toUpperCase()}</span>
        {isOverridden ? " (por código)" : ""}.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const t = applyUnlockCode(code);
            setMsg(t ? `Plan ${t.toUpperCase()} activado.` : "Código no válido.");
            setCode("");
          }}
          placeholder="Código de creador"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => {
            const t = applyUnlockCode(code);
            setMsg(t ? `Plan ${t.toUpperCase()} activado.` : "Código no válido.");
            setCode("");
          }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          <Sparkles className="size-3.5" /> Activar
        </button>
        {isOverridden && (
          <button
            onClick={() => {
              clearUnlockCode();
              setMsg("Código retirado: vuelves a tu plan real.");
            }}
            className="rounded-full border border-border px-4 py-2 text-xs transition-colors hover:bg-secondary"
          >
            Quitar
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-xs text-primary">{msg}</p>}
    </div>
  );
}


/** Envuelve una métrica premium: la difumina y muestra el candado con CTA. */
export function Locked({
  locked,
  children,
  label = "PRO",
  teaser,
}: {
  locked: boolean;
  children: React.ReactNode;
  label?: string;
  teaser?: string | undefined;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div aria-hidden className="pointer-events-none select-none blur-[7px] saturate-50 opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center bg-background/40 p-4 text-center backdrop-blur-[2px]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xs"
        >
          <span className="mx-auto grid size-10 place-items-center rounded-2xl border border-primary/40 bg-primary/10 text-primary">
            <Lock className="size-4" />
          </span>
          <p className="mt-3 text-sm font-semibold">Disponible en {label}</p>
          {teaser && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{teaser}</p>}
          <button
            onClick={requestUpgrade}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            <Sparkles className="size-3.5" /> Desbloquear
          </button>
        </motion.div>
      </div>
    </div>
  );
}

/** Banner superior para cuentas gratuitas. */
export function UpgradeBanner({ hiddenCount }: { hiddenCount: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="surface-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden p-5"
    >
      <div className="pointer-events-none absolute -left-20 -top-24 size-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative min-w-0">
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary">
          <Crown className="size-3.5" /> Plan Free
        </p>
        <h3 className="mt-2 text-sm font-semibold sm:text-base">
          Tienes {hiddenCount} métricas avanzadas bloqueadas
        </h3>
        <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
          Eficiencia, riesgo de fatiga, predicciones de marca, Runner DNA, probabilidad de objetivos y
          recomendaciones diarias de la IA se calculan con tus datos: solo falta desbloquearlas.
        </p>
      </div>
      <button
        onClick={requestUpgrade}
        className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
      >
        <Sparkles className="size-3.5" /> Pasar a PRO · 12 €/mes
      </button>
    </motion.section>
  );
}

type Row = { feature: string; free: string | boolean; pro: string | boolean; elite: string | boolean };

const rows: Row[] = [
  { feature: "Historial de entrenamientos", free: "30 días", pro: "Ilimitado", elite: "Ilimitado" },
  { feature: "Métricas básicas (km, ritmo, FC)", free: true, pro: true, elite: true },
  { feature: "Runner IQ y consistencia", free: true, pro: true, elite: true },
  { feature: "Efficiency Score y tendencia", free: false, pro: true, elite: true },
  { feature: "Fatigue Risk y Recovery avanzado", free: false, pro: true, elite: true },
  { feature: "Predicciones de 5 K a maratón", free: false, pro: true, elite: true },
  { feature: "Runner DNA y Training Balance", free: false, pro: true, elite: true },
  { feature: "Probabilidad de objetivos", free: false, pro: true, elite: true },
  { feature: "Heat Performance y Shoe Analytics", free: false, pro: true, elite: true },
  { feature: "IA Coach", free: "5 mensajes/día", pro: "Ilimitado", elite: "Ilimitado" },
  { feature: "Análisis IA por entrenamiento", free: false, pro: true, elite: true },
  { feature: "Planes adaptativos", free: false, pro: true, elite: true },
  { feature: "Informe semanal automático", free: false, pro: true, elite: true },
  { feature: "Panel de entrenador y equipo", free: false, pro: false, elite: true },
  { feature: "Exportación CSV/GPX y API", free: false, pro: false, elite: true },
  { feature: "Soporte prioritario", free: false, pro: false, elite: true },
];

function Cell({ value, accent }: { value: string | boolean; accent?: boolean }) {
  if (value === true)
    return <Check className={`mx-auto size-4 ${accent ? "text-primary" : "text-foreground"}`} />;
  if (value === false) return <Minus className="mx-auto size-4 text-muted-foreground/50" />;
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

export function PlanComparison({ tier }: { tier: PlanTier }) {
  const plans: { key: PlanTier; name: string; price: string }[] = [
    { key: "free", name: "Free", price: "0 €" },
    { key: "pro", name: "Pro", price: "12 €/mes" },
    { key: "elite", name: "Elite", price: "29 €/mes" },
  ];

  return (
    <div className="surface-panel p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Compara los planes</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Estás en el plan <span className="text-foreground">{tier.toUpperCase()}</span>
          </p>
        </div>
        {tier === "free" && (
          <button
            onClick={requestUpgrade}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            <Sparkles className="size-3.5" /> Mejorar plan
          </button>
        )}
      </header>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2 text-xs font-normal text-muted-foreground">Función</th>
              {plans.map((p) => (
                <th key={p.key} className="w-28 py-2 text-center">
                  <span
                    className={`block text-xs font-semibold ${p.key === "pro" ? "text-primary" : ""}`}
                  >
                    {p.name}
                  </span>
                  <span className="block text-[11px] font-normal text-muted-foreground">{p.price}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.feature} className="border-t border-border/70">
                <td className="py-2.5 pr-3 text-xs">{r.feature}</td>
                <td className="py-2.5 text-center">
                  <Cell value={r.free} />
                </td>
                <td className="py-2.5 text-center">
                  <Cell value={r.pro} accent />
                </td>
                <td className="py-2.5 text-center">
                  <Cell value={r.elite} accent />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
