export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.15'
  }
  public: {
    Tables: {
      purchases: {
        Row: {
          gifter_name: string
          id: string
          item_id: string
          purchased_at: string
        }
        Insert: {
          gifter_name: string
          id?: string
          item_id: string
          purchased_at?: string
        }
        Update: {
          gifter_name?: string
          id?: string
          item_id?: string
          purchased_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'purchases_item_id_fkey'
            columns: ['item_id']
            isOneToOne: true
            referencedRelation: 'wishlist_items'
            referencedColumns: ['id']
          },
        ]
      }
      wishlist_items: {
        Row: {
          added_at: string
          id: string
          image: string
          note: string | null
          price: number
          priority: string
          retailer: string
          title: string
          url: string
          wishlist_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          image: string
          note?: string | null
          price?: number
          priority: string
          retailer: string
          title: string
          url: string
          wishlist_id: string
        }
        Update: {
          added_at?: string
          id?: string
          image?: string
          note?: string | null
          price?: number
          priority?: string
          retailer?: string
          title?: string
          url?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'wishlist_items_wishlist_id_fkey'
            columns: ['wishlist_id']
            isOneToOne: false
            referencedRelation: 'wishlists'
            referencedColumns: ['id']
          },
        ]
      }
      wishlists: {
        Row: {
          cover: string
          created_at: string
          event_date: string | null
          id: string
          note: string | null
          occasion: string
          owner_id: string
          owner_name: string
          share_id: string
          title: string
        }
        Insert: {
          cover: string
          created_at?: string
          event_date?: string | null
          id?: string
          note?: string | null
          occasion: string
          owner_id: string
          owner_name: string
          share_id: string
          title: string
        }
        Update: {
          cover?: string
          created_at?: string
          event_date?: string | null
          id?: string
          note?: string | null
          occasion?: string
          owner_id?: string
          owner_name?: string
          share_id?: string
          title?: string
        }
        Relationships: []
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
