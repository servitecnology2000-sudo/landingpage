import { createClient } from '@supabase/supabase-js';

const _env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);

const supabaseUrl =
  _env['PUBLIC_SUPABASE_URL'] ||
  import.meta.env.PUBLIC_SUPABASE_URL ||
  'https://mivsnmvupahgbrjfdyhl.supabase.co';

const supabaseAnonKey =
  _env['PUBLIC_SUPABASE_ANON_KEY'] ||
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdnNubXZ1cGFoZ2JyamZkeWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NDIzMjcsImV4cCI6MjA5OTIxODMyN30.aj9zXGTF6FwjpKmkfTIbfxN3USS3gHIxpP4GB38XNAw';

const supabaseServiceRoleKey =
  _env['SUPABASE_SERVICE_ROLE_KEY'] ||
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role key if available (bypasses RLS policies server-side)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : supabase;
