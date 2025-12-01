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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ar_model: {
        Row: {
          created_at: string
          created_by_user_id: string
          description: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          model_name: string
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          model_name: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          model_name?: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      event_spot: {
        Row: {
          created_at: string
          event_id: string
          id: string
          order_in_event: number
          spot_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          order_in_event?: number
          spot_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          order_in_event?: number
          spot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_spot_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_spot_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spot_statistics"
            referencedColumns: ["spot_id"]
          },
          {
            foreignKeyName: "event_spot_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by_user: string | null
          description: string | null
          end_time: string | null
          id: string
          image_url: string | null
          is_public: boolean
          name: string
          organizer: string | null
          start_time: string | null
          status: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by_user?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          name: string
          organizer?: string | null
          start_time?: string | null
          status?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by_user?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          name?: string
          organizer?: string | null
          start_time?: string | null
          status?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      spot_visit: {
        Row: {
          event_id: string | null
          event_name_snapshot: string | null
          id: string
          latitude: number | null
          longitude: number | null
          spot_id: string
          spot_name_snapshot: string | null
          user_id: string
          visited_at: string
        }
        Insert: {
          event_id?: string | null
          event_name_snapshot?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          spot_id: string
          spot_name_snapshot?: string | null
          user_id: string
          visited_at?: string
        }
        Update: {
          event_id?: string | null
          event_name_snapshot?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          spot_id?: string
          spot_name_snapshot?: string | null
          user_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spot_visit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_visit_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spot_statistics"
            referencedColumns: ["spot_id"]
          },
          {
            foreignKeyName: "spot_visit_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      spots: {
        Row: {
          address: string
          ar_model_id: string | null
          category: string | null
          created_at: string
          created_by_user: string | null
          deleted_at: string | null
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          pin_color: string | null
          radius: number | null
          subtitle: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          ar_model_id?: string | null
          category?: string | null
          created_at?: string
          created_by_user?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          pin_color?: string | null
          radius?: number | null
          subtitle?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          ar_model_id?: string | null
          category?: string | null
          created_at?: string
          created_by_user?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          pin_color?: string | null
          radius?: number | null
          subtitle?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spots_ar_model_id_fkey"
            columns: ["ar_model_id"]
            isOneToOne: false
            referencedRelation: "ar_model"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string
          email: string
          gender: number | null
          id: string
          is_active: boolean
          last_login_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          email: string
          gender?: number | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string
          gender?: number | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      spot_statistics: {
        Row: {
          category: string | null
          is_active: boolean | null
          last_visited: string | null
          name: string | null
          spot_id: string | null
          total_visits: number | null
          unique_visitors: number | null
        }
        Relationships: []
      }
      user_event_progress: {
        Row: {
          completion_percentage: number | null
          event_id: string | null
          event_name: string | null
          last_visit: string | null
          total_spots: number | null
          total_visits: number | null
          user_id: string | null
          visited_spots: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spot_visit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      view_user_profile_with_age: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string | null
          current_age: number | null
          email: string | null
          gender: number | null
          id: string | null
          is_active: boolean | null
          last_login_at: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string | null
          current_age?: never
          email?: string | null
          gender?: number | null
          id?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string | null
          current_age?: never
          email?: string | null
          gender?: number | null
          id?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_invitation: { Args: { p_email: string }; Returns: Json }
      create_invitation: {
        Args: {
          p_email: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      expire_old_invitations: { Args: never; Returns: number }
      get_invitations: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          invited_by_email: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      set_user_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: Json
      }
      update_event_spots_transaction: {
        Args: { p_event_id: string; p_spot_ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "user" | "admin"
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
      user_role: ["user", "admin"],
    },
  },
} as const
