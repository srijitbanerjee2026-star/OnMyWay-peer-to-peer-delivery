import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// The anon key is public by design (it ships in every client); RLS on the project is what gates access.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://kxawdsdkarfxzhcrqetw.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YXdkc2RrYXJmeHpoY3JxZXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MjE5NDksImV4cCI6MjEwNTI5Nzk0OX0.OgJSQQpz-A96CZCkBG9ra94x2JYNwPfxM2SuCJhvO2M';

/** Sign-in is reg number + OTP handled by us, not Supabase Auth, so no session to persist. */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
