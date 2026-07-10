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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
