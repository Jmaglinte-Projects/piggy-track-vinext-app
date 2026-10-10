import { getSupabaseClient } from "@/infrastructure/supabase/client";
import type {
  Batch,
  Buyer,
  Expense,
  ExpenseCategory,
  FeedType,
  Payment,
  Pig,
  PigSale,
  PiggyTrackData,
} from "@/domain/entities";
import type { Database } from "@/infrastructure/supabase/database.types";
import type {
  BatchInput,
  BuyerInput,
  ExpenseInput,
  FarmInvitation,
  FarmMember,
  FarmRole,
  FarmWorkspace,
  PaymentInput,
  PigInput,
  PiggyTrackRepository,
  SaleInput,
  WorkspaceSnapshot,
} from "@/application/ports/piggy-track-repository";

type BatchRow = Database["public"]["Tables"]["batches"]["Row"];
type PigRow = Database["public"]["Tables"]["pigs"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];

function fail(message: string, error: { message: string } | null): never {
  throw new Error(error ? `${message}: ${error.message}` : message);
}

function mapBatch(row: BatchRow): Batch {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPig(row: PigRow): Pig {
  return {
    id: row.id,
    batchId: row.batch_id,
    tagNumber: row.tag_number,
    purchasePrice: Number(row.purchase_price),
    purchaseWeight: Number(row.purchase_weight),
    currentWeight: Number(row.current_weight),
    status: row.status,
    notes: row.notes,
  };
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    batchId: row.batch_id,
    category: row.category as ExpenseCategory,
    description: row.description,
    quantity: Number(row.quantity),
    unit: row.unit,
    unitPrice: Number(row.unit_price),
    expenseDate: row.expense_date,
    notes: row.notes,
    ...(row.feed_type ? { feedType: row.feed_type as FeedType } : {}),
  };
}

export class SupabasePiggyTrackRepository implements PiggyTrackRepository {
  private farmId: string | null = null;

  async loadWorkspace(requestedFarmId?: string): Promise<WorkspaceSnapshot> {
    const client = getSupabaseClient();
    let membershipResult = await client.from("farm_members").select("farm_id, role");
    if (membershipResult.error) fail("Unable to load farm membership", membershipResult.error);
    if (!membershipResult.data?.length) {
      const created = await client.rpc("create_farm", { farm_name: "My Piggery" });
      if (created.error || !created.data)
        fail("Unable to create your farm workspace", created.error);
      membershipResult = await client.from("farm_members").select("farm_id, role");
      if (membershipResult.error)
        fail("Unable to load new farm membership", membershipResult.error);
    }
    const memberships = membershipResult.data ?? [];
    const farmIds = memberships.map((membership) => membership.farm_id);
    const farmsResult = await client.from("farms").select("id, name").in("id", farmIds);
    if (farmsResult.error) fail("Unable to load farm workspaces", farmsResult.error);
    const farms: FarmWorkspace[] = memberships.map((membership) => ({
      id: membership.farm_id,
      name:
        farmsResult.data?.find((farm) => farm.id === membership.farm_id)?.name ?? "Farm workspace",
      role: membership.role,
    }));
    const farmId = farms.some((farm) => farm.id === requestedFarmId)
      ? (requestedFarmId as string)
      : farms.some((farm) => farm.id === this.farmId)
        ? (this.farmId as string)
        : farms[0]?.id;
    if (!farmId) throw new Error("No farm workspace is available.");
    this.farmId = farmId;

    const [
      farmResult,
      batchesResult,
      pigsResult,
      expensesResult,
      buyersResult,
      salesResult,
      paymentsResult,
      membersResult,
    ] = await Promise.all([
      client.from("farms").select("*").eq("id", farmId).single(),
      client
        .from("batches")
        .select("*")
        .eq("farm_id", farmId)
        .order("start_date", { ascending: false }),
      client.from("pigs").select("*").eq("farm_id", farmId),
      client
        .from("expenses")
        .select("*")
        .eq("farm_id", farmId)
        .order("expense_date", { ascending: false }),
      client.from("buyers").select("*").eq("farm_id", farmId),
      client.from("pig_sales").select("*").eq("farm_id", farmId),
      client.from("payments").select("*").eq("farm_id", farmId),
      client.rpc("list_farm_members", { target_farm_id: farmId }),
    ]);
    const firstError = [
      farmResult,
      batchesResult,
      pigsResult,
      expensesResult,
      buyersResult,
      salesResult,
      paymentsResult,
      membersResult,
    ].find((result) => result.error)?.error;
    if (firstError) fail("Unable to load farm records", firstError);

    const data: PiggyTrackData = {
      batches: (batchesResult.data ?? []).map(mapBatch),
      pigs: (pigsResult.data ?? []).map(mapPig),
      expenses: (expensesResult.data ?? []).map(mapExpense),
      buyers: (buyersResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        contactInformation: row.contact_information,
        notes: row.notes,
      })),
      sales: (salesResult.data ?? []).map((row) => ({
        id: row.id,
        pigId: row.pig_id,
        batchId: row.batch_id,
        buyerId: row.buyer_id,
        actualWeight: Number(row.actual_weight),
        weightDeduction: Number(row.weight_deduction),
        pricePerKg: Number(row.price_per_kg),
        saleDate: row.sale_date,
        paymentDueDate: row.payment_due_date,
        notes: row.notes,
      })),
      payments: (paymentsResult.data ?? []).map((row) => ({
        id: row.id,
        saleId: row.sale_id,
        amount: Number(row.amount),
        paymentDate: row.payment_date,
        paymentMethod: row.payment_method,
        notes: row.notes,
      })),
    };
    const members: FarmMember[] = (membersResult.data ?? []).map((member) => ({
      userId: member.user_id,
      email: member.email,
      role: member.role as FarmRole,
      joinedAt: member.joined_at,
    }));
    return {
      farmId,
      farmName: farmResult.data?.name ?? "My Piggery",
      farmRole: farms.find((farm) => farm.id === farmId)?.role ?? "Member",
      farms,
      members,
      data,
    };
  }

  async renameFarm(name: string): Promise<void> {
    const result = await getSupabaseClient()
      .from("farms")
      .update({ name })
      .eq("id", this.requireFarmId())
      .select("id")
      .single();
    if (result.error || !result.data) fail("Unable to rename farm", result.error);
  }

  async createFarmInvitation(): Promise<FarmInvitation> {
    const result = await getSupabaseClient().rpc("create_farm_invitation", {
      target_farm_id: this.requireFarmId(),
      validity_days: 7,
    });
    if (
      result.error ||
      !result.data ||
      typeof result.data !== "object" ||
      Array.isArray(result.data)
    )
      fail("Unable to create invitation", result.error);
    const code = result.data.code;
    const expiresAt = result.data.expires_at;
    if (typeof code !== "string" || typeof expiresAt !== "string")
      throw new Error("Invitation response was invalid.");
    return { code, expiresAt };
  }

  async acceptFarmInvitation(code: string): Promise<string> {
    const result = await getSupabaseClient().rpc("accept_farm_invitation", {
      invitation_code: code,
    });
    if (result.error || !result.data) fail("Unable to join farm", result.error);
    this.farmId = result.data;
    return result.data;
  }

  async removeFarmMember(userId: string): Promise<void> {
    const result = await getSupabaseClient().rpc("remove_farm_member", {
      target_farm_id: this.requireFarmId(),
      target_user_id: userId,
    });
    if (result.error) fail("Unable to remove family member", result.error);
  }

  async saveBatch(input: BatchInput, id?: string): Promise<Batch> {
    const client = getSupabaseClient();
    const payload = {
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      status: input.status,
      notes: input.notes,
    };
    const result = id
      ? await client.from("batches").update(payload).eq("id", id).select().single()
      : await client
          .from("batches")
          .insert({ ...payload, farm_id: this.requireFarmId() })
          .select()
          .single();
    if (result.error || !result.data) fail("Unable to save batch", result.error);
    return mapBatch(result.data);
  }

  async deleteBatch(id: string): Promise<void> {
    await this.remove("batches", id, "Unable to delete batch");
  }

  async savePig(input: PigInput, id?: string): Promise<Pig> {
    const client = getSupabaseClient();
    const payload = {
      batch_id: input.batchId,
      tag_number: input.tagNumber,
      purchase_price: input.purchasePrice,
      purchase_weight: input.purchaseWeight,
      current_weight: input.currentWeight,
      status: input.status,
      notes: input.notes,
    };
    const result = id
      ? await client.from("pigs").update(payload).eq("id", id).select().single()
      : await client
          .from("pigs")
          .insert({ ...payload, farm_id: this.requireFarmId() })
          .select()
          .single();
    if (result.error || !result.data) fail("Unable to save pig", result.error);
    return mapPig(result.data);
  }

  async deletePig(id: string): Promise<void> {
    await this.remove("pigs", id, "Unable to delete pig");
  }

  async saveExpense(input: ExpenseInput, id?: string): Promise<Expense> {
    const client = getSupabaseClient();
    const payload = {
      batch_id: input.batchId,
      category: input.category,
      description: input.description,
      quantity: input.quantity,
      unit: input.unit,
      unit_price: input.unitPrice,
      expense_date: input.expenseDate,
      notes: input.notes,
      feed_type: input.category === "Feed" ? (input.feedType ?? null) : null,
    };
    const result = id
      ? await client.from("expenses").update(payload).eq("id", id).select().single()
      : await client
          .from("expenses")
          .insert({ ...payload, farm_id: this.requireFarmId() })
          .select()
          .single();
    if (result.error || !result.data) fail("Unable to save expense", result.error);
    return mapExpense(result.data);
  }

  async deleteExpense(id: string): Promise<void> {
    await this.remove("expenses", id, "Unable to delete expense");
  }

  async saveBuyer(input: BuyerInput, id?: string): Promise<Buyer> {
    const client = getSupabaseClient();
    const payload = {
      name: input.name,
      contact_information: input.contactInformation,
      notes: input.notes,
    };
    const result = id
      ? await client.from("buyers").update(payload).eq("id", id).select().single()
      : await client
          .from("buyers")
          .insert({ ...payload, farm_id: this.requireFarmId() })
          .select()
          .single();
    if (result.error || !result.data) fail("Unable to save buyer", result.error);
    return {
      id: result.data.id,
      name: result.data.name,
      contactInformation: result.data.contact_information,
      notes: result.data.notes,
    };
  }

  async deleteBuyer(id: string): Promise<void> {
    await this.remove("buyers", id, "Unable to delete buyer");
  }

  async saveSale(input: SaleInput, id?: string): Promise<PigSale> {
    const client = getSupabaseClient();
    const saved = await client.rpc("record_pig_sale", {
      target_sale_id: id ?? null,
      target_farm_id: this.requireFarmId(),
      target_batch_id: input.batchId,
      target_pig_id: input.pigId,
      target_buyer_id: input.buyerId,
      target_actual_weight: input.actualWeight,
      target_weight_deduction: input.weightDeduction,
      target_price_per_kg: input.pricePerKg,
      target_sale_date: input.saleDate,
      target_payment_due_date: input.paymentDueDate,
      target_notes: input.notes,
    });
    if (saved.error || !saved.data) fail("Unable to save sale", saved.error);
    const result = await client.from("pig_sales").select("*").eq("id", saved.data).single();
    if (result.error || !result.data) fail("Unable to load saved sale", result.error);
    const row = result.data;
    return {
      id: row.id,
      pigId: row.pig_id,
      batchId: row.batch_id,
      buyerId: row.buyer_id,
      actualWeight: Number(row.actual_weight),
      weightDeduction: Number(row.weight_deduction),
      pricePerKg: Number(row.price_per_kg),
      saleDate: row.sale_date,
      paymentDueDate: row.payment_due_date,
      notes: row.notes,
    };
  }

  async deleteSale(id: string): Promise<void> {
    const result = await getSupabaseClient().rpc("delete_pig_sale", { target_sale_id: id });
    if (result.error) fail("Unable to delete sale", result.error);
  }

  async savePayment(input: PaymentInput, id?: string): Promise<Payment> {
    const client = getSupabaseClient();
    const saved = await client.rpc("record_payment", {
      target_payment_id: id ?? null,
      target_farm_id: this.requireFarmId(),
      target_sale_id: input.saleId,
      target_amount: input.amount,
      target_payment_date: input.paymentDate,
      target_payment_method: input.paymentMethod,
      target_notes: input.notes,
    });
    if (saved.error || !saved.data) fail("Unable to save payment", saved.error);
    const result = await client.from("payments").select("*").eq("id", saved.data).single();
    if (result.error || !result.data) fail("Unable to load saved payment", result.error);
    return {
      id: result.data.id,
      saleId: result.data.sale_id,
      amount: Number(result.data.amount),
      paymentDate: result.data.payment_date,
      paymentMethod: result.data.payment_method,
      notes: result.data.notes,
    };
  }

  async deletePayment(id: string): Promise<void> {
    await this.remove("payments", id, "Unable to delete payment");
  }

  private requireFarmId(): string {
    if (!this.farmId) throw new Error("Farm workspace has not loaded yet.");
    return this.farmId;
  }

  private async remove(
    table: "batches" | "pigs" | "expenses" | "buyers" | "payments",
    id: string,
    message: string,
  ): Promise<void> {
    const result = await getSupabaseClient().from(table).delete().eq("id", id);
    if (result.error) fail(message, result.error);
  }
}
