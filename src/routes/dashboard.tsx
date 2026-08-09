import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, LogOut, Search } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { MissionControl } from "@/components/dashboard/mission-control";
import { AiCoach } from "@/components/dashboard/ai-coach";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  CalculatorsSection,
  GoalsSection,
  PlansSection,
  ProfileSection,
  RacesSection,
  SettingsSection,
  StatsSection,
  TrainingsSection,
} from "@/components/dashboard/sections";
import { DashboardDataProvider } from "@/hooks/use-dashboard-data";
import {
  CoachPanel,
  GoalsPanel,
  LoadChart,
  MetricGrid,
  NextRacePanel,
  PaceChart,
  PredictionPanel,
  VolumeChart,
  WorkoutsPanel,
  ZonesPanel,
} from "@/components/dashboard/panels";



export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PACE" },
      {
        name: "description",
        content:
          "Panel PACE: kilómetros, carga, VO2, cadencia, recuperación, predicciones IA y últimos entrenamientos en una sola vista.",
      },
      { property: "og:title", content: "Dashboard — PACE" },
      {
        property: "og:description",
        content: "Carga, forma, fatiga y predicciones de marca en tiempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [section, setSection] = useState("Dashboard");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth", search: { next: "/dashboard" }, replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    const onUpgrade = () => {
      setSection("Perfil");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("pace:upgrade", onUpgrade);
    return () => window.removeEventListener("pace:upgrade", onUpgrade);
  }, []);


  const [profileName, setProfileName] = useState<string | null>(null);

useEffect(() => {
  if (!user) {
    setProfileName(null);
    return;
  }

  const metadata = user.user_metadata as
    | Record<string, unknown>
    | null
    | undefined;

  const fullName =
    typeof metadata?.["full_name"] === "string"
      ? metadata["full_name"]
      : typeof metadata?.["name"] === "string"
        ? metadata["name"]
        : typeof user.email === "string"
          ? user.email.split("@")[0]
          : null;

setProfileName(fullName ?? null);
}, [user]);

const fullName = profileName ?? "";


  const displayName = fullName
    ? fullName.split(" ")[0]!.charAt(0).toUpperCase() + fullName.split(" ")[0]!.slice(1)
    : "corredor";

  const initials =
    fullName
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "PA";

  const subtitles: Record<string, string> = {
    "PACE IQ": "PACE Intelligence Engine · tu inteligencia deportiva",
    Entrenamientos: "Tu historial y volumen de carga",
    Planes: "Bloques y sesiones programadas",
    Carreras: "Próximos dorsales y evolución",
    Objetivos: "Metas activas y récords",
    Calculadoras: "Ritmos, zonas y equivalencias",
    Estadísticas: "Tu temporada en números",
    Perfil: "Datos personales y suscripción",
    Configuración: "Preferencias de la app",
  };

  function renderSection() {
  switch (section) {
    case "PACE IQ":
      return <MissionControl name={displayName} />;
    case "IA Coach":
      return <AiCoach />;
      case "Entrenamientos":
        return <TrainingsSection />;
      case "Planes":
        return <PlansSection />;
      case "Carreras":
        return <RacesSection />;
      case "Objetivos":
        return <GoalsSection />;
      case "Calculadoras":
        return <CalculatorsSection />;
      case "Estadísticas":
        return <StatsSection />;
      case "Perfil":
        return <ProfileSection name={fullName || "—"} email={user?.email ?? "—"} />;
      case "Configuración":
        return <SettingsSection />;
      default:
        return (
          <DashboardDataProvider>
          <div className="space-y-3">
            <MetricGrid />


            <div className="grid gap-3 xl:grid-cols-3">
              <LoadChart />
              <PredictionPanel />
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              <PaceChart />
              <VolumeChart />
              <ZonesPanel />
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              <WorkoutsPanel />
              <CoachPanel />
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              <NextRacePanel />
              <GoalsPanel />
            </div>
          </div>
          </DashboardDataProvider>
        );

    }
  }
const today = new Date();

const dateLabel = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(today);

const formattedDate =
  dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <DashboardSidebar active={section} onSelect={setSection} />

      <main className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-8 md:pt-6 lg:pb-16">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              {section === "Dashboard"
  ? formattedDate
  : (subtitles[section] ?? formattedDate)}
            </p>
            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {section === "Dashboard" ? `Hola, ${displayName}` : section}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm text-muted-foreground sm:flex">
              <Search className="size-3.5" />
              <span className="text-xs">Buscar sesión…</span>
            </div>
            <button
              aria-label="Notificaciones"
              className="hidden size-9 place-items-center rounded-full border border-border bg-surface transition-colors hover:bg-secondary sm:grid"
            >
              <Bell className="size-4" />
            </button>
            <button
              onClick={() => void signOut()}
              aria-label="Cerrar sesión"
              className="grid size-9 place-items-center rounded-full border border-border bg-surface transition-colors hover:bg-secondary"
            >
              <LogOut className="size-4" />
            </button>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </span>
          </div>
        </header>


        <div key={section} className="mt-6">
          {renderSection()}
        </div>

      </main>
    </div>
  );
}
