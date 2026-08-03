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
  setActivities(
    (data ?? []).map((a) => {
      const distanceKm = (a.distance_m ?? 0) / 1000;
      const paceSeconds = a.avg_pace_s_per_km ?? 0;

      return {
        id: a.id,
        title: a.name ?? "Entrenamiento",
        date: new Date(a.started_at).toLocaleDateString("es-ES"),
        distance: `${distanceKm.toFixed(2)} km`,
        distanceKm,
        pace:
          paceSeconds > 0
            ? `${Math.floor(paceSeconds / 60)}:${String(
                Math.round(paceSeconds % 60)
              ).padStart(2, "0")} /km`
            : "—",
        hr: a.avg_hr ?? 0,
        elevation: a.elevation_gain_m ?? 0,
        movingTime: a.moving_time_s ?? 0,
        effort: a.effort ?? "Moderado",
        raw: a,
      };
    })
  );
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