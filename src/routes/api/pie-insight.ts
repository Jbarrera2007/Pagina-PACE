import { createFileRoute } from "@tanstack/react-router";

/**
 * Capa de interpretación de PIE: recibe el snapshot de métricas ya calculado y
 * devuelve explicaciones en lenguaje de entrenador para cada tarjeta.
 */

const SYSTEM = `Eres el motor de interpretación de PACE Intelligence Engine (PIE), el sistema de inteligencia deportiva de PACE.
Recibes métricas YA CALCULADAS de un corredor y debes explicarlas como lo haría un entrenador que lleva años con él.

Reglas:
- Español, tono cercano y profesional. Tuteo.
- Cada explicación: 1-2 frases, máximo 40 palabras. Concreta, con cifras del snapshot.
- Explica QUÉ significa el dato y QUÉ hacer con él. Nunca repitas el número sin interpretarlo.
- Nunca diagnostiques lesiones ni des consejo médico: habla de tendencias y de carga.
- Prohibido inventar datos que no estén en el snapshot.
- Devuelve EXCLUSIVAMENTE un objeto JSON válido con estas claves de texto plano:
  iq, consistency, velocity, efficiency, risk, recovery, readiness, trend, balance, dna, pbs, predictions, heat, shoes, goals, daily`;

export const Route = createFileRoute("/api/pie-insight")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing AI credentials", { status: 500 });

        let snapshot: unknown;
        try {
          snapshot = (await request.json()) as unknown;
        } catch {
          return new Response("Invalid body", { status: 400 });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
          body: JSON.stringify({
            model: "openai/gpt-5.6-sol",
            reasoning_effort: "none",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM },
              {
                role: "user",
                content: `Snapshot PIE (JSON):\n${JSON.stringify(snapshot).slice(0, 12000)}`,
              },
            ],
          }),
        });

        if (!upstream.ok) {
          const status = upstream.status === 429 || upstream.status === 402 ? upstream.status : 500;
          return new Response(await upstream.text(), { status });
        }

        const json = (await upstream.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = json.choices?.[0]?.message?.content ?? "{}";

        return new Response(content, {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
