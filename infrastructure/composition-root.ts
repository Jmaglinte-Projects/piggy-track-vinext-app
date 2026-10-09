import { PiggyTrackApplication } from "@/application/piggy-track-application";
import type { AuthGateway } from "@/application/ports/auth-gateway";
import type { PiggyTrackRepository } from "@/application/ports/piggy-track-repository";
import { LocalPiggyTrackRepository } from "@/infrastructure/repositories/local-piggy-track-repository";
import { SupabasePiggyTrackRepository } from "@/infrastructure/repositories/supabase-piggy-track-repository";
import { BrowserFarmPreferenceStore } from "@/infrastructure/storage/browser-farm-preference-store";
import { SupabaseAuthGateway } from "@/infrastructure/auth/supabase-auth-gateway";
import { isSupabaseConfigured } from "@/infrastructure/supabase/client";

export function createPiggyTrackApplication(): PiggyTrackApplication {
  const repository: PiggyTrackRepository = isSupabaseConfigured
    ? new SupabasePiggyTrackRepository()
    : new LocalPiggyTrackRepository();

  return new PiggyTrackApplication(repository, new BrowserFarmPreferenceStore());
}

export function createAuthGateway(): AuthGateway {
  return new SupabaseAuthGateway();
}
