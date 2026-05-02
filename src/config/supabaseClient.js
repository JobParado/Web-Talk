import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL ="https://lbkfdzzctzgsmdnmyjxi.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_MsSoKbm33DAVez-zG7w2tQ_TQOx_FLa";


if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase credentials in config");
}

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);