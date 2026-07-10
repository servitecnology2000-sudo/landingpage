import { createClient } from '@supabase/supabase-js';

// Use bracket notation so Vite does NOT statically inline these at build time.
// At runtime on Vercel Node.js, process.env has the real values set in the dashboard.
const _env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);

const supabaseUrl =
  _env['PUBLIC_SUPABASE_URL'] ||
  'https://mivsnmvupahgbrjfdyhl.supabase.co';

const supabaseAnonKey =
  _env['PUBLIC_SUPABASE_ANON_KEY'] ||
  '';

if (!supabaseAnonKey) {
  console.warn('[supabase] WARNING: PUBLIC_SUPABASE_ANON_KEY is not set. Storage and DB calls will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
