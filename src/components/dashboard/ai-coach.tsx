import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bot,
  Plus,
  Send,
  Sparkles,
  Square,
  User2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
}

const SUGGESTIONS = [
  "Analiza mi carga de las últimas 4 semanas",
  "Diseña una semana para bajar de 40' en 10K",
  "¿Debería descansar hoy o hacer series?",
  "Cómo mejorar mi cadencia sin perder ritmo",
];

/**
 * Renderizado ligero de markdown:
 * - Negritas
 * - Listas
 * - Saltos de línea
 */
function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
        const bullet = /^\s*[-*]\s+/.test(line);

        const clean = bullet
          ? line.replace(/^\s*[-*]\s+/, "")
          : line;

        const parts = clean.split(
          /(\*\*[^*]+\*\*)/g,
        );

        const rendered = parts.map((part, j) => {
          if (
            part.startsWith("**") &&
            part.endsWith("**")
          ) {
            return (
              <strong key={j}>
                {part.slice(2, -2)}
              </strong>
            );
          }

          return (
            <span key={j}>
              {part}
            </span>
          );
        });

        if (!clean.trim()) {
          return (
            <div
              key={i}
              className="h-1"
            />
          );
        }

        if (bullet) {
          return (
            <div
              key={i}
              className="flex gap-2"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current" />

              <div>{rendered}</div>
            </div>
          );
        }

        return (
          <div key={i}>
            {rendered}
          </div>
        );
      })}
    </div>
  );
}

export function AiCoach() {
  const { user, session } = useAuth();

  const [
    conversations,
    setConversations,
  ] = useState<Conversation[]>([]);

  const [
    activeId,
    setActiveId,
  ] = useState<string | null>(null);

  const [
    messages,
    setMessages,
  ] = useState<Msg[]>([]);

  const [
    input,
    setInput,
  ] = useState("");

  const [
    streaming,
    setStreaming,
  ] = useState(false);

  const abortRef =
    useRef<AbortController | null>(null);

  const bottomRef =
    useRef<HTMLDivElement | null>(null);

  // -----------------------------------------
  // CARGAR CONVERSACIONES
  // -----------------------------------------

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setActiveId(null);
      setMessages([]);
      return;
    }

    void supabase
      .from("chat_conversations")
      .select("id, title")
      .order("updated_at", {
        ascending: false,
      })
      .then(({ data, error }) => {
        if (error) {
          console.error(
            "Error cargando conversaciones:",
            error,
          );

          toast.error(
            "No se pudieron cargar las conversaciones.",
          );

          return;
        }

        const rows: Conversation[] =
          (data ?? []).map(
            (conversation) => ({
              id: conversation.id,
              title:
                conversation.title ||
                "Nueva conversación",
            }),
          );

        setConversations(rows);

        if (
          rows.length > 0 &&
          !activeId
        ) {
          setActiveId(rows[0]!.id);
        }
      });

    // No queremos volver a cargar
    // todas las conversaciones cuando cambia activeId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // -----------------------------------------
  // CARGAR MENSAJES
  // -----------------------------------------

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    void supabase
      .from("chat_messages")
      .select(
        "id, role, content",
      )
      .eq(
        "conversation_id",
        activeId,
      )
      .order("created_at", {
        ascending: true,
      })
      .then(({ data, error }) => {
        if (error) {
          console.error(
            "Error cargando mensajes:",
            error,
          );

          toast.error(
            "No se pudieron cargar los mensajes.",
          );

          return;
        }

        const loadedMessages: Msg[] =
          (data ?? []).map(
            (message) => ({
              id: message.id,
              role:
                message.role ===
                "assistant"
                  ? "assistant"
                  : "user",
              content:
                message.content ?? "",
            }),
          );

        setMessages(
          loadedMessages,
        );
      });
  }, [activeId]);

  // -----------------------------------------
  // SCROLL AUTOMÁTICO
  // -----------------------------------------

  useEffect(() => {
    bottomRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      },
    );
  }, [messages, streaming]);

  // -----------------------------------------
  // CREAR CONVERSACIÓN
  // -----------------------------------------

  async function ensureConversation(
    firstMessage: string,
  ): Promise<string> {
    if (activeId) {
      return activeId;
    }

    if (!user) {
      throw new Error(
        "Debes iniciar sesión para crear una conversación.",
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from("chat_conversations")
      .insert({
        user_id: user.id,
        title:
          firstMessage.slice(0, 48),
      })
      .select("id, title")
      .single();

    if (error || !data) {
      throw (
        error ??
        new Error(
          "No se pudo crear la conversación.",
        )
      );
    }

    const conversation: Conversation =
      {
        id: data.id,
        title:
          data.title ||
          "Nueva conversación",
      };

    setConversations(
      (current) => [
        conversation,
        ...current,
      ],
    );

    setActiveId(data.id);

    return data.id;
  }

  // -----------------------------------------
  // ENVIAR MENSAJE
  // -----------------------------------------

  async function send(
    text: string,
  ) {
    const content =
      text.trim();

    if (
      !content ||
      streaming
    ) {
      return;
    }

    if (
      !user ||
      !session
    ) {
      toast.error(
        "Inicia sesión para hablar con tu IA Coach",
      );

      return;
    }

    setInput("");

    const userMessage: Msg =
      {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };

    const history = [
      ...messages,
      userMessage,
    ];

    setMessages(history);
    setStreaming(true);

    const assistantId =
      crypto.randomUUID();

    setMessages(
      (current) => [
        ...current,
        {
          id: assistantId,
          role: "assistant",
          content: "",
        },
      ],
    );

    const controller =
      new AbortController();

    abortRef.current =
      controller;

    try {
      // -------------------------------------
      // CONVERSACIÓN
      // -------------------------------------

      const conversationId =
        await ensureConversation(
          content,
        );

      // -------------------------------------
      // API
      // -------------------------------------

      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",
            signal:
              controller.signal,
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(
              {
                conversationId,
                messages:
                  history.map(
                    (message) => ({
                      role:
                        message.role,
                      content:
                        message.content,
                    }),
                  ),
              },
            ),
          },
        );

      // -------------------------------------
      // ERRORES HTTP
      // -------------------------------------

      if (
        response.status ===
        401
      ) {
        throw new Error(
          "Sesión no autorizada. Vuelve a iniciar sesión.",
        );
      }

      if (
        response.status ===
        429
      ) {
        throw new Error(
          "Demasiadas peticiones. Prueba en unos segundos.",
        );
      }

      if (
        response.status ===
        402
      ) {
        throw new Error(
          "Se han agotado los créditos de IA del espacio.",
        );
      }

      if (
        !response.ok ||
        !response.body
      ) {
        const detail =
          await response.text();

        let message =
          `Error ${response.status}`;

        try {
          const parsed =
            JSON.parse(
              detail,
            );

          message =
            parsed?.error
              ?.message ||
            parsed?.message ||
            parsed?.error ||
            detail ||
            message;
        } catch {
          if (detail) {
            message =
              detail;
          }
        }

        console.error(
          "PACE IA /api/chat:",
          {
            status:
              response.status,
            detail,
          },
        );

        throw new Error(
          message,
        );
      }

      // -------------------------------------
      // STREAM
      // -------------------------------------

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      while (true) {
        const {
          done,
          value,
        } =
          await reader.read();

        if (done) {
          break;
        }

        const chunk =
          decoder.decode(
            value,
            {
              stream: true,
            },
          );

        if (!chunk) {
          continue;
        }

        setMessages(
          (current) =>
            current.map(
              (message) =>
                message.id ===
                assistantId
                  ? {
                      ...message,
                      content:
                        message.content +
                        chunk,
                    }
                  : message,
            ),
        );
      }

      // Decodificar cualquier contenido
      // pendiente del TextDecoder.
      const finalChunk =
        decoder.decode();

      if (finalChunk) {
        setMessages(
          (current) =>
            current.map(
              (message) =>
                message.id ===
                assistantId
                  ? {
                      ...message,
                      content:
                        message.content +
                        finalChunk,
                    }
                  : message,
            ),
        );
      }
    } catch (err) {
      console.error(
        "========== PACE IA ERROR ==========",
      );

      console.error(
        "Error completo:",
        err,
      );

      console.error(
        "Tipo:",
        typeof err,
      );

      console.error(
        "Mensaje:",
        err instanceof Error
          ? err.message
          : String(err),
      );

      console.error(
        "Stack:",
        err instanceof Error
          ? err.stack
          : "sin stack",
      );

      console.error(
        "====================================",
      );

      if (
        err instanceof Error &&
        err.name ===
          "AbortError"
      ) {
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : typeof err ===
              "string"
            ? err
            : "Error desconocido";

      toast.error(
        message ||
          "Error desconocido",
      );

      setMessages(
        (current) =>
          current.filter(
            (msg) =>
              msg.id !==
                assistantId ||
              msg.content
                .length > 0,
          ),
      );
    } finally {
      setStreaming(false);
      abortRef.current =
        null;
    }
  }

  // -----------------------------------------
  // NUEVA CONVERSACIÓN
  // -----------------------------------------

  function handleNewConversation() {
    if (streaming) {
      abortRef.current?.abort();
    }

    setActiveId(null);
    setMessages([]);
    setInput("");
  }

  // -----------------------------------------
  // RENDER
  // -----------------------------------------

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* -------------------------------------
          HISTORIAL
      ------------------------------------- */}

      <aside className="rounded-3xl border border-border bg-surface/60 p-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={
            handleNewConversation
          }
          className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm transition-colors hover:bg-secondary"
        >
          <Plus className="size-4" />

          Nueva conversación
        </button>

        <div className="mt-4">
          <p className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Historial
          </p>

          <div className="mt-2 space-y-1">
            {conversations.map(
              (conversation) => (
                <button
                  type="button"
                  key={
                    conversation.id
                  }
                  onClick={() =>
                    setActiveId(
                      conversation.id,
                    )
                  }
                  className={`w-full truncate rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    conversation.id ===
                    activeId
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  {
                    conversation.title
                  }
                </button>
              ),
            )}

            {conversations.length ===
              0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                Todavía sin
                conversaciones.
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* -------------------------------------
          CHAT
      ------------------------------------- */}

      <section className="flex h-[calc(100svh-9rem)] min-h-[520px] flex-col rounded-3xl border border-border bg-surface/60 backdrop-blur-xl">
        {/* HEADER */}

        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </span>

          <div>
            <p className="text-sm font-semibold">
              IA Coach
            </p>

            <p className="text-xs text-muted-foreground">
              {streaming
                ? "Escribiendo…"
                : "Entrenador profesional · siempre disponible"}
            </p>
          </div>
        </header>

        {/* MENSAJES */}

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
          {/* ESTADO INICIAL */}

          {messages.length ===
            0 && (
            <div className="mx-auto max-w-lg text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Bot className="size-5" />
              </span>

              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                Hola, soy tu
                entrenador
              </h3>

              <p className="mt-1.5 text-sm text-muted-foreground">
                Conozco tus
                entrenamientos,
                tu carga y tus
                objetivos.
                Pregúntame lo que
                quieras.
              </p>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map(
                  (suggestion) => (
                    <button
                      type="button"
                      key={
                        suggestion
                      }
                      onClick={() =>
                        void send(
                          suggestion,
                        )
                      }
                      className="rounded-xl border border-border bg-background/50 px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      {
                        suggestion
                      }
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* MENSAJES */}

          <AnimatePresence initial={false}>
            {messages.map(
              (message) => (
                <motion.div
                  key={
                    message.id
                  }
                  initial={{
                    opacity: 0,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.35,
                    ease: [
                      0.16,
                      1,
                      0.3,
                      1,
                    ],
                  }}
                  className={`flex gap-3 ${
                    message.role ===
                    "user"
                      ? "justify-end"
                      : ""
                  }`}
                >
                  {message.role ===
                    "assistant" && (
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                      <Bot className="size-3.5" />
                    </span>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role ===
                      "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background/50"
                    }`}
                  >
                    {message.content ? (
                      <RichText
                        text={
                          message.content
                        }
                      />
                    ) : (
                      <span className="flex gap-1 py-1">
                        {[0, 1, 2].map(
                          (i) => (
                            <motion.span
                              key={i}
                              animate={{
                                opacity:
                                  [
                                    0.2,
                                    1,
                                    0.2,
                                  ],
                              }}
                              transition={{
                                duration:
                                  1.1,
                                repeat:
                                  Infinity,
                                delay:
                                  i *
                                  0.15,
                              }}
                              className="size-1.5 rounded-full bg-muted-foreground"
                            />
                          ),
                        )}
                      </span>
                    )}
                  </div>

                  {message.role ===
                    "user" && (
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-secondary">
                      <User2 className="size-3.5" />
                    </span>
                  )}
                </motion.div>
              ),
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* INPUT */}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <input
            value={input}
            onChange={(event) =>
              setInput(
                event.target.value,
              )
            }
            disabled={!user || streaming}
            placeholder={
              user
                ? "Pregunta a tu entrenador…"
                : "Inicia sesión para hablar con tu entrenador"
            }
            className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          />

          {streaming ? (
            <button
              type="button"
              onClick={() =>
                abortRef.current?.abort()
              }
              className="grid size-11 place-items-center rounded-xl border border-border transition-colors hover:bg-secondary"
              aria-label="Detener respuesta"
            >
              <Square className="size-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={
                !input.trim() ||
                !user ||
                !session
              }
              className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Enviar mensaje"
            >
              <Send className="size-4" />
            </button>
          )}
        </form>
      </section>
    </div>
  );
}