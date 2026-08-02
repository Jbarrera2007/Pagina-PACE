import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM_PROMPT = `Eres el IA Coach de PACE, un entrenador profesional de running con experiencia en fisiología del ejercicio, periodización y prevención de lesiones.

Reglas:
- Responde SIEMPRE en español, con tono cercano, directo y profesional.
- Sé concreto: da números, ritmos, zonas de FC, series y semanas.
- Usa markdown ligero (negritas y listas) para que se lea rápido.
- Si faltan datos del atleta, pide solo lo imprescindible y da una recomendación provisional.
- Nunca des consejo médico; ante dolor o síntomas, recomienda valoración profesional.
- Máximo ~250 palabras salvo que se pida un plan detallado.`;

interface ChatBody {
  conversationId?: string;
  messages?: { role: string; content: string }[];
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabase = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
          },
        );

        const { data: userData } = await supabase.auth.getUser(token);
        const user = userData.user;
        if (!user) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as ChatBody;
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) return new Response("Messages are required", { status: 400 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing AI credentials", { status: 500 });

        // Contexto real del atleta para que el coach no responda a ciegas.
        const [{ data: profile }, { data: activities }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase
            .from("activities")
            .select("name, started_at, distance_m, moving_time_s, avg_hr, avg_cadence, elevation_gain_m")
            .eq("user_id", user.id)
            .order("started_at", { ascending: false })
            .limit(15),
        ]);

        const context = `Datos del atleta (JSON):
perfil=${JSON.stringify(profile ?? {})}
ultimas_actividades=${JSON.stringify(activities ?? [])}
Si están vacíos, indica que aún no hay entrenamientos sincronizados y razona de forma general.`;

        const lastUser = [...messages].reverse().find((m) => m.role === "user");

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
          },
          body: JSON.stringify({
            model: "openai/gpt-5.6-sol",
            reasoning_effort: "none",
            stream: true,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "system", content: context },
              ...messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text();
          const status = upstream.status === 429 || upstream.status === 402 ? upstream.status : 500;
          return new Response(detail || "AI gateway error", { status });
        }

        const conversationId = body.conversationId;
        if (conversationId && lastUser) {
          await supabase.from("chat_messages").insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: "user",
            content: lastUser.content,
          });
        }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let full = "";
        let buffer = "";

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const payload = trimmed.slice(5).trim();
                  if (payload === "[DONE]") continue;
                  try {
                    const json = JSON.parse(payload) as {
                      choices?: { delta?: { content?: string } }[];
                    };
                    const delta = json.choices?.[0]?.delta?.content;
                    if (delta) {
                      full += delta;
                      controller.enqueue(encoder.encode(delta));
                    }
                  } catch {
                    // ignora fragmentos parciales
                  }
                }
              }
            } catch (error) {
              console.error("chat stream error", error);
            } finally {
              controller.close();
              if (conversationId && full) {
                await supabase.from("chat_messages").insert({
                  conversation_id: conversationId,
                  user_id: user.id,
                  role: "assistant",
                  content: full,
                });
                await supabase
                  .from("chat_conversations")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", conversationId);
              }
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
