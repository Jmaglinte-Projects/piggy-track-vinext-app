import { isSupabaseConfigured } from "@/lib/supabase/client";
import { LocalPiggyTrackRepository } from "@/services/local-repository";
import type { PiggyTrackRepository } from "@/services/piggy-track-repository";
import { SupabasePiggyTrackRepository } from "@/services/supabase-repository";

export function createRepository(): PiggyTrackRepository {
  return isSupabaseConfigured ? new SupabasePiggyTrackRepository() : new LocalPiggyTrackRepository();
}
