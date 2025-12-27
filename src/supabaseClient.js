import { createClient } from '@supabase/supabase-js';

// These names must start with VITE_ to be recognized by Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Check your Vercel/Local environment variables!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);