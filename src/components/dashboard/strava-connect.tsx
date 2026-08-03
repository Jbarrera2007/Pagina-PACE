import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Link2, Link2Off } from "lucide-react";
import { toast } from "sonner";
import {
  getStravaAuthUrl,
  getStravaStatus,
  syncStrava,
  disconnectStrava,
} from "@/lib/strava.functions";

type Status = {
  connected: boolean;
  athleteId: number | null;
  lastSyncAt: string | null;
  activities: number;
};

export function StravaConnect() {
  const authUrlFn = useServerFn(getStravaAuthUrl);
  const statusFn = useServerFn(getStravaStatus);
  const syncFn = useServerFn(syncStrava);
  const disconnectFn = useServerFn(disconnectStrava);

  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function refresh() {
    try {
      const s = (await statusFn({})) as Status;
      setStatus(s);
    } catch {
      setStatus({ connected: false, athleteId: null, lastSyncAt: null, activities: 0 });
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    setBusy(true);
    // Se abre antes del await para que el navegador no bloquee el popup.
    const inIframe = window.self !== window.top;
    const popup = inIframe ? window.open("about:blank", "_blank", "noopener") : null;
    try {
      const { url } = (await authUrlFn({ data: { origin: window.location.origin } })) as {
        url: string;
      };
      if (popup) {
        popup.location.href = url;
        setBusy(false);
      } else {
        window.location.href = url;
      }
    } catch {
      popup?.close();
      setUnavailable(true);
      toast.error("Falta configurar las credenciales de Strava");
      setBusy(false);
    }
  }


  async function handleSync() {
    setBusy(true);
    try {
      const r = (await syncFn({})) as { imported: number };
      toast.success(`${r.imported} actividades sincronizadas`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo sincronizar");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnectFn({});
      toast.success("Strava desvinculado");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="grid size-8 place-items-center rounded-lg text-xs font-black text-white"
              style={{ background: "#FC4C02" }}
              aria-hidden
            >
              S
            </span>
            <h3 className="text-sm font-semibold tracking-tight">Strava</h3>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {status?.connected
              ? `Vinculado · ${status.activities} actividades importadas`
              : "Importa distancia, tiempo, ritmo, FC, cadencia y desnivel automáticamente."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {status?.connected ? (
            <>
              <button
                onClick={() => void handleSync()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Sincronizar
              </button>
              <button
                onClick={() => void handleDisconnect()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-60"
              >
                <Link2Off className="size-3.5" />
                Desvincular
              </button>
            </>
          ) : (
            <button
              onClick={() => void connect()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
              style={{ background: "#FC4C02" }}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
              Conectar con Strava
            </button>
          )}
        </div>
      </div>

      {unavailable && (
        <p className="mt-3 rounded-xl border border-border bg-background/60 p-3 text-[11px] text-muted-foreground">
          Añade tus credenciales de Strava (Client ID y Client Secret) para activar la vinculación.
        </p>
      )}
    </div>
  );
}
