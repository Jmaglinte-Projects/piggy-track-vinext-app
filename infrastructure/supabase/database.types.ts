export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<
  Row extends Record<string, unknown>,
  Insert extends Record<string, unknown>,
  Update extends Record<string, unknown>,
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type AuditFields = { created_at: string; updated_at: string };

export interface Database {
  public: {
    Tables: {
      farm_audit_log: Table<
        {
          id: number;
          farm_id: string;
          actor_user_id: string | null;
          table_name: string;
          record_id: string;
          action: "INSERT" | "UPDATE" | "DELETE";
          occurred_at: string;
          old_data: Json | null;
          new_data: Json | null;
        },
        Record<string, never>,
        Record<string, never>
      >;
      farm_investments: Table<
        {
          id: string;
          farm_id: string;
          name: string;
          category: string;
          amount: number;
          investment_date: string;
          notes: string;
        } & AuditFields,
        {
          id?: string;
          farm_id: string;
          name: string;
          category: string;
          amount: number;
          investment_date: string;
          notes?: string;
        },
        {
          name?: string;
          category?: string;
          amount?: number;
          investment_date?: string;
          notes?: string;
        }
      >;
      farms: Table<
        { id: string; name: string } & AuditFields,
        { id?: string; name: string; created_at?: string; updated_at?: string },
        { name?: string; updated_at?: string }
      >;
      farm_members: Table<
        { farm_id: string; user_id: string; role: "Owner" | "Viewer"; created_at: string },
        { farm_id: string; user_id: string; role: "Owner" | "Viewer"; created_at?: string },
        { role?: "Owner" | "Viewer" }
      >;
      farm_invitations: Table<
        {
          id: string;
          farm_id: string;
          code_hash: string;
          expires_at: string;
          used_at: string | null;
          used_by: string | null;
          created_by: string;
          created_at: string;
        },
        {
          id?: string;
          farm_id: string;
          code_hash: string;
          expires_at: string;
          used_at?: string | null;
          used_by?: string | null;
          created_by: string;
          created_at?: string;
        },
        { expires_at?: string; used_at?: string | null; used_by?: string | null }
      >;
      batches: Table<
        {
          id: string;
          farm_id: string;
          name: string;
          start_date: string;
          purchase_costs_reconciled: boolean;
          end_date: string | null;
          status: "Active" | "Completed" | "Archived";
          notes: string;
        } & AuditFields,
        {
          id?: string;
          farm_id: string;
          name: string;
          start_date: string;
          end_date?: string | null;
          status?: "Active" | "Completed" | "Archived";
          notes?: string;
        },
        {
          name?: string;
          start_date?: string;
          end_date?: string | null;
          status?: "Active" | "Completed" | "Archived";
          notes?: string;
        }
      >;
      pigs: Table<
        {
          id: string;
          farm_id: string;
          batch_id: string;
          tag_number: string;
          purchase_price: number;
          purchase_weight: number;
          current_weight: number;
          status: "Active" | "Sold" | "Died" | "Removed";
          notes: string;
        } & AuditFields,
        {
          id?: string;
          farm_id: string;
          batch_id: string;
          tag_number: string;
          purchase_price: number;
          purchase_weight: number;
          current_weight: number;
          status?: "Active" | "Sold" | "Died" | "Removed";
          notes?: string;
        },
        {
          batch_id?: string;
          tag_number?: string;
          purchase_price?: number;
          purchase_weight?: number;
          current_weight?: number;
          status?: "Active" | "Sold" | "Died" | "Removed";
          notes?: string;
        }
      >;
      expenses: Table<
        {
          id: string;
          farm_id: string;
          batch_id: string;
          category: string;
          description: string;
          quantity: number;
          unit: string;
          unit_price: number;
          expense_date: string;
          notes: string;
          feed_type: string | null;
          pig_id: string | null;
          superseded: boolean;
        } & AuditFields,
        {
          id?: string;
          farm_id: string;
          batch_id: string;
          category: string;
          description: string;
          quantity: number;
          unit: string;
          unit_price: number;
          expense_date: string;
          notes?: string;
          feed_type?: string | null;
        },
        {
          batch_id?: string;
          category?: string;
          description?: string;
          quantity?: number;
          unit?: string;
          unit_price?: number;
          expense_date?: string;
          notes?: string;
          feed_type?: string | null;
        }
      >;
      buyers: Table<
        {
          id: string;
          farm_id: string;
          name: string;
          contact_information: string;
          notes: string;
        } & AuditFields,
        {
          id?: string;
          farm_id: string;
          name: string;
          contact_information?: string;
          notes?: string;
        },
        { name?: string; contact_information?: string; notes?: string }
      >;
      pig_sales: Table<
        {
          id: string;
          farm_id: string;
          batch_id: string;
          pig_id: string;
          buyer_id: string;
          actual_weight: number;
          weight_deduction: number;
          price_per_kg: number;
          sale_date: string;
          payment_due_date: string;
          notes: string;
        } & AuditFields,
        {
          id?: string;
          farm_id: string;
          batch_id: string;
          pig_id: string;
          buyer_id: string;
          actual_weight: number;
          weight_deduction?: number;
          price_per_kg: number;
          sale_date: string;
          payment_due_date: string;
          notes?: string;
        },
        {
          buyer_id?: string;
          actual_weight?: number;
          weight_deduction?: number;
          price_per_kg?: number;
          sale_date?: string;
          payment_due_date?: string;
          notes?: string;
        }
      >;
      payments: Table<
        {
          id: string;
          farm_id: string;
          sale_id: string;
          amount: number;
          payment_date: string;
          payment_method: "Cash" | "Bank Transfer" | "GCash" | "Other";
          notes: string;
        } & AuditFields,
        {
          id?: string;
          farm_id: string;
          sale_id: string;
          amount: number;
          payment_date: string;
          payment_method: "Cash" | "Bank Transfer" | "GCash" | "Other";
          notes?: string;
        },
        {
          amount?: number;
          payment_date?: string;
          payment_method?: "Cash" | "Bank Transfer" | "GCash" | "Other";
          notes?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      reconcile_pig_purchases: { Args: { target_batch_id: string }; Returns: undefined };
      list_my_farms: {
        Args: Record<string, never>;
        Returns: Array<{ id: string; name: string; role: "Owner" | "Viewer" }>;
      };
      ensure_farm_workspace: { Args: Record<string, never>; Returns: string };
      create_farm: { Args: { farm_name: string }; Returns: string };
      record_pig_sale: {
        Args: {
          target_sale_id: string | null;
          target_farm_id: string;
          target_batch_id: string;
          target_pig_id: string;
          target_buyer_id: string;
          target_actual_weight: number;
          target_weight_deduction: number;
          target_price_per_kg: number;
          target_sale_date: string;
          target_payment_due_date: string;
          target_notes: string;
        };
        Returns: string;
      };
      delete_pig_sale: { Args: { target_sale_id: string }; Returns: undefined };
      record_payment: {
        Args: {
          target_payment_id: string | null;
          target_farm_id: string;
          target_sale_id: string;
          target_amount: number;
          target_payment_date: string;
          target_payment_method: string;
          target_notes: string;
        };
        Returns: string;
      };
      create_farm_invitation: {
        Args: { target_farm_id: string; validity_days?: number };
        Returns: Json;
      };
      accept_farm_invitation: { Args: { invitation_code: string }; Returns: string };
      list_farm_members: {
        Args: { target_farm_id: string };
        Returns: Array<{ user_id: string; email: string; role: string; joined_at: string }>;
      };
      remove_farm_member: {
        Args: { target_farm_id: string; target_user_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
