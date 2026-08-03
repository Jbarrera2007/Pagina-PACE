import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions
    ) => {
      if (provider !== "google") {
        return {
          error: new Error("Only Google auth is configured"),
        };
      }

      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            opts?.redirect_uri ??
            `${window.location.origin}/auth?next=/dashboard`,
          queryParams: {
            ...opts?.extraParams,
          },
        },
      });

      return result;
    },
  },
};