import { createClient } from '@supabase/supabase-js';
import type{ Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// <Database> を渡すことで、戻り値のデータ型が自動的に決まります
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

