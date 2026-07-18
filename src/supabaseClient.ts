import { createClient } from '@supabase/supabase-js'

import { supabaseSecretKey, supabaseUrl } from './config.js'

// Server-side only client, built with the secret (service role) key — never send this key to the browser.
const supabase = supabaseUrl && supabaseSecretKey
    ? createClient(supabaseUrl, supabaseSecretKey, { auth: { persistSession: false } })
    : null

export default supabase
