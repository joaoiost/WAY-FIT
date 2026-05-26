import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://mpgfigjvsuddqvfxcmmp.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ2ZpZ2p2c3VkZHF2ZnhjbW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTI1NjQsImV4cCI6MjA5NTE2ODU2NH0.e1XT_aCClzR8L5aHUNkvwUu-ouJJp7z4Ebq0elmg0Yc';

export const supabase = createClient(url, key);
export const hasSupabase = true;
