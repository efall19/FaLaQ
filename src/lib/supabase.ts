import { createClient } from '@supabase/supabase-js';

// Accept the project URL even if it was pasted as the REST endpoint
// (https://xxx.supabase.co/rest/v1/) or with stray spaces / a trailing slash.
const url = (import.meta.env.VITE_SUPABASE_URL ?? '')
  .trim()
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
// Either the new "publishable" key (sb_publishable_…) or the legacy "anon" key works.
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/** False until the two Supabase environment variables are set. */
export const isConfigured = Boolean(url && key);

export const supabase = createClient(url || 'http://localhost:54321', key || 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true },
});
