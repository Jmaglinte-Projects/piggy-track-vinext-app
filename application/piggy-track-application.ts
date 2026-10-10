import type { FarmPreferenceStore } from "@/application/ports/farm-preference-store";
import type {
  BatchInput,
  BuyerInput,
  ExpenseInput,
  FarmInvitation,
  PaymentInput,
  PigInput,
  PiggyTrackRepository,
  SaleInput,
  WorkspaceSnapshot,
} from "@/application/ports/piggy-track-repository";

/**
 * Application boundary for PiggyTrack workflows.
 *
 * Presentation code talks to this class rather than coordinating repository
 * calls or browser persistence itself. Infrastructure is injected through
 * ports, keeping every workflow testable without React, Supabase, or a DOM.
 */
export class PiggyTrackApplication {
  constructor(
    private readonly repository: PiggyTrackRepository,
    private readonly farmPreferenceStore: FarmPreferenceStore,
  ) {}

  async loadWorkspace(): Promise<WorkspaceSnapshot> {
    const workspace = await this.repository.loadWorkspace(
      this.farmPreferenceStore.getPreferredFarmId(),
    );
    this.farmPreferenceStore.setPreferredFarmId(workspace.farmId);
    return workspace;
  }

  async reloadWorkspace(): Promise<WorkspaceSnapshot> {
    return this.repository.loadWorkspace();
  }

  async switchFarm(farmId: string): Promise<WorkspaceSnapshot> {
    const workspace = await this.repository.loadWorkspace(farmId);
    this.farmPreferenceStore.setPreferredFarmId(workspace.farmId);
    return workspace;
  }

  async acceptFarmInvitation(code: string): Promise<WorkspaceSnapshot> {
    const farmId = await this.repository.acceptFarmInvitation(code);
    const workspace = await this.repository.loadWorkspace(farmId);
    this.farmPreferenceStore.setPreferredFarmId(workspace.farmId);
    return workspace;
  }

  createFarmInvitation(): Promise<FarmInvitation> {
    return this.repository.createFarmInvitation();
  }

  renameFarm(name: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.renameFarm(name));
  }

  removeFarmMember(userId: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.removeFarmMember(userId));
  }

  saveBatch(input: BatchInput, id?: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.saveBatch(input, id));
  }

  deleteBatch(id: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.deleteBatch(id));
  }

  savePig(input: PigInput, id?: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.savePig(input, id));
  }

  deletePig(id: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.deletePig(id));
  }

  saveExpense(input: ExpenseInput, id?: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.saveExpense(input, id));
  }

  deleteExpense(id: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.deleteExpense(id));
  }

  saveBuyer(input: BuyerInput, id?: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.saveBuyer(input, id));
  }

  deleteBuyer(id: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.deleteBuyer(id));
  }

  saveSale(input: SaleInput, id?: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.saveSale(input, id));
  }

  deleteSale(id: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.deleteSale(id));
  }

  savePayment(input: PaymentInput, id?: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.savePayment(input, id));
  }

  deletePayment(id: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.deletePayment(id));
  }

  private async executeAndReload(operation: () => Promise<unknown>): Promise<WorkspaceSnapshot> {
    await operation();
    return this.repository.loadWorkspace();
  }
}
