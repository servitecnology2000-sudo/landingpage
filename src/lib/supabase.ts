import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  (typeof process !== 'undefined' ? process.env.PUBLIC_SUPABASE_URL : null) ||
  import.meta.env.PUBLIC_SUPABASE_URL || 
  'https://mivsnmvupahgbrjfdyhl.supabase.co';

const supabaseAnonKey = 
  (typeof process !== 'undefined' ? process.env.PUBLIC_SUPABASE_ANON_KEY : null) ||
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 
  'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
