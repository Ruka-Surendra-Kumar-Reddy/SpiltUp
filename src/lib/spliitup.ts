import { db } from "@/lib/db";

/* ------------------------------------------------------------------ */
/*  SpliitUp shared helpers (server-side)                              */
/* ------------------------------------------------------------------ */

export const PREDEFINED_CATEGORIES = [
  { id: "food", name: "Food", icon: "fa-utensils", color: "#10b981" },
  { id: "travel", name: "Travel", icon: "fa-plane", color: "#38bdf8" },
  { id: "accommodation", name: "Accommodation", icon: "fa-bed", color: "#f59e0b" },
  { id: "shopping", name: "Shopping", icon: "fa-bag-shopping", color: "#ec4899" },
  { id: "entertainment", name: "Entertainment", icon: "fa-film", color: "#a78bfa" },
  { id: "medical", name: "Medical", icon: "fa-kit-medical", color: "#ef4444" },
  { id: "misc", name: "Misc", icon: "fa-ellipsis", color: "#94a3b8" },
] as const;

/** Generate a short, URL-friendly trip id (e.g. "ABC23F"). */
export function genTripId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Generate a member/expense/handover id. */
export function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Format a number as Indian Rupees using en-IN locale. */
export function formatINR(amount: number): string {
  const n = Math.round((amount + Number.EPSILON) * 100) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Compute equal splits with paise-adjustment so the total exactly matches
 * the expense amount. The first participant absorbs the rounding difference.
 */
export function computeEqualSplits(amount: number, memberIds: string[]): { memberId: string; amount: number }[] {
  if (memberIds.length === 0) return [];
  const totalPaise = Math.round(amount * 100);
  const base = Math.floor(totalPaise / memberIds.length);
  const remainder = totalPaise - base * memberIds.length;
  return memberIds.map((memberId, i) => ({
    memberId,
    amount: (base + (i < remainder ? 1 : 0)) / 100,
  }));
}

export interface BalanceRow {
  memberId: string;
  paid: number;
  share: number;
  handoverGiven: number;
  handoverReceived: number;
  settlementGiven: number;
  settlementReceived: number;
  net: number; // positive => creditor, negative => debtor
}

/**
 * Net balance per member:
 * (Total Paid in Expenses - Total Share in Expenses)
 * + (Total Received in Handovers - Total Given in Handovers)
 * + (Total Received in Completed/Paid Settlements - Total Given in Completed/Paid Settlements)
 *
 * Only APPROVED expenses count.
 * Settlements that are "paid" or "completed" represent real money movement
 * for settling up, so they reduce the outstanding balance.
 */
export function computeBalances(params: {
  members: { memberId: string }[];
  expenses: { status: string; paidBy: string; splits: { memberId: string; amount: number }[] }[];
  handovers: { fromId: string; toId: string; amount: number }[];
  settlements: { fromId: string; toId: string; amount: number; status: string }[];
}): BalanceRow[] {
  const { members, expenses, handovers, settlements } = params;
  const map = new Map<string, BalanceRow>();
  for (const m of members) {
    map.set(m.memberId, {
      memberId: m.memberId,
      paid: 0,
      share: 0,
      handoverGiven: 0,
      handoverReceived: 0,
      settlementGiven: 0,
      settlementReceived: 0,
      net: 0,
    });
  }
  const ensure = (id: string) => {
    if (!map.has(id)) {
      map.set(id, {
        memberId: id,
        paid: 0,
        share: 0,
        handoverGiven: 0,
        handoverReceived: 0,
        settlementGiven: 0,
        settlementReceived: 0,
        net: 0,
      });
    }
    return map.get(id)!;
  };

  for (const e of expenses) {
    if (e.status !== "approved") continue;
    const payer = ensure(e.paidBy);
    payer.paid += e.amount;
    for (const s of e.splits) {
      const sharer = ensure(s.memberId);
      sharer.share += s.amount;
    }
  }
  for (const h of handovers) {
    ensure(h.fromId).handoverGiven += h.amount;
    ensure(h.toId).handoverReceived += h.amount;
  }
  for (const s of settlements) {
    if (s.status === "pending") continue; // only moved money reduces balance
    ensure(s.fromId).settlementGiven += s.amount;
    ensure(s.toId).settlementReceived += s.amount;
  }

  for (const row of map.values()) {
    // Net = (paid - share) + (handoverGiven - handoverReceived) + (settlementGiven - settlementReceived)
    // Giving money (handover/settlement) INCREASES your balance (you're owed more);
    // receiving money DECREASES it. Per spec: A owes B 500 but gave B 1000 handover => A net +500.
    // (force recompile)
    row.net =
      row.paid -
      row.share +
      (row.handoverGiven - row.handoverReceived) +
      (row.settlementGiven - row.settlementReceived);
  }
  return Array.from(map.values());
}

export interface SuggestedSettlement {
  fromId: string;
  toId: string;
  amount: number;
}

/**
 * Two-pointer netting: minimize total transactions.
 * Debtors (net < 0) and creditors (net > 0), both sorted by magnitude desc.
 */
export function suggestSettlements(balances: BalanceRow[]): SuggestedSettlement[] {
  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ id: b.memberId, amt: -b.net }))
    .sort((a, b) => b.amt - a.amt);
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ id: b.memberId, amt: b.net }))
    .sort((a, b) => b.amt - a.amt);

  const out: SuggestedSettlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0.005) {
      out.push({ fromId: debtors[i].id, toId: creditors[j].id, amount: round2(pay) });
    }
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt <= 0.005) i++;
    if (creditors[j].amt <= 0.005) j++;
  }
  return out;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Recompute settlements for a trip:
 * - Delete all "pending" settlements.
 * - Keep "paid" and "completed" (in-progress / done money moves).
 * - Run two-pointer on the remaining balance (which already accounts for
 *   paid+completed settlements) and create new "pending" suggestions.
 */
export async function recomputeSettlements(tripId: string): Promise<void> {
  const trip = await db.trip.findUnique({
    where: { tripId },
    include: { members: true, expenses: true, handovers: true, settlements: true },
  });
  if (!trip) return;

  // delete pending
  await db.settlement.deleteMany({ where: { tripId: trip.id, status: "pending" } });

  const balances = computeBalances({
    members: trip.members,
    expenses: trip.expenses,
    handovers: trip.handovers,
    settlements: trip.settlements, // includes paid+completed
  });
  const suggestions = suggestSettlements(balances);

  if (suggestions.length > 0) {
    await db.settlement.createMany({
      data: suggestions.map((s) => ({
        tripId: trip.id,
        fromId: s.fromId,
        toId: s.toId,
        amount: s.amount,
        status: "pending",
      })),
    });
  }
}

/** Shape a trip (with relations) into the API-friendly embedded document. */
export function shapeTrip(trip: any) {
  return {
    id: trip.id,
    tripId: trip.tripId,
    name: trip.name,
    approvalMode: trip.approvalMode,
    isClosed: trip.isClosed,
    customCategories: trip.customCategories ?? [],
    createdAt: trip.createdAt,
    members: (trip.members ?? [])
      .map((m: any) => ({
        memberId: m.memberId,
        name: m.name,
        phone: m.phone,
        joinedAt: m.joinedAt,
      }))
      .sort((a: any, b: any) => +new Date(a.joinedAt) - +new Date(b.joinedAt)),
    expenses: (trip.expenses ?? []).map((e: any) => ({
      expenseId: e.expenseId,
      description: e.description,
      amount: e.amount,
      category: e.category,
      paidBy: e.paidBy,
      splits: e.splits ?? [],
      reason: e.reason,
      splitType: e.splitType,
      explanation: e.explanation,
      status: e.status,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
    })),
    handovers: (trip.handovers ?? []).map((h: any) => ({
      handoverId: h.handoverId,
      fromId: h.fromId,
      toId: h.toId,
      amount: h.amount,
      note: h.note,
      createdBy: h.createdBy,
      createdAt: h.createdAt,
    })),
    settlements: (trip.settlements ?? []).map((s: any) => ({
      id: s.id,
      fromId: s.fromId,
      toId: s.toId,
      amount: s.amount,
      status: s.status,
      createdAt: s.createdAt,
    })),
  };
}
