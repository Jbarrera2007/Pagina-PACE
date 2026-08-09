import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Plus, Send, Sparkles, Square, User2 } from "lucide-react";
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

/** Renderizado ligero de markdown: negritas, listas y saltos de línea. */
function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
        const bullet = /^\s*[-*]\s+/.test(line);
        const clean = bullet ? line.replace(/^\s*[-*]\s+/, "") : line;
        const parts = clean.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={j} className="font-semibold text-foreground">
              {p.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{p}</span>
          ),
        );
        if (!clean.trim()) return <div key={i} className="h-1" />;
        return bullet ? (
          <div key={i} className="flex gap-2">
            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-primary" />
            <p>{rendered}</p>
          </div>
        ) : (
          <p key={i}>{rendered}</p>
        );
      })}
    </div>
  );
}

export function AiCoach() {
  const { user, session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("chat_conversations")
      .select("id, title")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setConversations(data ?? []);
        if (data && data.length > 0 && !activeId) setActiveId(data[0]!.id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!activeId) return;
    void supabase
      .from("chat_messages")
      .select("id, role, content")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages(
          (data ?? []).map((m) => ({
            id: m.id,
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        );
      });
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function ensureConversation(firstMessage: string) {
    if (activeId) return activeId;
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ user_id: user!.id, title: firstMessage.slice(0, 48) })
      .select("id, title")
      .single();
    if (error || !data) throw error ?? new Error("No se pudo crear la conversación");
    setConversations((c) => [data, ...c]);
    setActiveId(data.id);
    return data.id;
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    if (!user || !session) {
      toast.error("Inicia sesión para hablar con tu IA Coach");
      return;
    }

    setInput("");
    const history = [...messages, { id: crypto.randomUUID(), role: "user" as const, content }];
    setMessages(history);
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const conversationId = await ensureConversation(content);
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversationId,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.status === 429) throw new Error("Demasiadas peticiones. Prueba en unos segundos.");
      if (res.status === 402) throw new Error("Se han agotado los créditos de IA del espacio.");
      if (!res.ok || !res.body) {
  const detail = await res.text();

  let message = `Error ${res.status}`;

  try {
    const parsed = JSON.parse(detail);
    message =
      parsed?.error?.message ||
      parsed?.message ||
      parsed?.error ||
      detail ||
      message;
  } catch {
    if (detail) message = detail;
  }

  console.error("PACE IA /api/chat:", {
    status: res.status,
    detail,
  });

  throw new Error(message);
}
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) =>
          m.map((msg) => (msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg)),
        );
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toast.error(err instanceof Error ? err.message : "Error inesperado");
      setMessages((m) => m.filter((msg) => msg.id !== assistantId || msg.content.length > 0));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[260px_1fr]">
      {/* Historial */}
      <aside className="hidden rounded-3xl border border-border bg-surface/60 p-3 backdrop-blur-xl xl:block">
        <button
          onClick={() => {
            setActiveId(null);
            setMessages([]);
          }}
          className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm transition-colors hover:bg-secondary"
        >
          <Plus className="size-4" /> Nueva conversación
        </button>
        <p className="mt-4 px-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Historial
        </p>
        <div className="mt-2 space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full truncate rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                c.id === activeId
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {c.title}
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Todavía sin conversaciones.</p>
          )}
        </div>
      </aside>

      {/* Chat */}
      <section className="flex h-[calc(100svh-9rem)] min-h-[520px] flex-col rounded-3xl border border-border bg-surface/60 backdrop-blur-xl">
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">IA Coach</p>
            <p className="text-xs text-muted-foreground">
              {streaming ? "Escribiendo…" : "Entrenador profesional · siempre disponible"}
            </p>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-lg text-center">
              <span className="grid mx-auto size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Bot className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                Hola, soy tu entrenador
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Conozco tus entrenamientos, tu carga y tus objetivos. Pregúntame lo que quieras.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="rounded-xl border border-border bg-background/50 px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
              >
                {m.role === "assistant" && (
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Bot className="size-3.5" />
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background/50"
                  }`}
                >
                  {m.content ? (
                    <RichText text={m.content} />
                  ) : (
                    <span className="flex gap-1 py-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
                          className="size-1.5 rounded-full bg-muted-foreground"
                        />
                      ))}
                    </span>
                  )}
                </div>
                {m.role === "user" && (
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-secondary">
                    <User2 className="size-3.5" />
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta a tu entrenador…"
            className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          {streaming ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="grid size-11 place-items-center rounded-xl border border-border transition-colors hover:bg-secondary"
              aria-label="Detener"
            >
              <Square className="size-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-40"
              aria-label="Enviar"
            >
              <Send className="size-4" />
            </button>
          )}
        </form>
      </section>
    </div>
  );
}
