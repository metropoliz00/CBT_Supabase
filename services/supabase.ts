import { createClient } from '@supabase/supabase-js';

const WORKING_SUPABASE_URL = 'https://uudpcksekqbpqccisowl.supabase.co';
const WORKING_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1ZHBja3Nla3FicHFjY2lzb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzM5OTgsImV4cCI6MjA4NzkwOTk5OH0.bHdyqn6eESR_SDvk5AzGeeZoKbklgTpUFGAQdtm0Z3M';

// Verify key belongs to the active project
const getValidKey = (key?: string): string => {
  if (!key) return WORKING_SUPABASE_ANON_KEY;
  try {
    const parts = key.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.ref === 'uudpcksekqbpqccisowl') {
        return key;
      }
    }
  } catch (e) {
    // ignore
  }
  return WORKING_SUPABASE_ANON_KEY;
};

const rawAnonKey = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_ANON_KEY)
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined);

const supabaseAnonKey = getValidKey(rawAnonKey);

const rawUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL)
  ? import.meta.env.VITE_SUPABASE_URL
  : (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined);

const targetBaseUrl = (rawUrl && !rawUrl.includes('ymihlditapicpcqronao'))
  ? rawUrl
  : WORKING_SUPABASE_URL;

// Resilient fetch wrapper with automatic proxy routing and fallback
const resilientFetch: typeof fetch = async (input, init) => {
  let primaryUrl = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
  const hasBrowserOrigin = typeof window !== 'undefined' && window.location && window.location.origin;

  // In browser/iframe, prefer routing REST requests through the server proxy /api/supabase
  if (hasBrowserOrigin && primaryUrl.startsWith(targetBaseUrl)) {
    primaryUrl = primaryUrl.replace(targetBaseUrl, `${window.location.origin}/api/supabase`);
  }

  try {
    const res = await fetch(primaryUrl, init);
    // If the proxy returns a server gateway error (502/503/504), fallback to direct URL
    if ((res.status === 502 || res.status === 503 || res.status === 504) && primaryUrl.includes('/api/supabase')) {
      const directUrl = primaryUrl.replace(/https?:\/\/[^/]+\/api\/supabase/, targetBaseUrl);
      return await fetch(directUrl, init);
    }
    return res;
  } catch (err) {
    // If network error on proxy, fallback to direct endpoint
    if (primaryUrl.includes('/api/supabase')) {
      const directUrl = primaryUrl.replace(/https?:\/\/[^/]+\/api\/supabase/, targetBaseUrl);
      return await fetch(directUrl, init);
    }
    throw err;
  }
};

export const supabase = createClient(targetBaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: resilientFetch,
  },
});

