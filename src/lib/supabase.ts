import { createClient } from '@supabase/supabase-js';

const _env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);

const supabaseUrl =
  _env['PUBLIC_SUPABASE_URL'] ||
  import.meta.env.PUBLIC_SUPABASE_URL ||
  'https://mivsnmvupahgbrjfdyhl.supabase.co';

const supabaseAnonKey =
  _env['PUBLIC_SUPABASE_ANON_KEY'] ||
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
