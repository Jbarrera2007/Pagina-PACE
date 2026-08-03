import * as React from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Workout {
  id: string;
  title: string;
  date: string;
  distance: string;
  pace: string;
  hr: number;
  effort: string;
}


function formatPace(seconds:number){

  const min=Math.floor(seconds/60);
  const sec=Math.round(seconds%60);

  return `${min}:${String(sec).padStart(2,"0")}`;

}


export function useWorkouts(userId:string){

  const [workouts,setWorkouts]=useState<Workout[]>([]);
  const [loading,setLoading]=useState(true);


  useEffect(()=>{

    async function load(){

      const {data,error}=await supabase
        .from("activities")
        .select(`
          id,
          name,
          started_at,
          distance_m,
          avg_pace_s_per_km,
          avg_hr,
          effort
        `)
        .eq("user_id",userId)
        .order("started_at",{ascending:false})
        .limit(20);


      if(error){
        console.error(error);
        return;
      }


      const parsed=(data ?? []).map((w)=>({

        id:w.id,

        title:w.name ?? "Entrenamiento",

        date:new Date(w.started_at)
          .toLocaleDateString("es-ES"),


        distance:
          `${(w.distance_m/1000).toFixed(1)} km`,


        pace:
          formatPace(w.avg_pace_s_per_km)
          +" /km",


        hr:w.avg_hr ?? 0,

        effort:w.effort ?? "Moderado"

      }));


      setWorkouts(parsed);

      setLoading(false);

    }


    load();

  },[userId]);


  return {
    workouts,
    loading
  };

}