import { createClient } from "@supabase/supabase-js";
import "expo-sqlite/localStorage/install";
import "react-native-url-polyfill/auto";
import type { Database } from "./database.types";

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
