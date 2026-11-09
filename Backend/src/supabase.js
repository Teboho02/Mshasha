import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example)');
}

// Server-side client: the service role key bypasses RLS, so never expose it to the frontend
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Postgres error code for malformed input such as an invalid uuid
const INVALID_TEXT_REPRESENTATION = '22P02';

const isInvalidId = (error) => error?.code === INVALID_TEXT_REPRESENTATION;

export { supabase, isInvalidId };
export default supabase;
