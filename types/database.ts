export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      answers: {
        Row: {
          ai_points: number | null
          ai_response: string | null
          answer_text: string
          created_at: string | null
          id: string
          player_id: string
          turn_id: string
          vote_points: number | null
        }
        Insert: {
          ai_points?: number | null
          ai_response?: string | null
          answer_text: string
          created_at?: string | null
          id?: string
          player_id: string
          turn_id: string
          vote_points?: number | null
        }
        Update: {
          ai_points?: number | null
          ai_response?: string | null
          answer_text?: string
          created_at?: string | null
          id?: string
          player_id?: string
          turn_id?: string
          vote_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_turn_id_fkey"
            columns: ["turn_id"]
            isOneToOne: false
            referencedRelation: "turns"
            referencedColumns: ["id"]
          },
        ]
      }
      decider_history: {
        Row: {
          created_at: string | null
          id: string
          player_id: string
          round_id: string
          turn_number: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id: string
          round_id: string
          turn_number: number
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: string
          round_id?: string
          turn_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "decider_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decider_history_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      game_statistics: {
        Row: {
          id: string
          last_updated: string | null
          players_participated: number
          rooms_created: number
        }
        Insert: {
          id?: string
          last_updated?: string | null
          players_participated?: number
          rooms_created?: number
        }
        Update: {
          id?: string
          last_updated?: string | null
          players_participated?: number
          rooms_created?: number
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string | null
          has_been_decider: boolean | null
          id: string
          is_host: boolean | null
          nickname: string
          room_id: string
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          has_been_decider?: boolean | null
          id?: string
          is_host?: boolean | null
          nickname: string
          room_id: string
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          has_been_decider?: boolean | null
          id?: string
          is_host?: boolean | null
          nickname?: string
          room_id?: string
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string | null
          current_round: number | null
          current_turn: number | null
          expires_at: string | null
          game_status: string | null
          host_id: string | null
          id: string
          room_code: string
          round_voting_phase: boolean | null
          time_limit: number
          total_rounds: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_round?: number | null
          current_turn?: number | null
          expires_at?: string | null
          game_status?: string | null
          host_id?: string | null
          id?: string
          room_code: string
          round_voting_phase?: boolean | null
          time_limit: number
          total_rounds: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_round?: number | null
          current_turn?: number | null
          expires_at?: string | null
          game_status?: string | null
          host_id?: string | null
          id?: string
          room_code?: string
          round_voting_phase?: boolean | null
          time_limit?: number
          total_rounds?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          created_at: string | null
          current_turn: number | null
          id: string
          is_complete: boolean | null
          remaining_deciders: number | null
          room_id: string
          round_number: number
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_turn?: number | null
          id?: string
          is_complete?: boolean | null
          remaining_deciders?: number | null
          room_id: string
          round_number: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_turn?: number | null
          id?: string
          is_complete?: boolean | null
          remaining_deciders?: number | null
          room_id?: string
          round_number?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          created_at: string | null
          id: string
          is_custom: boolean
          scenario_text: string
          turn_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_custom?: boolean
          scenario_text: string
          turn_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_custom?: boolean
          scenario_text?: string
          turn_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_turn_id_fkey"
            columns: ["turn_id"]
            isOneToOne: false
            referencedRelation: "turns"
            referencedColumns: ["id"]
          },
        ]
      }
      turns: {
        Row: {
          category: string | null
          context: string | null
          decider_id: string
          id: string
          round_id: string
          scenario_id: string | null
          status: Database["public"]["Enums"]["turn_status"] | null
          turn_number: number
        }
        Insert: {
          category?: string | null
          context?: string | null
          decider_id: string
          id?: string
          round_id: string
          scenario_id?: string | null
          status?: Database["public"]["Enums"]["turn_status"] | null
          turn_number: number
        }
        Update: {
          category?: string | null
          context?: string | null
          decider_id?: string
          id?: string
          round_id?: string
          scenario_id?: string | null
          status?: Database["public"]["Enums"]["turn_status"] | null
          turn_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "turns_decider_id_fkey"
            columns: ["decider_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turns_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turns_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          answer_id: string
          created_at: string | null
          id: string
          voter_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string | null
          id?: string
          voter_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string | null
          id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_rooms: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      turn_status:
        | "selecting_category"
        | "selecting_scenario"
        | "answering"
        | "voting"
        | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      turn_status: [
        "selecting_category",
        "selecting_scenario",
        "answering",
        "voting",
        "completed",
      ],
    },
  },
} as const
