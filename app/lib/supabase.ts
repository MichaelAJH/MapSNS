import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Post {
  id: string;
  created_at: string;
  latitude: number;
  longitude: number;
  image_url: string;
  text: string;
  views: number;
  user_id: string;
}

export interface Comment {
  id: string;
  created_at: string;
  post_id: string;
  text: string;
  user_id: string;
} 