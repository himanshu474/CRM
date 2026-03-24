import { createClient } from "@supabase/supabase-js";
import { AppError } from "../utils/AppError.js";

/**
 * MUST use SERVICE ROLE KEY (backend only)
 */
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new AppError("Missing Supabase environment variables", 500);
}

/**
 * Singleton Supabase Client
 *  NEVER expose this to frontend
 */
export const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});