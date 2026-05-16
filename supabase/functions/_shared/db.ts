/// <reference path="./remote-modules.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config } from "./config.ts";

export const db = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
