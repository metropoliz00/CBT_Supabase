import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uudpcksekqbpqccisowl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1ZHBja3Nla3FicHFjY2lzb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzM5OTgsImV4cCI6MjA4NzkwOTk5OH0.bHdyqn6eESR_SDvk5AzGeeZoKbklgTpUFGAQdtm0Z3M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
