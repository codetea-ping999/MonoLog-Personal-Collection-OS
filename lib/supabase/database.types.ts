export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          kind: "book" | "movie" | "music" | "game" | "other";
          status: "owned" | "wishlist" | "borrowed" | "archived";
          tags: string[];
          rating: number | null;
          note: string;
          image_path: string | null;
          wish_price_yen: number | null;
          source_url: string | null;
          priority: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          kind?: "book" | "movie" | "music" | "game" | "other";
          status?: "owned" | "wishlist" | "borrowed" | "archived";
          tags?: string[];
          rating?: number | null;
          note?: string;
          image_path?: string | null;
          wish_price_yen?: number | null;
          source_url?: string | null;
          priority?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          kind?: "book" | "movie" | "music" | "game" | "other";
          status?: "owned" | "wishlist" | "borrowed" | "archived";
          tags?: string[];
          rating?: number | null;
          note?: string;
          image_path?: string | null;
          wish_price_yen?: number | null;
          source_url?: string | null;
          priority?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      item_events: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          type: "purchase" | "sale" | "disposal" | "maintenance" | "use" | "modification" | "note";
          occurred_on: string;
          title: string;
          note: string;
          amount_yen: number | null;
          usage_reading: number | null;
          next_due_on: string | null;
          next_due_usage: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id: string;
          type: "purchase" | "sale" | "disposal" | "maintenance" | "use" | "modification" | "note";
          occurred_on?: string;
          title: string;
          note?: string;
          amount_yen?: number | null;
          usage_reading?: number | null;
          next_due_on?: string | null;
          next_due_usage?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string;
          type?: "purchase" | "sale" | "disposal" | "maintenance" | "use" | "modification" | "note";
          occurred_on?: string;
          title?: string;
          note?: string;
          amount_yen?: number | null;
          usage_reading?: number | null;
          next_due_on?: string | null;
          next_due_usage?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_events_item_owner_fkey";
            columns: ["item_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      record_item_transition: {
        Args: {
          p_item_id: string;
          p_type: "purchase" | "sale" | "disposal" | "maintenance" | "use" | "modification" | "note";
          p_occurred_on: string;
          p_title: string;
          p_amount_yen?: number | null;
          p_note?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      item_kind: "book" | "movie" | "music" | "game" | "other";
      item_status: "owned" | "wishlist" | "borrowed" | "archived";
      item_event_type: "purchase" | "sale" | "disposal" | "maintenance" | "use" | "modification" | "note";
    };
    CompositeTypes: Record<string, never>;
  };
};
