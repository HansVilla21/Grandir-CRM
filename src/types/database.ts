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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          cedula: string
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          cedula: string
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          cedula?: string
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bulletin_recipients: {
        Row: {
          bulletin_id: string
          created_at: string
          delivered: boolean
          email: string
          id: string
          investor_id: string
          opened: boolean
        }
        Insert: {
          bulletin_id: string
          created_at?: string
          delivered?: boolean
          email: string
          id?: string
          investor_id: string
          opened?: boolean
        }
        Update: {
          bulletin_id?: string
          created_at?: string
          delivered?: boolean
          email?: string
          id?: string
          investor_id?: string
          opened?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_recipients_bulletin_id_fkey"
            columns: ["bulletin_id"]
            isOneToOne: false
            referencedRelation: "bulletins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_recipients_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletins: {
        Row: {
          body: string
          created_at: string
          id: string
          sent_at: string | null
          sent_by: string
          status: Database["public"]["Enums"]["bulletin_status"]
          subject: string
          target_group: Database["public"]["Enums"]["bulletin_target"]
          target_plan_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sent_at?: string | null
          sent_by: string
          status?: Database["public"]["Enums"]["bulletin_status"]
          subject: string
          target_group: Database["public"]["Enums"]["bulletin_target"]
          target_plan_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sent_at?: string | null
          sent_by?: string
          status?: Database["public"]["Enums"]["bulletin_status"]
          subject?: string
          target_group?: Database["public"]["Enums"]["bulletin_target"]
          target_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulletins_target_plan_id_fkey"
            columns: ["target_plan_id"]
            isOneToOne: false
            referencedRelation: "investment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_beneficiaries: {
        Row: {
          beneficiary_id: string
          contract_id: string
          created_at: string
          id: string
          percentage: number | null
        }
        Insert: {
          beneficiary_id: string
          contract_id: string
          created_at?: string
          id?: string
          percentage?: number | null
        }
        Update: {
          beneficiary_id?: string
          contract_id?: string
          created_at?: string
          id?: string
          percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_beneficiaries_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_beneficiaries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documents: {
        Row: {
          contract_id: string
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_by: string | null
          uploaded_by_portal: string | null
          version: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_by?: string | null
          uploaded_by_portal?: string | null
          version?: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          type?: Database["public"]["Enums"]["document_type"]
          uploaded_by?: string | null
          uploaded_by_portal?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_uploaded_by_portal_fkey"
            columns: ["uploaded_by_portal"]
            isOneToOne: false
            referencedRelation: "contract_investors"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_investors: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          contract_id: string
          created_at: string
          id: string
          investor_id: string
          portal_token: string | null
          revision_comment: string | null
          role: Database["public"]["Enums"]["contract_investor_role"]
          token_expires_at: string | null
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          contract_id: string
          created_at?: string
          id?: string
          investor_id: string
          portal_token?: string | null
          revision_comment?: string | null
          role?: Database["public"]["Enums"]["contract_investor_role"]
          token_expires_at?: string | null
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          investor_id?: string
          portal_token?: string | null
          revision_comment?: string | null
          role?: Database["public"]["Enums"]["contract_investor_role"]
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_investors_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_investors_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          amount: number
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          parent_contract_id: string | null
          plan_id: string
          report_frequency_months: number
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          term_months: number
          updated_at: string
          version: number
        }
        Insert: {
          amount: number
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          parent_contract_id?: string | null
          plan_id: string
          report_frequency_months?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          term_months: number
          updated_at?: string
          version?: number
        }
        Update: {
          amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          parent_contract_id?: string | null
          plan_id?: string
          report_frequency_months?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          term_months?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "investment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_plans: {
        Row: {
          active: boolean
          annual_rate: number
          created_at: string
          description: string | null
          id: string
          min_amount: number
          name: string
          payment_structure: Json
          type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          annual_rate: number
          created_at?: string
          description?: string | null
          id?: string
          min_amount: number
          name: string
          payment_structure: Json
          type: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          annual_rate?: number
          created_at?: string
          description?: string | null
          id?: string
          min_amount?: number
          name?: string
          payment_structure?: Json
          type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      investor_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          investor_id: string
          is_primary: boolean
          verified: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          investor_id: string
          is_primary?: boolean
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          investor_id?: string
          is_primary?: boolean
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "investor_emails_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          cedula: string
          created_at: string
          full_name: string
          id: string
          phone: string | null
          referrer_id: string | null
          status: Database["public"]["Enums"]["investor_status"]
          updated_at: string
        }
        Insert: {
          cedula: string
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          referrer_id?: string | null
          status?: Database["public"]["Enums"]["investor_status"]
          updated_at?: string
        }
        Update: {
          cedula?: string
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          referrer_id?: string | null
          status?: Database["public"]["Enums"]["investor_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investors_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          contract_id: string | null
          created_at: string
          email_sent: boolean
          email_sent_at: string | null
          id: string
          investor_id: string | null
          read: boolean
          read_at: string | null
          recipient_user_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          body?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          contract_id?: string | null
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          investor_id?: string | null
          read?: boolean
          read_at?: string | null
          recipient_user_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          contract_id?: string | null
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          investor_id?: string | null
          read?: boolean
          read_at?: string | null
          recipient_user_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          receipt_path: string | null
          type: Database["public"]["Enums"]["payment_type"]
          updated_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date: string
          receipt_path?: string | null
          type: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          receipt_path?: string | null
          type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_commissions: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          id: string
          paid: boolean
          paid_at: string | null
          receipt_path: string | null
          referred_id: string
          referrer_id: string
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          receipt_path?: string | null
          referred_id: string
          referrer_id: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          receipt_path?: string | null
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          calculated_amount: number | null
          contract_id: string
          created_at: string
          description: string | null
          growth_rate: number
          id: string
          pdf_path: string | null
          period_end: string
          period_start: string
          sent_at: string | null
          sent_to: string[] | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          calculated_amount?: number | null
          contract_id: string
          created_at?: string
          description?: string | null
          growth_rate: number
          id?: string
          pdf_path?: string | null
          period_end: string
          period_start: string
          sent_at?: string | null
          sent_to?: string[] | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          calculated_amount?: number | null
          contract_id?: string
          created_at?: string
          description?: string | null
          growth_rate?: number
          id?: string
          pdf_path?: string | null
          period_end?: string
          period_start?: string
          sent_at?: string | null
          sent_to?: string[] | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_internal_user: { Args: never; Returns: boolean }
    }
    Enums: {
      approval_status: "pending" | "approved" | "revision_requested"
      bulletin_status: "draft" | "sent"
      bulletin_target: "all_active" | "all_inactive" | "by_plan" | "custom"
      contract_investor_role: "holder" | "co_investor"
      contract_status:
        | "draft"
        | "pending_approval"
        | "revision_requested"
        | "active"
        | "expired"
        | "cancelled"
      document_type:
        | "draft"
        | "signed_contract"
        | "deposit_receipt"
        | "disbursement_receipt"
        | "report"
        | "addendum"
      investor_status: "active" | "inactive"
      notification_channel: "internal" | "email" | "both"
      notification_type:
        | "approval"
        | "revision_request"
        | "new_application"
        | "report_due"
        | "contract_expiring"
        | "disbursement_due"
        | "process_delayed"
      payment_type: "deposit" | "withdrawal" | "commission"
      plan_type: "annual" | "monthly" | "semestral"
      report_status: "pending" | "generated" | "sent"
      user_role: "admin" | "assistant"
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
      approval_status: ["pending", "approved", "revision_requested"],
      bulletin_status: ["draft", "sent"],
      bulletin_target: ["all_active", "all_inactive", "by_plan", "custom"],
      contract_investor_role: ["holder", "co_investor"],
      contract_status: [
        "draft",
        "pending_approval",
        "revision_requested",
        "active",
        "expired",
        "cancelled",
      ],
      document_type: [
        "draft",
        "signed_contract",
        "deposit_receipt",
        "disbursement_receipt",
        "report",
        "addendum",
      ],
      investor_status: ["active", "inactive"],
      notification_channel: ["internal", "email", "both"],
      notification_type: [
        "approval",
        "revision_request",
        "new_application",
        "report_due",
        "contract_expiring",
        "disbursement_due",
        "process_delayed",
      ],
      payment_type: ["deposit", "withdrawal", "commission"],
      plan_type: ["annual", "monthly", "semestral"],
      report_status: ["pending", "generated", "sent"],
      user_role: ["admin", "assistant"],
    },
  },
} as const
