// SpliitUp — client-side helpers & types (no server imports).

export interface Member {
  memberId: string;
  name: string;
  phone: string;
  joinedAt: string;
}

export interface Split {
  memberId: string;
  amount: number;
  note?: string; // optional per-person note for custom splits ("why 50")
}

export interface Expense {
  expenseId: string;
  description: string;
  amount: number;
  category: string;
  paidBy: string;
  splits: Split[];
  reason: string;
  splitType: "equal" | "custom";
  explanation: string;
  status: "approved" | "pending";
  createdBy: string;
  createdAt: string;
}

export interface Handover {
  handoverId: string;
  fromId: string;
  toId: string;
  amount: number;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface Settlement {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  status: "pending" | "paid" | "completed";
  createdAt: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Trip {
  id: string;
  tripId: string;
  name: string;
  approvalMode: "auto" | "manual";
  isClosed: boolean;
  customCategories: CustomCategory[];
  createdAt: string;
  members: Member[];
  expenses: Expense[];
  handovers: Handover[];
  settlements: Settlement[];
}

export interface BalanceRow {
  memberId: string;
  paid: number;
  share: number;
  handoverGiven: number;
  handoverReceived: number;
  settlementGiven: number;
  settlementReceived: number;
  net: number;
}

export const PREDEFINED_CATEGORIES = [
  { id: "food", name: "Food", icon: "fa-utensils", color: "#10b981" },
  { id: "travel", name: "Travel", icon: "fa-plane", color: "#38bdf8" },
  { id: "accommodation", name: "Accommodation", icon: "fa-bed", color: "#f59e0b" },
  { id: "shopping", name: "Shopping", icon: "fa-bag-shopping", color: "#ec4899" },
  { id: "entertainment", name: "Entertainment", icon: "fa-film", color: "#a78bfa" },
  { id: "medical", name: "Medical", icon: "fa-kit-medical", color: "#ef4444" },
  { id: "misc", name: "Misc", icon: "fa-ellipsis", color: "#94a3b8" },
];

export function allCategories(trip?: Trip | null) {
  const custom = trip?.customCategories ?? [];
  return [...PREDEFINED_CATEGORIES, ...custom];
}

export function categoryMeta(id: string, trip?: Trip | null) {
  return allCategories(trip).find((c) => c.id === id) || PREDEFINED_CATEGORIES[6];
}

/** Format a number as Indian Rupees (en-IN). */
export function formatINR(amount: number): string {
  const n = Math.round((amount + Number.EPSILON) * 100) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);
}

export function formatNum(amount: number): string {
  const n = Math.round((amount + Number.EPSILON) * 100) / 100;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0);
}

/** Escape user text for safe HTML insertion (defense in depth; React also auto-escapes). */
export function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Equal split with paise-adjustment on the first participant. */
export function computeEqualSplits(
  amount: number,
  memberIds: string[]
): Split[] {
  if (memberIds.length === 0) return [];
  const totalPaise = Math.round(amount * 100);
  const base = Math.floor(totalPaise / memberIds.length);
  const remainder = totalPaise - base * memberIds.length;
  return memberIds.map((memberId, i) => ({
    memberId,
    amount: (base + (i < remainder ? 1 : 0)) / 100,
  }));
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Centralized API fetch. Throws on non-ok; the error carries `status` (0 = network failure). */
export async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    const err = new Error("Network error") as Error & { status: number };
    err.status = 0;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

/** Compute live balances on the client (mirrors server logic) for instant UI. */
export function computeBalances(trip: Trip): BalanceRow[] {
  const map = new Map<string, BalanceRow>();
  for (const m of trip.members) {
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
  for (const e of trip.expenses) {
    if (e.status !== "approved") continue;
    ensure(e.paidBy).paid += e.amount;
    for (const s of e.splits) ensure(s.memberId).share += s.amount;
  }
  for (const ho of trip.handovers) {
    ensure(ho.fromId).handoverGiven += ho.amount;
    ensure(ho.toId).handoverReceived += ho.amount;
  }
  for (const s of trip.settlements) {
    if (s.status === "pending") continue;
    ensure(s.fromId).settlementGiven += s.amount;
    ensure(s.toId).settlementReceived += s.amount;
  }
  for (const row of map.values()) {
    // Net = (paid - share) + (handoverGiven - handoverReceived) + (settlementGiven - settlementReceived)
    // Giving money increases your balance; receiving decreases it.
    row.net =
      row.paid -
      row.share +
      (row.handoverGiven - row.handoverReceived) +
      (row.settlementGiven - row.settlementReceived);
  }
  return Array.from(map.values());
}
