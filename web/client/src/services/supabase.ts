import { createClient } from '@supabase/supabase-js';

const meta = import.meta as unknown as { env?: Record<string, string> };

const supabaseUrl =
  meta.env?.VITE_SUPABASE_URL ||
  'https://kxawdsdkarfxzhcrqetw.supabase.co';

const supabaseAnonKey =
  meta.env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YXdkc2RrYXJmeHpoY3JxZXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MjE5NDksImV4cCI6MjEwNTI5Nzk0OX0.OgJSQQpz-A96CZCkBG9ra94x2JYNwPfxM2SuCJhvO2M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});