import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for browser-side use
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zscifcljgkzltnxrlzlp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzY2lmY2xqZ2t6bHRueHJsemxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2OTkyNTMsImV4cCI6MjA2MTI3NTI1M30.0vGkxX-SNI8UBYbRzEPL37ycbANhQY0mVcXrBPVwYTk';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey
    },
  },
  // Set longer timeouts for API calls
  db: {
    schema: 'public'
  }
});

export default supabase; 