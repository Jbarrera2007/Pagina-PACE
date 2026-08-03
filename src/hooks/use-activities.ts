import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useActivities() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        setActivities([]);
      } else {
        setActivities(data ?? []);
      }

      setLoading(false);
    }

    loadActivities();
  }, []);

  return {
    activities,
    loading,
  };
}