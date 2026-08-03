import { supabase } from "./supabase";

export async function getMyActivities() {
  const {
    data,
    error,
  } = await supabase
    .from("activities")
    .select("*")
    .order("started_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}


export async function getMyWeeklyMetrics() {
  const {
    data,
    error,
  } = await supabase.rpc("get_my_weekly_metrics");

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}