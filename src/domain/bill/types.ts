export type CurrencyCode = "USD" | "LBP";

export type Person = {
  id: string;
  name: string;
  groupMemberId?: string;
  emoji?: string;
  color?: string;
};

export type ItemSplitMethod = "equal" | "shares" | "custom";

export type EqualItemSplit = {
  method: "equal";
  personIds: string[];
};

export type ShareItemSplit = {
  method: "shares";
  shares: {
    personId: string;
    shares: number;
  }[];
};

export type CustomAmountItemSplit = {
  method: "custom";
  amounts: {
    personId: string;
    amountCents: number;
  }[];
};

export type ItemSplit =
  | EqualItemSplit
  | ShareItemSplit
  | CustomAmountItemSplit;

export type ItemCategory =
  | "food"
  | "drinks"
  | "delivery"
  | "dessert"
  | "other";

export type BillItem = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  split: ItemSplit;
  category?: ItemCategory;
  notes?: string;
};

export type BillExtraKind = "service" | "tip" | "delivery" | "discount" | "custom";

export type BillExtraAllocationMethod =
  | "equal"
  | "proportional"
  | "selectedPeople"
  | "customAmounts";

export type BillExtra = {
  id: string;
  name: string;
  kind: BillExtraKind;
  amountCents: number;

  allocationMethod: BillExtraAllocationMethod;
  selectedPersonIds?: string[];
  customAmountsByPersonId?: Record<string, number>;
};

export type Payment = {
  id: string;
  personId: string;
  amountCents: number;
  note?: string;
};

export type PersonSettlementBalance = {
  personId: string;
  personName: string;
  amountOwedCents: number;
  amountPaidCents: number;
  netBalanceCents: number;
};

export type SettlementTransfer = {
  fromPersonId: string;
  fromPersonName: string;
  toPersonId: string;
  toPersonName: string;
  amountCents: number;
};

export type PaymentTotalStatus =
  | {
      status: "balanced";
      billTotalCents: number;
      paidTotalCents: number;
      differenceCents: 0;
    }
  | {
      status: "underpaid";
      billTotalCents: number;
      paidTotalCents: number;
      differenceCents: number;
    }
  | {
      status: "overpaid";
      billTotalCents: number;
      paidTotalCents: number;
      differenceCents: number;
    };

export type Bill = {
  id: string;
  title: string;
  currency: CurrencyCode;
  groupId?: string;
  people: Person[];
  items: BillItem[];
  extras: BillExtra[];
  payments: Payment[];
  note?: string;
  createdAt: string;
  updatedAt: string;
};