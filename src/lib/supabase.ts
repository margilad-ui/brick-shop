import { createClient } from '@supabase/supabase-js'

// Project connection. Values come from .env.production (committed; the anon key is public by design).
// A different project can be pointed at from the device by saving {url, key} under localStorage "bs_cfg".
function cfg() {
  try {
    const raw = localStorage.getItem('bs_cfg')
    if (raw) { const c = JSON.parse(raw); if (c.url && c.key) return c as { url: string; key: string } }
  } catch { /* ignore */ }
  return { url: import.meta.env.VITE_SUPABASE_URL as string, key: import.meta.env.VITE_SUPABASE_ANON_KEY as string }
}
export const SB = cfg()
export const supabase = createClient(SB.url || 'https://invalid.supabase.co', SB.key || 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
export const configured = !!(SB.url && SB.key && SB.key !== 'missing')
