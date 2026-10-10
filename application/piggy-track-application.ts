import { validateInvestment } from "@/domain/investments";
import { WorkspaceAccessError } from "@/application/ports/piggy-track-repository";
import type { FarmPreferenceStore } from "@/application/ports/farm-preference-store";
import type {
  BatchInput,
  BuyerInput,
  ExpenseInput,
  InvestmentInput,
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
  private workspace: WorkspaceSnapshot | null = null;
  constructor(
    private readonly repository: PiggyTrackRepository,
    private readonly farmPreferenceStore: FarmPreferenceStore,
  ) {}

  async loadWorkspace(): Promise<WorkspaceSnapshot> {
    let workspace: WorkspaceSnapshot;
    try {
      workspace = await this.repository.loadWorkspace(
        this.farmPreferenceStore.getPreferredFarmId(),
      );
    } catch (cause) {
      if (!(cause instanceof WorkspaceAccessError)) throw cause;
      workspace = await this.repository.loadWorkspace();
    }
    this.farmPreferenceStore.setPreferredFarmId(workspace.farmId);
    this.workspace = workspace;
    return workspace;
  }

  async reloadWorkspace(): Promise<WorkspaceSnapshot> {
    const workspace = await this.repository.loadWorkspace();
    this.workspace = workspace;
    return workspace;
  }

  async switchFarm(farmId: string): Promise<WorkspaceSnapshot> {
    const workspace = await this.repository.loadWorkspace(farmId);
    this.farmPreferenceStore.setPreferredFarmId(workspace.farmId);
    this.workspace = workspace;
    return workspace;
  }

  async acceptFarmInvitation(code: string): Promise<WorkspaceSnapshot> {
    const farmId = await this.repository.acceptFarmInvitation(code);
    const workspace = await this.repository.loadWorkspace(farmId);
    this.farmPreferenceStore.setPreferredFarmId(workspace.farmId);
    this.workspace = workspace;
    return workspace;
  }

  createFarmInvitation(): Promise<FarmInvitation> {
    this.requireOwner();
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

  reconcilePigPurchases(batchId: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.reconcilePigPurchases(batchId));
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

  saveInvestment(input: InvestmentInput, id?: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => {
      validateInvestment(input);
      return this.repository.saveInvestment(input, id);
    });
  }

  deleteInvestment(id: string): Promise<WorkspaceSnapshot> {
    return this.executeAndReload(() => this.repository.deleteInvestment(id));
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

  private requireOwner(): void {
    if (this.workspace?.farmRole !== "Owner")
      throw new Error("This workspace is read-only. Only farm owners can modify data.");
  }

  private async executeAndReload(operation: () => Promise<unknown>): Promise<WorkspaceSnapshot> {
    this.requireOwner();
    await operation();
    return this.reloadWorkspace();
  }
}
