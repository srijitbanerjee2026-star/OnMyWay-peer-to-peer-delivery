import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://kxawdsdkarfxzhcrqetw.supabase.co';

const supabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YXdkc2RrYXJmeHpoY3JxZXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3MjMyODcsImV4cCI6MjA0MjI5OTI4N30.YOUR_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;