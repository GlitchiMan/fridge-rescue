"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CloudKitchen } from "@/lib/account/sync";
import { getSupabaseConfig } from "./config";

let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (client) return client;
  const config = getSupabaseConfig();
  if (!config) return null;
  client = createBrowserClient(config.url, config.key);
  return client;
}

export function createCloudKitchen(supabase: SupabaseClient, userId: string): CloudKitchen {
  return {
    async pull() {
      const { data, error } = await supabase.from("kitchen_states").select("data, revision").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data ? { data: data.data as unknown, revision: Number(data.revision) } : null;
    },
    async push(state, expectedRevision) {
      const { data, error } = await supabase.rpc("save_kitchen_state", { p_data: state, p_expected_revision: expectedRevision });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as { saved: boolean; new_revision: number | null } | undefined;
      if (!row) throw new Error("Empty save response");
      return { saved: row.saved, revision: row.new_revision === null ? null : Number(row.new_revision) };
    },
  };
}
