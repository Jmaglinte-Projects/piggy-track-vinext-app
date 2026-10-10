import { validateInvestment } from "@/domain/investments";
import { mockData } from "@/infrastructure/local/mock-data";
import { calculateOutstandingBalance } from "@/domain/calculations";
import type {
  Batch,
  Buyer,
  Expense,
  FarmInvestment,
  Payment,
  Pig,
  PigSale,
  PiggyTrackData,
} from "@/domain/entities";
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

const storageKey = "piggytrack-demo-workspace-v2";
const farmNameKey = "piggytrack-demo-farm-name";

function now(): string {
  return new Date().toISOString();
}
function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function purchaseExpense(data: PiggyTrackData, pig: Pig): void {
  const existing = data.expenses.find((expense) => expense.pigId === pig.id);
  const expense: Expense = {
    id: existing?.id ?? newId("expense"),
    pigId: pig.id,
    batchId: pig.batchId,
    category: "Piglets",
    description: `Purchase of ${pig.tagNumber}`,
    quantity: 1,
    unit: "head",
    unitPrice: pig.purchasePrice,
    // Purchase date is not yet recorded on pigs; use batch start date.
    expenseDate:
      existing?.expenseDate ?? data.batches.find((batch) => batch.id === pig.batchId)!.startDate,
    notes:
      existing?.notes ??
      "Recorded automatically from pig purchase price. Date defaults to batch start date.",
  };
  data.expenses = existing
    ? data.expenses.map((item) => (item.id === existing.id ? expense : item))
    : [expense, ...data.expenses];
}

function readData(): PiggyTrackData {
  const stored = window.localStorage.getItem(storageKey);
  let data: PiggyTrackData;
  try {
    data = stored ? (JSON.parse(stored) as PiggyTrackData) : structuredClone(mockData);
  } catch {
    data = structuredClone(mockData);
  }
  data.investments ??= [];
  for (const batch of data.batches) {
    if (batch.purchaseCostsReconciled === undefined) {
      batch.purchaseCostsReconciled = !data.expenses.some(
        (expense) =>
          expense.batchId === batch.id &&
          expense.category === "Piglets" &&
          !expense.pigId &&
          !expense.superseded,
      );
    }
    if (batch.purchaseCostsReconciled) {
      for (const pig of data.pigs.filter((item) => item.batchId === batch.id)) {
        if (!data.expenses.some((expense) => expense.pigId === pig.id)) purchaseExpense(data, pig);
      }
    }
  }
  writeData(data);
  return data;
}

function writeData(data: PiggyTrackData): void {
  window.localStorage.setItem(storageKey, JSON.stringify(data));
}

export class LocalPiggyTrackRepository implements PiggyTrackRepository {
  async loadWorkspace(): Promise<WorkspaceSnapshot> {
    const farmName = window.localStorage.getItem(farmNameKey) ?? "Maglinte Family Piggery";
    return {
      farmId: "demo-farm",
      farmName,
      farmRole: "Owner",
      farms: [{ id: "demo-farm", name: farmName, role: "Owner" }],
      members: [
        {
          userId: "demo-user",
          email: "demo@piggytrack.local",
          role: "Owner",
          joinedAt: "2026-03-28T08:00:00+08:00",
        },
      ],
      data: readData(),
    };
  }

  async renameFarm(name: string): Promise<void> {
    window.localStorage.setItem(farmNameKey, name);
  }
  async createFarmInvitation(): Promise<FarmInvitation> {
    return {
      code: `DEMO${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
      expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    };
  }
  async acceptFarmInvitation(): Promise<string> {
    throw new Error("Joining a shared farm requires Supabase configuration.");
  }
  async removeFarmMember(): Promise<void> {
    throw new Error("The demo workspace has no removable family members.");
  }

  async saveBatch(input: BatchInput, id?: string): Promise<Batch> {
    const data = readData();
    const existing = id ? data.batches.find((item) => item.id === id) : undefined;
    const batch: Batch = {
      ...input,
      purchaseCostsReconciled: existing?.purchaseCostsReconciled ?? true,
      id: id ?? newId("batch"),
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };
    data.batches = existing
      ? data.batches.map((item) => (item.id === id ? batch : item))
      : [batch, ...data.batches];
    writeData(data);
    return batch;
  }

  async deleteBatch(id: string): Promise<void> {
    const data = readData();
    if (
      data.pigs.some((item) => item.batchId === id) ||
      data.expenses.some((item) => item.batchId === id)
    ) {
      throw new Error("This batch has records and cannot be deleted. Archive it instead.");
    }
    data.batches = data.batches.filter((item) => item.id !== id);
    writeData(data);
  }

  async reconcilePigPurchases(batchId: string): Promise<void> {
    const data = readData();
    const batch = data.batches.find((item) => item.id === batchId);
    if (!batch) throw new Error("Batch not found.");
    if (batch.purchaseCostsReconciled) return;
    data.expenses = data.expenses.map((expense) =>
      expense.batchId === batchId && expense.category === "Piglets" && !expense.pigId
        ? { ...expense, superseded: true }
        : expense,
    );
    batch.purchaseCostsReconciled = true;
    for (const pig of data.pigs.filter((item) => item.batchId === batchId))
      purchaseExpense(data, pig);
    writeData(data);
  }

  async savePig(input: PigInput, id?: string): Promise<Pig> {
    const data = readData();
    const existing = id ? data.pigs.find((item) => item.id === id) : undefined;
    if (id && !existing) throw new Error("Pig not found.");
    const batch = data.batches.find((item) => item.id === input.batchId);
    if (!batch) throw new Error("Batch not found.");
    if (!Number.isFinite(input.purchasePrice) || input.purchasePrice < 0)
      throw new Error("Purchase price must be zero or greater.");
    if (existing && existing.batchId !== input.batchId)
      throw new Error("A pig's purchase belongs to its original batch. Keep the original batch.");
    const pig: Pig = { ...input, id: id ?? newId("pig") };
    data.pigs = id ? data.pigs.map((item) => (item.id === id ? pig : item)) : [pig, ...data.pigs];
    if (batch.purchaseCostsReconciled) purchaseExpense(data, pig);
    writeData(data);
    return pig;
  }

  async deletePig(id: string): Promise<void> {
    const data = readData();
    if (data.sales.some((item) => item.pigId === id))
      throw new Error("A pig with a sale record cannot be deleted.");
    if (data.expenses.some((item) => item.pigId === id))
      throw new Error("This pig has a purchase expense. Mark it Removed to preserve its cost.");
    data.pigs = data.pigs.filter((item) => item.id !== id);
    writeData(data);
  }

  async saveExpense(input: ExpenseInput, id?: string): Promise<Expense> {
    const data = readData();
    const existing = id ? data.expenses.find((item) => item.id === id) : undefined;
    if (id && !existing) throw new Error("Expense not found.");
    if (existing?.pigId || existing?.superseded)
      throw new Error("Purchase history is protected. Edit the pig's purchase price instead.");
    if (
      input.category === "Piglets" &&
      (!existing ||
        existing.category !== "Piglets" ||
        existing.batchId !== input.batchId ||
        data.batches.find((batch) => batch.id === input.batchId)?.purchaseCostsReconciled)
    )
      throw new Error("Add pig purchase costs through Pigs to avoid counting them twice.");
    const expense: Expense = { ...input, id: id ?? newId("expense") };
    data.expenses = id
      ? data.expenses.map((item) => (item.id === id ? expense : item))
      : [expense, ...data.expenses];
    writeData(data);
    return expense;
  }

  async deleteExpense(id: string): Promise<void> {
    const data = readData();
    const expense = data.expenses.find((item) => item.id === id);
    if (expense?.pigId || expense?.superseded)
      throw new Error("Purchase history is protected. Edit the pig's purchase price instead.");
    data.expenses = data.expenses.filter((item) => item.id !== id);
    writeData(data);
  }

  async saveInvestment(input: InvestmentInput, id?: string): Promise<FarmInvestment> {
    validateInvestment(input);
    const data = readData();
    if (id && !data.investments.some((item) => item.id === id))
      throw new Error("Investment not found.");
    const investment = { ...input, id: id ?? newId("investment") };
    data.investments = id
      ? data.investments.map((item) => (item.id === id ? investment : item))
      : [investment, ...data.investments];
    writeData(data);
    return investment;
  }

  async deleteInvestment(id: string): Promise<void> {
    const data = readData();
    if (!data.investments.some((item) => item.id === id)) throw new Error("Investment not found.");
    data.investments = data.investments.filter((item) => item.id !== id);
    writeData(data);
  }

  async saveBuyer(input: BuyerInput, id?: string): Promise<Buyer> {
    const data = readData();
    const buyer: Buyer = { ...input, id: id ?? newId("buyer") };
    data.buyers = id
      ? data.buyers.map((item) => (item.id === id ? buyer : item))
      : [buyer, ...data.buyers];
    writeData(data);
    return buyer;
  }

  async deleteBuyer(id: string): Promise<void> {
    const data = readData();
    if (data.sales.some((sale) => sale.buyerId === id))
      throw new Error("A buyer with sale records cannot be deleted.");
    data.buyers = data.buyers.filter((item) => item.id !== id);
    writeData(data);
  }

  async saveSale(input: SaleInput, id?: string): Promise<PigSale> {
    const data = readData();
    const previousSale = id ? data.sales.find((item) => item.id === id) : undefined;
    const sale: PigSale = { ...input, id: id ?? newId("sale") };
    if (!id && data.sales.some((item) => item.pigId === input.pigId))
      throw new Error("This pig already has a sale record.");
    if (id && data.sales.some((item) => item.pigId === input.pigId && item.id !== id))
      throw new Error("This pig already has a sale record.");
    data.sales = id
      ? data.sales.map((item) => (item.id === id ? sale : item))
      : [sale, ...data.sales];
    if (previousSale && previousSale.pigId !== input.pigId)
      data.pigs = data.pigs.map((pig) =>
        pig.id === previousSale.pigId ? { ...pig, status: "Active" } : pig,
      );
    data.pigs = data.pigs.map((pig) =>
      pig.id === input.pigId ? { ...pig, status: "Sold", currentWeight: input.actualWeight } : pig,
    );
    writeData(data);
    return sale;
  }

  async deleteSale(id: string): Promise<void> {
    const data = readData();
    const sale = data.sales.find((item) => item.id === id);
    if (data.payments.some((payment) => payment.saleId === id))
      throw new Error("Delete the sale's payments first.");
    data.sales = data.sales.filter((item) => item.id !== id);
    if (sale)
      data.pigs = data.pigs.map((pig) =>
        pig.id === sale.pigId ? { ...pig, status: "Active" } : pig,
      );
    writeData(data);
  }

  async savePayment(input: PaymentInput, id?: string): Promise<Payment> {
    const data = readData();
    const sale = data.sales.find((item) => item.id === input.saleId);
    if (!sale) throw new Error("Sale not found.");
    const otherPayments = data.payments.filter((item) => item.id !== id);
    if (input.amount > calculateOutstandingBalance(sale, otherPayments))
      throw new Error("Payment exceeds the outstanding balance.");
    const payment: Payment = { ...input, id: id ?? newId("payment") };
    data.payments = id
      ? data.payments.map((item) => (item.id === id ? payment : item))
      : [payment, ...data.payments];
    writeData(data);
    return payment;
  }

  async deletePayment(id: string): Promise<void> {
    const data = readData();
    data.payments = data.payments.filter((item) => item.id !== id);
    writeData(data);
  }
}
