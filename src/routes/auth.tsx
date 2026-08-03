import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Activity, ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s["next"] === "string" ? s["next"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Acceder — PACE" },
      {
        name: "description",
        content:
          "Entra en PACE para sincronizar tus entrenamientos, hablar con tu IA Coach y seguir tu carga, forma y objetivos.",
      },
    ],
  }),
  component: AuthPage,
});

function safeNext(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return null;
  }

  return value;
}

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const search = Route.useSearch() as Record<string, unknown>;
  const next = safeNext(search["next"]);

  function goNext() {
    if (next) {
      window.location.href = next;
      return;
    }

    void navigate({
      to: "/dashboard",
      replace: true,
    });
  }

  useEffect(() => {
    if (!loading && user) {
      goNext();
    }
  }, [user, loading]);

  async function handleGoogle() {
    setBusy(true);

    const target = next ?? "/dashboard";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(
          target,
        )}`,
      },
    });

    if (error) {
      setBusy(false);
      toast.error(error.message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: name,
            },
          },
        });

        if (error) throw error;

        if (!data.session) {
          toast.success("Revisa tu correo para confirmar la cuenta.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }

      goNext();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo completar la operación",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[38rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />

      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7 }}
        className="relative w-full max-w-md"
      >
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Volver
        </Link>

        <div className="rounded-3xl border border-border bg-surface/70 p-8 backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="size-4" />
            </span>
            <span className="font-display text-lg font-semibold">
              PACE
            </span>
          </div>

          <h1 className="mt-6 text-2xl font-semibold">
            {mode === "signin"
              ? "Bienvenido de vuelta"
              : "Crea tu cuenta"}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Accede a tu panel, tu IA Coach y tus métricas.
          </p>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm font-medium hover:bg-secondary disabled:opacity-60"
          >
            Continuar con Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            o
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre"
                className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm"
              />
            )}

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm"
            />

            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm"
            />

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signin"
              ? "¿Aún no tienes cuenta?"
              : "¿Ya tienes cuenta?"}{" "}
            <button
              onClick={() =>
                setMode(mode === "signin" ? "signup" : "signin")
              }
              className="font-medium text-foreground underline"
            >
              {mode === "signin"
                ? "Regístrate"
                : "Inicia sesión"}
            </button>
          </p>
        </div>
      </motion.div>
    </main>
  );
}