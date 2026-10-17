import { calculateBillReview } from "../domain/bill/review";
import {
  calculatePersonSettlementBalances,
  calculateSettlementTransfers,
} from "../domain/bill/settlements";
import type { Bill, CurrencyCode, Payment } from "../domain/bill/types";
import {
  assertValidSavedGroup,
  normalizeSavedGroup,
} from "../domain/groups/savedGroups";
import type { SavedGroup, SavedGroupMember } from "../domain/groups/types";
import { getDb, type BillStatus, type StoredBill } from "./db";
import { hasBillRecordStructure } from "./backupValidation";

type BillInput = Bill & {
  id?: string;
  title?: string;
  status?: BillStatus;
  createdAt?: string;
  updatedAt?: string;
  lastOpenedAt?: string;
};

export type BillSummaryPaymentStatus =
  | "unpaid"
  | "partial"
  | "paid"
  | "overpaid";

export type BillSummary = {
  id: string;
  title: string;
  status: BillStatus;
  currency: CurrencyCode;
  peopleCount: number;
  itemsCount: number;
  billTotalCents: number;
  paidTotalCents: number;
  paymentStatus: BillSummaryPaymentStatus;
  settlementTransferCount: number;
  hasCalculationIssue: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
};

export type SplitLebBackupV1 = {
  appName: "SplitLeb";
  schemaVersion: 1;
  exportedAt: string;
  bills: StoredBill[];
};

export type SplitLebBackupV2 = {
  appName: "SplitLeb";
  schemaVersion: 2;
  exportedAt: string;
  bills: StoredBill[];
  groups: SavedGroup[];
};

export type SplitLebBackup = SplitLebBackupV1 | SplitLebBackupV2;

type ParsedSplitLebBackup = {
  appName: "SplitLeb";
  schemaVersion: 1 | 2;
  exportedAt: string;
  bills: StoredBill[];
  groups: SavedGroup[];
};

export type ImportSplitLebBackupResult = {
  importedBillCount: number;
  skippedBillCount: number;
  importedGroupCount: number;
  skippedGroupCount: number;

  /** Backwards-compatible bill-only aliases. */
  importedCount: number;
  skippedCount: number;
};

export type ImportBillsResult = ImportSplitLebBackupResult;

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `bill-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getBillTitle(bill: Partial<StoredBill>) {
  const record = bill as Record<string, unknown>;

  const title =
    record.title ??
    record.name ??
    record.billName ??
    record.restaurantName ??
    record.placeName;

  if (typeof title === "string" && title.trim().length > 0) {
    return title.trim();
  }

  return "Untitled bill";
}

function getCurrencyCode(bill: Partial<StoredBill>): CurrencyCode {
  const record = bill as Record<string, unknown>;
  const currency = record.currency;

  if (currency === "USD" || currency === "LBP") {
    return currency;
  }

  if (
    currency &&
    typeof currency === "object" &&
    "code" in currency &&
    (currency.code === "USD" || currency.code === "LBP")
  ) {
    return currency.code;
  }

  return "USD";
}

function getSafePayments(bill: StoredBill): Payment[] {
  const payments = (bill as { payments?: Payment[] }).payments;
  return Array.isArray(payments) ? payments : [];
}

function createPaymentsByPersonId(payments: Payment[]): Record<string, number> {
  return payments.reduce<Record<string, number>>((totals, payment) => {
    totals[payment.personId] =
      (totals[payment.personId] ?? 0) + payment.amountCents;

    return totals;
  }, {});
}

function getPaymentStatus(params: {
  billTotalCents: number;
  paidTotalCents: number;
}): BillSummaryPaymentStatus {
  if (params.paidTotalCents <= 0) {
    return "unpaid";
  }

  if (params.paidTotalCents < params.billTotalCents) {
    return "partial";
  }

  if (params.paidTotalCents === params.billTotalCents) {
    return "paid";
  }

  return "overpaid";
}

function getSummaryMetrics(bill: StoredBill): Pick<
  BillSummary,
  | "billTotalCents"
  | "paidTotalCents"
  | "paymentStatus"
  | "settlementTransferCount"
  | "hasCalculationIssue"
> {
  try {
    const payments = getSafePayments(bill);
    const review = calculateBillReview(bill as Bill, {
      paymentsByPersonId: createPaymentsByPersonId(payments),
    });

    const balances = calculatePersonSettlementBalances({
      personTotals: review.people.map((person) => ({
        personId: person.personId,
        personName: person.personName,
        amountOwedCents: person.grossTotalCents,
      })),
      payments,
    });

    const transfers = calculateSettlementTransfers(balances, {
      currency: bill.currency,
    });

    return {
      billTotalCents: review.grandTotalCents,
      paidTotalCents: review.paidTotalCents,
      paymentStatus: getPaymentStatus({
        billTotalCents: review.grandTotalCents,
        paidTotalCents: review.paidTotalCents,
      }),
      settlementTransferCount: transfers.length,
      hasCalculationIssue: false,
    };
  } catch {
    return {
      billTotalCents: 0,
      paidTotalCents: 0,
      paymentStatus: "unpaid",
      settlementTransferCount: 0,
      hasCalculationIssue: true,
    };
  }
}

function toSummary(bill: StoredBill): BillSummary {
  const metrics = getSummaryMetrics(bill);

  return {
    id: bill.id,
    title: getBillTitle(bill),
    status: bill.status,
    currency: getCurrencyCode(bill),
    peopleCount: Array.isArray((bill as { people?: unknown[] }).people)
      ? (bill as { people: unknown[] }).people.length
      : 0,
    itemsCount: Array.isArray((bill as { items?: unknown[] }).items)
      ? (bill as { items: unknown[] }).items.length
      : 0,
    ...metrics,
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
    lastOpenedAt: bill.lastOpenedAt,
  };
}

async function normalizeBillForStorage(
  bill: BillInput,
  statusOverride?: BillStatus,
): Promise<StoredBill> {
  const db = await getDb();
  const existing = bill.id ? await db.get("bills", bill.id) : undefined;
  const timestamp = nowIso();

  const id = bill.id ?? createId();

  return {
    ...bill,
    id,
    title: getBillTitle(bill),
    status: statusOverride ?? bill.status ?? existing?.status ?? "draft",
    createdAt: bill.createdAt ?? existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    lastOpenedAt: bill.lastOpenedAt ?? existing?.lastOpenedAt,
  } as StoredBill;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBillStatus(value: unknown): value is BillStatus {
  return value === "draft" || value === "active" || value === "settled";
}

function isStoredBill(value: unknown): value is StoredBill {
  if (!isRecord(value)) return false;

  const currency = value.currency;

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    (currency === "USD" || currency === "LBP") &&
    Array.isArray(value.people) &&
    Array.isArray(value.items) &&
    Array.isArray(value.extras) &&
    Array.isArray(value.payments) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    isBillStatus(value.status) &&
    hasBillRecordStructure(value)
  );
}

function isSavedGroupMember(value: unknown): value is SavedGroupMember {
  if (!isRecord(value)) return false;

  return (
    isText(value.id) &&
    isText(value.displayName) &&
    isText(value.createdAt) &&
    isText(value.updatedAt) &&
    (value.archivedAt === undefined || isText(value.archivedAt))
  );
}

function isSavedGroup(value: unknown): value is SavedGroup {
  if (!isRecord(value)) return false;

  return (
    isText(value.id) &&
    isText(value.name) &&
    Array.isArray(value.members) &&
    value.members.every(isSavedGroupMember) &&
    isText(value.createdAt) &&
    isText(value.updatedAt) &&
    (value.archivedAt === undefined || isText(value.archivedAt))
  );
}

function parseStoredBill(value: unknown): StoredBill {
  if (!isStoredBill(value)) {
    throw new Error("Backup contains an invalid bill.");
  }

  return {
    ...value,
    title: getBillTitle(value),
  };
}

function parseSavedGroup(value: unknown): SavedGroup {
  if (!isSavedGroup(value)) {
    throw new Error("Backup contains an invalid saved group.");
  }

  const group = normalizeSavedGroup(value);
  assertValidSavedGroup(group);

  return group;
}

function assertUniqueBackupIds(records: { id: string }[], label: string) {
  const ids = new Set<string>();

  for (const record of records) {
    if (ids.has(record.id)) {
      throw new Error(`Backup contains duplicate ${label} ids.`);
    }

    ids.add(record.id);
  }
}

function parseSplitLebBackup(value: unknown): ParsedSplitLebBackup {
  if (!isRecord(value)) {
    throw new Error("Backup file is not valid JSON.");
  }

  if (value.appName !== "SplitLeb") {
    throw new Error("This is not a SplitLeb backup file.");
  }

  if (value.schemaVersion !== 1 && value.schemaVersion !== 2) {
    throw new Error("Unsupported SplitLeb backup version.");
  }

  if (!Array.isArray(value.bills)) {
    throw new Error("Backup file does not contain bills.");
  }

  const bills = value.bills.map(parseStoredBill);
  const groups =
    value.schemaVersion === 2
      ? parseSavedGroupsFromV2Backup(value.groups)
      : [];

  assertUniqueBackupIds(bills, "bill");
  assertUniqueBackupIds(groups, "group");

  return {
    appName: "SplitLeb",
    schemaVersion: value.schemaVersion,
    exportedAt:
      typeof value.exportedAt === "string" ? value.exportedAt : nowIso(),
    bills,
    groups,
  };
}

function parseSavedGroupsFromV2Backup(value: unknown): SavedGroup[] {
  if (!Array.isArray(value)) {
    throw new Error("Backup file does not contain saved groups.");
  }

  return value.map(parseSavedGroup);
}

function savedGroupsAreEquivalent(first: SavedGroup, second: SavedGroup) {
  return (
    JSON.stringify(normalizeSavedGroup(first)) ===
    JSON.stringify(normalizeSavedGroup(second))
  );
}

function validateBackupGroupReferences(
  bills: StoredBill[],
  groupsById: Map<string, SavedGroup>,
) {
  for (const bill of bills) {
    const billRecord = bill as Record<string, unknown>;
    const groupId = billRecord.groupId;

    if (groupId !== undefined) {
      if (!isText(groupId)) {
        throw new Error(`Backup bill "${getBillTitle(bill)}" has an invalid groupId.`);
      }

      const group = groupsById.get(groupId);

      if (!group) {
        throw new Error(
          `Backup bill "${getBillTitle(bill)}" is linked to a missing saved group.`,
        );
      }

      validateBillGroupMemberReferences(bill, group);
      continue;
    }

    validateStandaloneBillHasNoGroupMemberLinks(bill);
  }
}

function validateBillGroupMemberReferences(bill: StoredBill, group: SavedGroup) {
  const groupMemberIds = new Set(group.members.map((member) => member.id));

  for (const person of bill.people) {
    if (!isRecord(person)) continue;

    const groupMemberId = person.groupMemberId;

    if (groupMemberId === undefined) continue;

    if (!isText(groupMemberId) || !groupMemberIds.has(groupMemberId)) {
      throw new Error(
        `Backup bill "${getBillTitle(bill)}" contains a person linked to a missing group member.`,
      );
    }
  }
}

function validateStandaloneBillHasNoGroupMemberLinks(bill: StoredBill) {
  for (const person of bill.people) {
    if (!isRecord(person)) continue;

    if (person.groupMemberId !== undefined) {
      throw new Error(
        `Backup bill "${getBillTitle(bill)}" contains a group member link but no groupId.`,
      );
    }
  }
}

export async function saveBill(
  bill: BillInput,
  statusOverride?: BillStatus,
): Promise<StoredBill> {
  const db = await getDb();
  const storedBill = await normalizeBillForStorage(bill, statusOverride);

  await db.put("bills", storedBill);

  return storedBill;
}

export async function getBill(id: string): Promise<StoredBill | undefined> {
  const db = await getDb();
  return db.get("bills", id);
}

export async function openBill(id: string): Promise<StoredBill | undefined> {
  const db = await getDb();
  const bill = await db.get("bills", id);

  if (!bill) {
    return undefined;
  }

  const updatedBill: StoredBill = {
    ...bill,
    lastOpenedAt: nowIso(),
  };

  await db.put("bills", updatedBill);

  return updatedBill;
}

export async function listRecentBills(limit = 25): Promise<BillSummary[]> {
  const db = await getDb();
  const tx = db.transaction("bills", "readonly");
  const index = tx.store.index("by-updatedAt");

  const summaries: BillSummary[] = [];
  let cursor = await index.openCursor(null, "prev");

  while (cursor && summaries.length < limit) {
    summaries.push(toSummary(cursor.value));
    cursor = await cursor.continue();
  }

  await tx.done;

  return summaries;
}

function sortBillsByUpdatedAtDesc(bills: StoredBill[]): StoredBill[] {
  return [...bills].sort(
    (firstBill, secondBill) =>
      new Date(secondBill.updatedAt).getTime() -
      new Date(firstBill.updatedAt).getTime(),
  );
}

export async function listBillsByGroupId(
  groupId: string,
): Promise<StoredBill[]> {
  const db = await getDb();
  const bills = await db.getAll("bills");

  return sortBillsByUpdatedAtDesc(
    bills.filter((bill) => bill.groupId === groupId),
  );
}

export async function listBillSummariesByGroupId(
  groupId: string,
): Promise<BillSummary[]> {
  const bills = await listBillsByGroupId(groupId);

  return bills.map(toSummary);
}

export async function listRecentStoredBills(limit = 25): Promise<StoredBill[]> {
  const db = await getDb();
  const tx = db.transaction("bills", "readonly");
  const index = tx.store.index("by-updatedAt");

  const bills: StoredBill[] = [];
  let cursor = await index.openCursor(null, "prev");

  while (cursor && bills.length < limit) {
    bills.push(cursor.value);
    cursor = await cursor.continue();
  }

  await tx.done;

  return bills;
}

export async function exportAllBills(): Promise<SplitLebBackupV2> {
  const db = await getDb();
  const bills = await db.getAll("bills");
  const groups = await db.getAll("savedGroups");

  bills.sort(
    (firstBill, secondBill) =>
      new Date(secondBill.updatedAt).getTime() -
      new Date(firstBill.updatedAt).getTime(),
  );

  groups.sort(
    (firstGroup, secondGroup) =>
      new Date(secondGroup.updatedAt).getTime() -
      new Date(firstGroup.updatedAt).getTime(),
  );

  return {
    appName: "SplitLeb",
    schemaVersion: 2,
    exportedAt: nowIso(),
    bills,
    groups,
  };
}

export async function importBillsFromBackup(
  backupInput: unknown,
): Promise<ImportSplitLebBackupResult> {
  const backup = parseSplitLebBackup(backupInput);
  const db = await getDb();
  const existingGroups = await db.getAll("savedGroups");
  const groupsById = new Map<string, SavedGroup>();

  for (const group of existingGroups) {
    groupsById.set(group.id, group);
  }

  for (const group of backup.groups) {
    const existingGroup = groupsById.get(group.id);

    if (existingGroup && !savedGroupsAreEquivalent(existingGroup, group)) {
      throw new Error(
        `Backup saved group "${group.name}" conflicts with an existing saved group.`,
      );
    }

    groupsById.set(group.id, group);
  }

  validateBackupGroupReferences(backup.bills, groupsById);

  const tx = db.transaction(["bills", "savedGroups"], "readwrite");
  const billsStore = tx.objectStore("bills");
  const groupsStore = tx.objectStore("savedGroups");

  let importedBillCount = 0;
  let skippedBillCount = 0;
  let importedGroupCount = 0;
  let skippedGroupCount = 0;

  for (const group of backup.groups) {
    const existingGroup = await groupsStore.get(group.id);

    if (existingGroup) {
      skippedGroupCount += 1;
      continue;
    }

    await groupsStore.put(group);
    importedGroupCount += 1;
  }

  for (const bill of backup.bills) {
    const existingBill = await billsStore.get(bill.id);

    if (existingBill) {
      skippedBillCount += 1;
      continue;
    }

    await billsStore.put({
      ...bill,
      title: getBillTitle(bill),
    });

    importedBillCount += 1;
  }

  await tx.done;

  return {
    importedBillCount,
    skippedBillCount,
    importedGroupCount,
    skippedGroupCount,
    importedCount: importedBillCount,
    skippedCount: skippedBillCount,
  };
}

export async function deleteBill(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("bills", id);
}

export async function updateBillStatus(
  id: string,
  status: BillStatus,
): Promise<StoredBill | undefined> {
  const db = await getDb();
  const bill = await db.get("bills", id);

  if (!bill) {
    return undefined;
  }

  const updatedBill: StoredBill = {
    ...bill,
    status,
    updatedAt: nowIso(),
  };

  await db.put("bills", updatedBill);

  return updatedBill;
}

export async function duplicateBill(id: string): Promise<StoredBill | undefined> {
  const db = await getDb();
  const original = await db.get("bills", id);

  if (!original) {
    return undefined;
  }

  const timestamp = nowIso();

  const duplicated: StoredBill = {
    ...original,
    id: createId(),
    title: `Copy of ${getBillTitle(original)}`,
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastOpenedAt: undefined,
  };

  await db.put("bills", duplicated);

  return duplicated;
}
