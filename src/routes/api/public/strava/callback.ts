import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/strava/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state") ?? "";
        const back = (msg: string) =>
          new Response(null, { status: 302, headers: { Location: `/dashboard?strava=${msg}` } });

        if (!code) return back("error");

        const { stravaEnv, verifyState, importStravaActivities } = await import("@/lib/strava.server");
        const { clientId, clientSecret } = stravaEnv();
        const userId = verifyState(state, clientSecret);
        if (!userId) return back("error");

        const res = await fetch("https://www.strava.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
          }),
        });
        if (!res.ok) {
          console.error(`Strava token [${res.status}]: ${await res.text()}`);
          return back("error");
        }
        const token = (await res.json()) as {
          access_token: string;
          refresh_token: string;
          expires_at: number;
          scope?: string;
          athlete?: { id: number };
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("strava_connections").upsert(
          {
            user_id: userId,
            athlete_id: token.athlete?.id ?? null,
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            expires_at: new Date(token.expires_at * 1000).toISOString(),
            scope: token.scope ?? null,
            last_sync_at: new Date().toISOString(),
          } as never,
          { onConflict: "user_id" },
        );
        if (error) {
          console.error(`Strava upsert: ${error.message}`);
          return back("error");
        }

        try {
          await importStravaActivities(userId, token.access_token);
        } catch (err) {
  console.error("Strava import error:", err);
  return back("import_error");
}

        return back("ok");
      },
    },
  },
});
