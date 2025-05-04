import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables', { 
    hasUrl: !!supabaseUrl, 
    hasKey: !!supabaseAnonKey 
  });
}

// Create and export the Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
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

// Log connection status
console.log('Supabase client initialized:', { 
  url: supabaseUrl.substring(0, 20) + '...',
  connected: !!supabase
});

export default supabase; 