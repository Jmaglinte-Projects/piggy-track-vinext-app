export interface FarmPreferenceStore {
  getPreferredFarmId(): string | undefined;
  setPreferredFarmId(farmId: string): void;
}
