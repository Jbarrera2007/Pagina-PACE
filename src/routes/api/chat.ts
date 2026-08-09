import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `
Eres el IA Coach de PACE, un entrenador profesional de running con experiencia en fisiología del ejercicio, periodización y prevención de lesiones.

Reglas:

- Responde siempre en español.
- Tono cercano, directo y profesional.
- Sé concreto.
- Cuando tengas datos suficientes, utiliza kilómetros, ritmos, frecuencia cardíaca, series y semanas.
- Usa markdown ligero.
- Si faltan datos, pide solo lo imprescindible.
- Nunca des consejo médico.
- Ante dolor, lesión o síntomas, recomienda consultar a un profesional sanitario.
- Máximo unas 250 palabras salvo que el usuario pida un plan detallado.
`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatBody = {
  conversationId?: string;
  messages?: ChatMessage[];
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // -----------------------------------------
          // 1. AUTORIZACIÓN
          // -----------------------------------------

          const authorization =
            request.headers.get("authorization");

          const token = authorization?.replace(
            /^Bearer\s+/i,
            "",
          );

          if (!token) {
            return new Response("Unauthorized", {
              status: 401,
            });
          }

          // -----------------------------------------
          // 2. VARIABLES DE ENTORNO
          // -----------------------------------------

          const supabaseUrl =
            process.env["SUPABASE_URL"];

          const supabaseKey =
            process.env["SUPABASE_PUBLISHABLE_KEY"];

          const geminiKey =
            process.env["GEMINI_API_KEY"];

          if (!supabaseUrl) {
            console.error("Falta SUPABASE_URL");

            return new Response(
              "Missing SUPABASE_URL",
              {
                status: 500,
              },
            );
          }

          if (!supabaseKey) {
            console.error(
              "Falta SUPABASE_PUBLISHABLE_KEY",
            );

            return new Response(
              "Missing SUPABASE_PUBLISHABLE_KEY",
              {
                status: 500,
              },
            );
          }

          if (!geminiKey) {
            console.error(
              "Falta GEMINI_API_KEY",
            );

            return new Response(
              "Missing GEMINI_API_KEY",
              {
                status: 500,
              },
            );
          }

          // -----------------------------------------
          // 3. CLIENTE SUPABASE
          // -----------------------------------------

          const supabase = createClient(
            supabaseUrl,
            supabaseKey,
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
              },
              global: {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            },
          );

          // -----------------------------------------
          // 4. COMPROBAR USUARIO
          // -----------------------------------------

          const {
            data: userData,
            error: userError,
          } =
            await supabase.auth.getUser(token);

          if (userError || !userData.user) {
            console.error(
              "Error de autenticación:",
              userError,
            );

            return new Response("Unauthorized", {
              status: 401,
            });
          }

          const user = userData.user;

          // -----------------------------------------
          // 5. LEER BODY
          // -----------------------------------------

          const body =
            (await request.json()) as ChatBody;

          const messages = Array.isArray(
            body.messages,
          )
            ? body.messages
            : [];

          if (messages.length === 0) {
            return new Response(
              "Messages are required",
              {
                status: 400,
              },
            );
          }

          // -----------------------------------------
          // 6. DATOS DEL ATLETA
          // -----------------------------------------

          const profileResult =
            await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .maybeSingle();

          const activitiesResult =
            await supabase
              .from("activities")
              .select(
                "name, started_at, distance_m, moving_time_s, avg_hr, avg_cadence, elevation_gain_m, suffer_score",
              )
              .eq("user_id", user.id)
              .order("started_at", {
                ascending: false,
              })
              .limit(15);

          const profile =
            profileResult.data ?? null;

          const activities =
            activitiesResult.data ?? [];

          if (profileResult.error) {
            console.error(
              "Error leyendo profile:",
              profileResult.error,
            );
          }

          if (activitiesResult.error) {
            console.error(
              "Error leyendo activities:",
              activitiesResult.error,
            );
          }

          // -----------------------------------------
          // 7. CONTEXTO DEL ATLETA
          // -----------------------------------------

          const athleteContext = `
DATOS DEL ATLETA:

PERFIL:
${JSON.stringify(profile, null, 2)}

ÚLTIMOS ENTRENAMIENTOS:
${JSON.stringify(activities, null, 2)}

Si no existen entrenamientos suficientes,
indica que todavía no hay datos suficientes
y proporciona una recomendación general.
`;

          // -----------------------------------------
          // 8. CLIENTE GEMINI
          // -----------------------------------------

          const ai = new GoogleGenAI({
            apiKey: geminiKey,
          });

          // -----------------------------------------
          // 9. PREPARAR CONVERSACIÓN
          // -----------------------------------------

          const recentMessages =
            messages.slice(-20);

          const conversationText =
            recentMessages
              .map((message) => {
                const role =
                  message.role === "user"
                    ? "Usuario"
                    : "IA Coach";

                return `${role}: ${message.content}`;
              })
              .join("\n\n");

          const prompt = `
${SYSTEM_PROMPT}

${athleteContext}

CONVERSACIÓN RECIENTE:

${conversationText}

Responde al último mensaje del usuario.
`;

          // -----------------------------------------
          // 10. GUARDAR MENSAJE DEL USUARIO
          // -----------------------------------------

          const conversationId =
            body.conversationId;

          const lastUserMessage =
            [...messages]
              .reverse()
              .find(
                (message) =>
                  message.role === "user",
              );

          if (
            conversationId &&
            lastUserMessage
          ) {
            const { error } =
              await supabase
                .from("chat_messages")
                .insert({
                  conversation_id:
                    conversationId,
                  user_id: user.id,
                  role: "user",
                  content:
                    lastUserMessage.content,
                });

            if (error) {
              console.error(
                "Error guardando mensaje:",
                error,
              );
            }
          }

          // -----------------------------------------
          // 11. LLAMAR A GEMINI
          // -----------------------------------------

          const response =
            await ai.models.generateContentStream({
              model: "gemini-2.5-flash-lite",
              contents: prompt,
            });

          // -----------------------------------------
          // 12. STREAM DE RESPUESTA
          // -----------------------------------------

          const encoder =
            new TextEncoder();

          let fullResponse = "";

          const stream =
            new ReadableStream<Uint8Array>({
              async start(controller) {
                try {
                  for await (
                    const chunk of response
                  ) {
                    const text =
                      chunk.text ?? "";

                    if (!text) {
                      continue;
                    }

                    fullResponse += text;

                    controller.enqueue(
                      encoder.encode(text),
                    );
                  }

                  // ---------------------------------
                  // 13. GUARDAR RESPUESTA IA
                  // ---------------------------------

                  if (
                    conversationId &&
                    fullResponse
                  ) {
                    const {
                      error:
                        assistantError,
                    } =
                      await supabase
                        .from("chat_messages")
                        .insert({
                          conversation_id:
                            conversationId,
                          user_id:
                            user.id,
                          role: "assistant",
                          content:
                            fullResponse,
                        });

                    if (assistantError) {
                      console.error(
                        "Error guardando respuesta:",
                        assistantError,
                      );
                    }

                    const {
                      error:
                        updateError,
                    } =
                      await supabase
                        .from(
                          "chat_conversations",
                        )
                        .update({
                          updated_at:
                            new Date().toISOString(),
                        })
                        .eq(
                          "id",
                          conversationId,
                        );

                    if (updateError) {
                      console.error(
                        "Error actualizando conversación:",
                        updateError,
                      );
                    }
                  }

                  controller.close();
                } catch (error) {
                  console.error(
                    "Error durante el streaming:",
                    error,
                  );

                  controller.error(error);
                }
              },
            });

          return new Response(stream, {
            status: 200,
            headers: {
              "Content-Type":
                "text/plain; charset=utf-8",

              "Cache-Control":
                "no-cache, no-transform",
            },
          });
        } catch (error) {
          console.error(
            "========== PACE IA ERROR ==========",
          );

          console.error(error);

          console.error(
            "===================================",
          );

          return new Response(
            error instanceof Error
              ? error.message
              : "Error interno del IA Coach",
            {
              status: 500,
            },
          );
        }
      },
    },
  },
});