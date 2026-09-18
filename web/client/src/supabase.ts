import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxawdsdkarfxzhcrqetw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YXdkc2RrYXJmeHpoY3JxZXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MjE5NDksImV4cCI6MjEwNTI5Nzk0OX0.OgJSQQpz-A96CZCkBG9ra94x2JYNwPfxM2SuCJhvO2M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);