export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          avg_cadence: number | null
          avg_hr: number | null
          avg_pace_s_per_km: number | null
          avg_power: number | null
          avg_speed_ms: number | null
          calories: number | null
          created_at: string
          distance_m: number
          elapsed_time_s: number | null
          elevation_gain_m: number | null
          external_id: string | null
          id: string
          max_hr: number | null
          moving_time_s: number
          name: string
          raw: Json | null
          source: string
          sport_type: string
          started_at: string
          suffer_score: number | null
          training_load: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_cadence?: number | null
          avg_hr?: number | null
          avg_pace_s_per_km?: number | null
          avg_power?: number | null
          avg_speed_ms?: number | null
          calories?: number | null
          created_at?: string
          distance_m?: number
          elapsed_time_s?: number | null
          elevation_gain_m?: number | null
          external_id?: string | null
          id?: string
          max_hr?: number | null
          moving_time_s?: number
          name?: string
          raw?: Json | null
          source?: string
          sport_type?: string
          started_at: string
          suffer_score?: number | null
          training_load?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_cadence?: number | null
          avg_hr?: number | null
          avg_pace_s_per_km?: number | null
          avg_power?: number | null
          avg_speed_ms?: number | null
          calories?: number | null
          created_at?: string
          distance_m?: number
          elapsed_time_s?: number | null
          elevation_gain_m?: number | null
          external_id?: string | null
          id?: string
          max_hr?: number | null
          moving_time_s?: number
          name?: string
          raw?: Json | null
          source?: string
          sport_type?: string
          started_at?: string
          suffer_score?: number | null
          training_load?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_analysis: {
        Row: {
          activity_id: string | null
          created_at: string
          details: Json | null
          id: string
          kind: string
          model: string | null
          summary: string
          title: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          kind?: string
          model?: string | null
          summary: string
          title: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          kind?: string
          model?: string | null
          summary?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current_value: number
          due_date: string | null
          goal_type: string
          id: string
          label: string
          status: Database["public"]["Enums"]["goal_status"]
          target_value: number | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          due_date?: string | null
          goal_type?: string
          id?: string
          label: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          due_date?: string | null
          goal_type?: string
          id?: string
          label?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          meta: Json | null
          scope: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          meta?: Json | null
          scope: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          meta?: Json | null
          scope?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string
          activity_id: string | null
          created_at: string
          distance_key: string
          id: string
          time_s: number
          user_id: string
        }
        Insert: {
          achieved_at?: string
          activity_id?: string | null
          created_at?: string
          distance_key: string
          id?: string
          time_s: number
          user_id: string
        }
        Update: {
          achieved_at?: string
          activity_id?: string | null
          created_at?: string
          distance_key?: string
          id?: string
          time_s?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_sessions: {
        Row: {
          activity_id: string | null
          completed: boolean
          created_at: string
          description: string | null
          id: string
          plan_id: string
          scheduled_on: string | null
          target_distance_m: number | null
          target_pace_s_per_km: number | null
          title: string
          user_id: string
          week_number: number
        }
        Insert: {
          activity_id?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          plan_id: string
          scheduled_on?: string | null
          target_distance_m?: number | null
          target_pace_s_per_km?: number | null
          title: string
          user_id: string
          week_number: number
        }
        Update: {
          activity_id?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          plan_id?: string
          scheduled_on?: string | null
          target_distance_m?: number | null
          target_pace_s_per_km?: number | null
          title?: string
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          full_name: string | null
          gender: string | null
          height_cm: number | null
          id: string
          locale: string
          max_hr: number | null
          resting_hr: number | null
          updated_at: string
          vo2max: number | null
          weekly_target_km: number | null
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          height_cm?: number | null
          id: string
          locale?: string
          max_hr?: number | null
          resting_hr?: number | null
          updated_at?: string
          vo2max?: number | null
          weekly_target_km?: number | null
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          locale?: string
          max_hr?: number | null
          resting_hr?: number | null
          updated_at?: string
          vo2max?: number | null
          weekly_target_km?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      race_predictions: {
        Row: {
          computed_at: string
          confidence: number | null
          distance_key: string
          id: string
          model: string | null
          predicted_time_s: number
          user_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: number | null
          distance_key: string
          id?: string
          model?: string | null
          predicted_time_s: number
          user_id: string
        }
        Update: {
          computed_at?: string
          confidence?: number | null
          distance_key?: string
          id?: string
          model?: string | null
          predicted_time_s?: number
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          ai_autoanalysis: boolean
          email_notifications: boolean
          locale: string
          push_notifications: boolean
          theme: string
          units: string
          updated_at: string
          user_id: string
          weekly_report: boolean
        }
        Insert: {
          ai_autoanalysis?: boolean
          email_notifications?: boolean
          locale?: string
          push_notifications?: boolean
          theme?: string
          units?: string
          updated_at?: string
          user_id: string
          weekly_report?: boolean
        }
        Update: {
          ai_autoanalysis?: boolean
          email_notifications?: boolean
          locale?: string
          push_notifications?: boolean
          theme?: string
          units?: string
          updated_at?: string
          user_id?: string
          weekly_report?: boolean
        }
        Relationships: []
      }
      strava_connections: {
        Row: {
          access_token: string
          athlete_id: number | null
          created_at: string
          expires_at: string
          id: string
          last_sync_at: string | null
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          athlete_id?: number | null
          created_at?: string
          expires_at: string
          id?: string
          last_sync_at?: string | null
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          athlete_id?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          last_sync_at?: string | null
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_plans: {
        Row: {
          created_at: string
          generated_by_ai: boolean
          goal_race: string | null
          id: string
          is_active: boolean
          level: string | null
          name: string
          starts_on: string | null
          target_time_s: number | null
          updated_at: string
          user_id: string
          weeks: number
        }
        Insert: {
          created_at?: string
          generated_by_ai?: boolean
          goal_race?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name: string
          starts_on?: string | null
          target_time_s?: number | null
          updated_at?: string
          user_id: string
          weeks?: number
        }
        Update: {
          created_at?: string
          generated_by_ai?: boolean
          goal_race?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name?: string
          starts_on?: string | null
          target_time_s?: number | null
          updated_at?: string
          user_id?: string
          weeks?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          created_at: string
          fatigue: number | null
          fitness: number | null
          form: number | null
          id: string
          summary: string | null
          total_distance_m: number
          total_elevation_m: number
          total_time_s: number
          training_load: number
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          fatigue?: number | null
          fitness?: number | null
          form?: number | null
          id?: string
          summary?: string | null
          total_distance_m?: number
          total_elevation_m?: number
          total_time_s?: number
          training_load?: number
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          fatigue?: number | null
          fitness?: number | null
          form?: number | null
          id?: string
          summary?: string | null
          total_distance_m?: number
          total_elevation_m?: number
          total_time_s?: number
          training_load?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "coach" | "admin"
      goal_status: "active" | "completed" | "abandoned"
      plan_tier: "free" | "pro" | "elite"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "coach", "admin"],
      goal_status: ["active", "completed", "abandoned"],
      plan_tier: ["free", "pro", "elite"],
    },
  },
} as const
