import type { FarmPreferenceStore } from "@/application/ports/farm-preference-store";

const preferredFarmKey = "piggytrack-preferred-farm";

export class BrowserFarmPreferenceStore implements FarmPreferenceStore {
  getPreferredFarmId(): string | undefined {
    return window.localStorage.getItem(preferredFarmKey) ?? undefined;
  }

  setPreferredFarmId(farmId: string): void {
    window.localStorage.setItem(preferredFarmKey, farmId);
  }
}
