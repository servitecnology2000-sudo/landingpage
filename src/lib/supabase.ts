import { createClient } from '@supabase/supabase-js';

const _env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);

const supabaseUrl =
  _env['PUBLIC_SUPABASE_URL'] ||
  import.meta.env.PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  _env['PUBLIC_SUPABASE_ANON_KEY'] ||
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabaseServiceRoleKey =
  _env['SUPABASE_SERVICE_ROLE_KEY'] ||
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

// Cliente Supabase público
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

// Cliente Supabase Admin con Service Role Key (bypasses RLS server-side)
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : supabase;
