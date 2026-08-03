import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navbar, Hero, LogoStrip } from "@/components/landing/hero";
import {
  Benefits,
  HowItWorks,
  DashboardShowcase,
  AICoach,
  Predictions,
  Plans,
  Testimonials,
} from "@/components/landing/sections";
import { Pricing, FAQ, FinalCTA, Footer } from "@/components/landing/pricing-faq";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PACE — Entrena más inteligente, corre más rápido" },
      {
        name: "description",
        content:
          "PACE analiza automáticamente tus entrenamientos con IA: carga, VO2, predicciones de marca y planes adaptativos para corredores.",
      },
      { property: "og:title", content: "PACE — Train Smarter. Run Faster." },
      {
        property: "og:description",
        content:
          "La plataforma inteligente que analiza tus entrenamientos para ayudarte a correr más rápido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <LogoStrip />
      <Benefits />
      <HowItWorks />
      <DashboardShowcase />
      <AICoach />
      <Predictions />
      <Plans />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
