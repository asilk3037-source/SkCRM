import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// All SkCRM tables live in the dedicated `skcrm` Postgres schema, isolated
// from other apps sharing the same Supabase project.
export const db = supabase.schema('skcrm')
