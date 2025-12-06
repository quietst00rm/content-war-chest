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
      engagement_posts: {
        Row: {
          ai_comment: string | null
          ai_comment_generated_at: string | null
          author_name: string | null
          author_profile_image_url: string | null
          author_profile_url: string | null
          author_title: string | null
          commented_at: string | null
          comments: number
          content: string
          created_at: string
          days_ago: number
          fetched_at: string
          id: string
          is_commented: boolean
          is_hidden: boolean
          likes: number
          linkedin_post_id: string | null
          linkedin_post_url: string
          posted_ago_text: string | null
          posted_at: string | null
          profile_id: string
          shares: number
          updated_at: string
          user_comment: string | null
          user_id: string
        }
        Insert: {
          ai_comment?: string | null
          ai_comment_generated_at?: string | null
          author_name?: string | null
          author_profile_image_url?: string | null
          author_profile_url?: string | null
          author_title?: string | null
          commented_at?: string | null
          comments?: number
          content: string
          created_at?: string
          days_ago?: number
          fetched_at?: string
          id?: string
          is_commented?: boolean
          is_hidden?: boolean
          likes?: number
          linkedin_post_id?: string | null
          linkedin_post_url: string
          posted_ago_text?: string | null
          posted_at?: string | null
          profile_id: string
          shares?: number
          updated_at?: string
          user_comment?: string | null
          user_id: string
        }
        Update: {
          ai_comment?: string | null
          ai_comment_generated_at?: string | null
          author_name?: string | null
          author_profile_image_url?: string | null
          author_profile_url?: string | null
          author_title?: string | null
          commented_at?: string | null
          comments?: number
          content?: string
          created_at?: string
          days_ago?: number
          fetched_at?: string
          id?: string
          is_commented?: boolean
          is_hidden?: boolean
          likes?: number
          linkedin_post_id?: string | null
          linkedin_post_url?: string
          posted_ago_text?: string | null
          posted_at?: string | null
          profile_id?: string
          shares?: number
          updated_at?: string
          user_comment?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "followed_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      followed_profiles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_fetched_at: string | null
          linkedin_url: string
          name: string | null
          notes: string | null
          profile_image_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_fetched_at?: string | null
          linkedin_url: string
          name?: string | null
          notes?: string | null
          profile_image_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_fetched_at?: string | null
          linkedin_url?: string
          name?: string | null
          notes?: string | null
          profile_image_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          character_count: number | null
          content: string
          created_at: string | null
          folder_id: string | null
          formatted_content: string
          id: string
          is_favorite: boolean | null
          is_used: boolean | null
          notes: string | null
          primary_category: string
          source_section: string | null
          subcategory: string | null
          summary: string | null
          tags: string[] | null
          target_audience: string | null
          title: string
          updated_at: string | null
          usage_count: number | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          character_count?: number | null
          content: string
          created_at?: string | null
          folder_id?: string | null
          formatted_content: string
          id?: string
          is_favorite?: boolean | null
          is_used?: boolean | null
          notes?: string | null
          primary_category: string
          source_section?: string | null
          subcategory?: string | null
          summary?: string | null
          tags?: string[] | null
          target_audience?: string | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          character_count?: number | null
          content?: string
          created_at?: string | null
          folder_id?: string | null
          formatted_content?: string
          id?: string
          is_favorite?: boolean | null
          is_used?: boolean | null
          notes?: string | null
          primary_category?: string
          source_section?: string | null
          subcategory?: string | null
          summary?: string | null
          tags?: string[] | null
          target_audience?: string | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
