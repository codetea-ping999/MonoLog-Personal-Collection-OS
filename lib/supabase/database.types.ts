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
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      item_kind: "book" | "movie" | "music" | "game" | "other";
      item_status: "owned" | "wishlist" | "borrowed" | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
};
