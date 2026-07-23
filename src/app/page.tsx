"use client";

import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { Btn, Modal, Field, Inp, Txt, Sel, Badge, Empty, Logo } from "@/components/spliitup/ui";
import { OnboardingWizard, ONBOARDING_KEY } from "@/components/spliitup/onboarding";
import {
  api,
  formatINR,
  formatNum,
  computeEqualSplits,
  round2,
  timeAgo,
  formatDate,
  allCategories,
  categoryMeta,
  computeBalances,
  PREDEFINED_CATEGORIES,
  type Trip,
  type Expense,
  type Handover,
  type Member,
  type Settlement,
  type BalanceRow,
  type CustomCategory,
} from "@/lib/spliitup-client";

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}
interface Session {
  tripId: string;
  memberId: string;
  role: "creator" | "member";
  password?: string;
}
interface PendingJoinRow {
  id: string;
  tripId: string;
  name: string;
  phone: string;
  createdAt: string;
}

const SESSION_KEY = "spliitup_session";

/* =====================================================================
   CREATE TRIP FORM
   ===================================================================== */
function CreateTripForm({
  toast,
  onSuccess,
}: {
  toast: (m: string, t?: ToastType) => void;
  onSuccess: (s: Session, trip: Trip) => void;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [creatorPhone, setCreatorPhone] = useState("");
  const [approvalMode, setApprovalMode] = useState<"auto" | "manual">("auto");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !password.trim() || !creatorName.trim() || !creatorPhone.trim()) {
      toast("Please fill in all fields.", "error");
      return;
    }
    if (password.length < 4) {
      toast("Password must be at least 4 characters.", "error");
      return;
    }
    try {
      setBusy(true);
      const data = await api<{ trip: Trip; memberId: string; role: string }>("/api/trips", {
        method: "POST",
        body: JSON.stringify({ name, password, creatorName, creatorPhone, approvalMode }),
      });
      const s: Session = { tripId: data.trip.tripId, memberId: data.memberId, role: "creator", password };
      onSuccess(s, data.trip);
    } catch (e: any) {
      toast(e.message || "Failed to create trip.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Trip Name" required>
        <Inp placeholder="e.g. Goa 2025" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Your Name" required>
          <Inp placeholder="Creator name" value={creatorName} onChange={(e) => setCreatorName(e.target.value)} />
        </Field>
        <Field label="Your Phone" required>
          <Inp placeholder="10-digit phone" value={creatorPhone} onChange={(e) => setCreatorPhone(e.target.value)} />
        </Field>
      </div>
      <Field label="Trip Password" required hint="Used to log in as the creator and manage the trip.">
        <Inp type="password" placeholder="Min 4 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="Expense Approval Mode">
        <div className="grid grid-cols-2 gap-2">
          {(["auto", "manual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setApprovalMode(m)}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                approvalMode === m
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background/40 text-muted-foreground hover:border-border/80"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <i className={m === "auto" ? "fa-solid fa-bolt text-primary" : "fa-solid fa-shield-halved text-warning"} />
                {m === "auto" ? "Auto Approve" : "Manual Approve"}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {m === "auto" ? "Expenses approved instantly." : "You review each expense."}
              </p>
            </button>
          ))}
        </div>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="primary" onClick={submit} disabled={busy}>
          {busy ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-plus" />}
          Create Trip
        </Btn>
      </div>
    </div>
  );
}

/* =====================================================================
   LOGIN FORM
   ===================================================================== */
function LoginForm({
  initialTripId,
  toast,
  onSuccess,
}: {
  initialTripId?: string;
  toast: (m: string, t?: ToastType) => void;
  onSuccess: (s: Session) => void;
}) {
  const [tripId, setTripId] = useState(initialTripId || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!tripId.trim() || !password.trim()) {
      toast("Enter Trip ID and password.", "error");
      return;
    }
    try {
      setBusy(true);
      const data = await api<{ memberId: string; role: string }>(`/api/trips/${tripId.trim()}/login`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      onSuccess({ tripId: tripId.trim(), memberId: data.memberId, role: "creator", password });
    } catch (e: any) {
      toast(e.message || "Login failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Trip ID" required>
        <Inp placeholder="e.g. ABC23F" value={tripId} onChange={(e) => setTripId(e.target.value)} autoFocus />
      </Field>
      <Field label="Password" required>
        <Inp type="password" placeholder="Trip password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="primary" onClick={submit} disabled={busy}>
          {busy ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-right-to-bracket" />}
          Log In as Creator
        </Btn>
      </div>
    </div>
  );
}

/* =====================================================================
   EXPENSE FORM
   ===================================================================== */
function ExpenseForm({
  trip,
  memberId,
  editing,
  toast,
  onSuccess,
  onCancel,
}: {
  trip: Trip;
  memberId: string;
  editing?: Expense;
  toast: (m: string, t?: ToastType) => void;
  onSuccess: (trip: Trip) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(editing?.description || "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [category, setCategory] = useState(editing?.category || "food");
  const [paidBy, setPaidBy] = useState(editing?.paidBy || memberId);
  const [splitType, setSplitType] = useState<"equal" | "custom">(editing?.splitType || "equal");
  const [reason, setReason] = useState(editing?.reason || "");
  const [explanation, setExplanation] = useState(editing?.explanation || "");
  const [participants, setParticipants] = useState<string[]>(
    editing ? editing.splits.map((s) => s.memberId) : trip.members.map((m) => m.memberId)
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    editing ? Object.fromEntries(editing.splits.map((s) => [s.memberId, String(s.amount)])) : {}
  );
  const [customNotes, setCustomNotes] = useState<Record<string, string>>(
    editing ? Object.fromEntries(editing.splits.map((s) => [s.memberId, s.note || ""])) : {}
  );
  const [busy, setBusy] = useState(false);

  const cats = allCategories(trip);
  const amt = Number(amount) || 0;
  const customSum = round2(participants.reduce((a, p) => a + (Number(customAmounts[p] || 0)), 0));
  const equalSplits = computeEqualSplits(amt, participants);

  function toggleParticipant(id: string) {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (!description.trim()) return toast("Enter a description.", "error");
    if (!Number.isFinite(amt) || amt <= 0) return toast("Enter a valid amount.", "error");
    if (participants.length === 0) return toast("Select at least one participant.", "error");
    if (splitType === "custom") {
      if (Math.abs(customSum - round2(amt)) > 0.01) {
        return toast(`Custom total (₹${formatNum(customSum)}) must equal ₹${formatNum(amt)}.`, "error");
      }
    }
    try {
      setBusy(true);
      const payload = {
        memberId,
        description: description.trim(),
        amount: amt,
        category,
        paidBy,
        splitType,
        reason: reason.trim(),
        explanation: explanation.trim(),
        participants,
        customAmounts: Object.fromEntries(participants.map((p) => [p, Number(customAmounts[p] || 0)])),
        customNotes: Object.fromEntries(participants.map((p) => [p, (customNotes[p] || "").trim()])),
      };
      const url = editing
        ? `/api/trips/${trip.tripId}/expenses/${editing.expenseId}`
        : `/api/trips/${trip.tripId}/expenses`;
      const data = await api<{ trip: Trip }>(url, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      toast(editing ? "Expense updated." : "Expense added.", "success");
      onSuccess(data.trip);
    } catch (e: any) {
      toast(e.message || "Failed to save expense.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Description" required>
          <Inp placeholder="e.g. Dinner at Tito's" value={description} onChange={(e) => setDescription(e.target.value)} autoFocus />
        </Field>
        <Field label="Amount (₹)" required>
          <Inp type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Category">
          <Sel value={category} onChange={(e) => setCategory(e.target.value)}>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Sel>
        </Field>
        <Field label="Paid By">
          <Sel value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {trip.members.map((m) => (
              <option key={m.memberId} value={m.memberId}>
                {m.name}
                {m.memberId === memberId ? " (you)" : ""}
              </option>
            ))}
          </Sel>
        </Field>
      </div>

      <div>
        <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          Split Between
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {trip.members.map((m) => {
            const on = participants.includes(m.memberId);
            return (
              <button
                key={m.memberId}
                type="button"
                onClick={() => toggleParticipant(m.memberId)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background/40 text-muted-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`grid h-6 w-6 place-items-center rounded-md ${on ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    <i className={`fa-solid ${on ? "fa-check" : "fa-user"} text-[10px]`} />
                  </span>
                  {m.name}
                  {m.memberId === memberId && <span className="text-[10px] text-muted-foreground">(you)</span>}
                </span>
                {splitType === "custom" && on && (
                  <span className="text-xs font-medium text-primary">
                    {formatINR(Number(customAmounts[m.memberId] || 0))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Split Type">
        <div className="grid grid-cols-2 gap-2">
          {(["equal", "custom"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSplitType(t)}
              className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                splitType === t ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background/40 text-muted-foreground"
              }`}
            >
              <i className={t === "equal" ? "fa-solid fa-divide mr-2 text-primary" : "fa-solid fa-sliders mr-2 text-warning"} />
              {t === "equal" ? "Equal Split" : "Custom Split"}
            </button>
          ))}
        </div>
      </Field>

      {splitType === "equal" ? (
        <>
          <Field label="Reason (optional)" hint="Why this split is fair (shown to everyone).">
            <Inp placeholder="e.g. Split equally among everyone who ate" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          {amt > 0 && participants.length > 0 && (
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Each pays · {formatINR(amt)} ÷ {participants.length}
              </p>
              <div className="flex flex-wrap gap-2">
                {equalSplits.map((s) => (
                  <Badge key={s.memberId} tone="primary">
                    {memberName(trip, s.memberId)}: {formatINR(s.amount)}
                  </Badge>
                ))}
              </div>
              {new Set(equalSplits.map((s) => s.amount)).size > 1 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  <i className="fa-solid fa-circle-info mr-1 text-primary" />
                  {formatINR(amt)} doesn't divide evenly by {participants.length}, so the first{" "}
                  {equalSplits.filter((s) => s.amount > equalSplits[equalSplits.length - 1].amount).length} member(s) pay ₹0.01 extra.
                  The shares always add up to exactly {formatINR(amt)} — nothing is lost.
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <Field label="Explanation (optional)" hint="Why the amounts are split this way.">
            <Txt rows={2} placeholder="e.g. Ate more, B drank wine" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
          </Field>
          <div className="rounded-xl border border-border bg-background/40 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Enter each person's share (note optional — e.g. "why 50")</p>
            {participants.length === 0 && <p className="text-xs text-muted-foreground">Select participants first.</p>}
            {participants.map((p) => (
              <div key={p} className="flex flex-wrap items-center gap-2">
                <span className="order-1 w-24 shrink-0 truncate text-sm">{memberName(trip, p)}</span>
                {/* mobile: name + amount on one line, note full-width below; desktop: name | note | amount */}
                <div className="order-2 min-w-0 flex-1 sm:order-3 sm:w-28 sm:flex-none">
                  <Inp
                    type="number"
                    inputMode="decimal"
                    placeholder="₹ Amount"
                    value={customAmounts[p] || ""}
                    onChange={(e) => setCustomAmounts((prev) => ({ ...prev, [p]: e.target.value }))}
                    className="py-2"
                  />
                </div>
                <div className="order-3 w-full sm:order-2 sm:w-auto sm:min-w-0 sm:flex-1">
                  <Inp
                    placeholder="Note (optional) — e.g. why this amount"
                    value={customNotes[p] || ""}
                    onChange={(e) => setCustomNotes((prev) => ({ ...prev, [p]: e.target.value }))}
                    className="py-2"
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className={Math.abs(customSum - round2(amt)) < 0.01 && amt > 0 ? "text-primary font-semibold" : "text-warning font-semibold"}>
                {formatINR(customSum)} / {formatINR(amt)}
              </span>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={submit} disabled={busy}>
          {busy ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
          {editing ? "Save Changes" : "Add Expense"}
        </Btn>
      </div>
    </div>
  );
}

/* =====================================================================
   HANDOVER FORM
   ===================================================================== */
function HandoverForm({
  trip,
  memberId,
  toast,
  onSuccess,
  onCancel,
}: {
  trip: Trip;
  memberId: string;
  toast: (m: string, t?: ToastType) => void;
  onSuccess: (trip: Trip) => void;
  onCancel: () => void;
}) {
  const [fromId, setFromId] = useState(memberId);
  const [toId, setToId] = useState(trip.members.find((m) => m.memberId !== memberId)?.memberId || "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const amt = Number(amount) || 0;
    if (!fromId || !toId) return toast("Select sender and receiver.", "error");
    if (fromId === toId) return toast("Sender and receiver must differ.", "error");
    if (!Number.isFinite(amt) || amt <= 0) return toast("Enter a valid amount.", "error");
    try {
      setBusy(true);
      const data = await api<{ trip: Trip }>(`/api/trips/${trip.tripId}/handovers`, {
        method: "POST",
        body: JSON.stringify({ memberId, fromId, toId, amount: amt, note: note.trim() }),
      });
      toast("Handover recorded.", "success");
      onSuccess(data.trip);
    } catch (e: any) {
      toast(e.message || "Failed to add handover.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground/90">
        <i className="fa-solid fa-circle-info mr-1.5 text-warning" />
        A handover is a cash transfer (e.g. "A gave B ₹1000 for the trip"). It adjusts net balances separately from expenses.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="From" required>
          <Sel value={fromId} onChange={(e) => setFromId(e.target.value)}>
            {trip.members.map((m) => (
              <option key={m.memberId} value={m.memberId}>
                {m.name}
                {m.memberId === memberId ? " (you)" : ""}
              </option>
            ))}
          </Sel>
        </Field>
        <Field label="To" required>
          <Sel value={toId} onChange={(e) => setToId(e.target.value)}>
            {trip.members.map((m) => (
              <option key={m.memberId} value={m.memberId}>
                {m.name}
              </option>
            ))}
          </Sel>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Amount (₹)" required>
          <Inp type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <Field label="Note">
          <Inp placeholder="e.g. For tomorrow's cab" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn variant="warning" onClick={submit} disabled={busy}>
          {busy ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-hand-holding-dollar" />}
          Record Handover
        </Btn>
      </div>
    </div>
  );
}

/* =====================================================================
   Helpers
   ===================================================================== */
function memberName(trip: Trip | null, id: string): string {
  if (!trip) return id;
  return trip.members.find((m) => m.memberId === id)?.name || "Unknown";
}

function CategoryChip({ id, trip }: { id: string; trip: Trip }) {
  const c = categoryMeta(id, trip);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}44` }}
    >
      <i className={`fa-solid ${c.icon}`} />
      {c.name}
    </span>
  );
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const hues = [10, 160, 200, 280, 340, 45, 120];
  const h = hues[name.charCodeAt(0) % hues.length];
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${h} 70% 45%), hsl(${(h + 30) % 360} 70% 38%))`,
      }}
    >
      {initials || "?"}
    </span>
  );
}

/* =====================================================================
   MAIN APP
   ===================================================================== */
export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [view, setView] = useState<"landing" | "join" | "dashboard">("landing");
  const [joinTripId, setJoinTripId] = useState("");
  const [joinTrip, setJoinTrip] = useState<Trip | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<"notfound" | "network" | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [creatorTab, setCreatorTab] = useState("overview");
  const [memberTab, setMemberTab] = useState<"myview" | "addexp" | "addhand" | "history">("myview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingJoins, setPendingJoins] = useState<PendingJoinRow[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [expFilter, setExpFilter] = useState<"all" | "approved" | "pending">("all");

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  /* ---------- session persistence ---------- */
  const saveSession = useCallback((s: Session) => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch {}
    setSession(s);
  }, []);

  const clearSession = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    setSession(null);
    setTrip(null);
    setPendingJoins([]);
    setView("landing");
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
  }, []);

  /* ---------- fetch trip ---------- */
  const fetchTrip = useCallback(async (tripId: string): Promise<Trip | null> => {
    try {
      const data = await api<{ trip: Trip }>(`/api/trips/${tripId}`);
      setTrip(data.trip);
      return data.trip;
    } catch (e: any) {
      toast(e.message || "Failed to load trip.", "error");
      return null;
    }
  }, [toast]);

  /** Load a trip for the join screen. Only a real 404 means "trip not found";
      network failures and 5xx (mobile blips, serverless cold starts) are retried
      with backoff for ~10s before showing a "connection problem" screen. */
  const loadJoinTrip = useCallback(async (tid: string) => {
    setJoinLoading(true);
    setJoinError(null);
    let t: Trip | null = null;
    let error: "notfound" | "network" = "network";
    const delays = [0, 700, 1500, 3000, 5000];
    for (const delay of delays) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      try {
        const data = await api<{ trip: Trip }>(`/api/trips/${tid}`);
        t = data.trip;
        break;
      } catch (e: any) {
        if (e?.status === 404) {
          error = "notfound";
          break; // the server answered: this trip really doesn't exist
        }
        // network error / 5xx — retry
      }
    }
    setJoinTrip(t);
    setJoinError(t ? null : error);
    if (t) setTrip(t);
    setJoinLoading(false);
  }, []);

  const fetchPendingJoins = useCallback(async (tripId: string, password: string) => {
    try {
      const data = await api<{ pending: PendingJoinRow[] }>(
        `/api/trips/${tripId}/pending?password=${encodeURIComponent(password)}`
      );
      setPendingJoins(data.pending);
    } catch {
      setPendingJoins([]);
    }
  }, []);

  /* ---------- init ---------- */
  useEffect(() => {
    (async () => {
      const hash = window.location.hash;
      if (hash.startsWith("#join-")) {
        const tid = hash.slice(6).toUpperCase();
        setJoinTripId(tid);
        setView("join");
        setLoading(false);
        loadJoinTrip(tid);
        // Show the "how it works" onboarding the first time someone opens a share link
        // in this browser session (remembered in sessionStorage so it doesn't nag).
        try {
          if (!sessionStorage.getItem(ONBOARDING_KEY)) setShowOnboarding(true);
        } catch {}
        return;
      }
      let s: Session | null = null;
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) s = JSON.parse(raw);
      } catch {}
      if (s) {
        setSession(s);
        const t = await fetchTrip(s.tripId);
        if (t) {
          setView("dashboard");
          if (s.role === "creator" && s.password) fetchPendingJoins(s.tripId, s.password);
        } else {
          clearSession();
        }
      } else {
        setView("landing");
      }
      setLoading(false);
    })();
    // run once on mount
  }, []);

  /* ---------- hash change ---------- */
  useEffect(() => {
    const onHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith("#join-")) {
        const tid = hash.slice(6).toUpperCase();
        setJoinTripId(tid);
        setView("join");
        loadJoinTrip(tid);
        try {
          if (!sessionStorage.getItem(ONBOARDING_KEY)) setShowOnboarding(true);
        } catch {}
      } else if (!hash && view !== "dashboard") {
        setView("landing");
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [loadJoinTrip, view]);

  /* ---------- onboarding handlers ---------- */
  const closeOnboarding = useCallback(() => {
    try {
      sessionStorage.setItem(ONBOARDING_KEY, "1");
    } catch {}
    setShowOnboarding(false);
  }, []);

  /* ---------- handlers ---------- */
  function handleCreateSuccess(s: Session, t: Trip) {
    saveSession(s);
    setTrip(t);
    setModal(null);
    setView("dashboard");
    setCreatorTab("overview");
    toast("Trip created! Share the link with friends.", "success");
    if (s.password) fetchPendingJoins(s.tripId, s.password);
  }

  function handleLoginSuccess(s: Session) {
    saveSession(s);
    setModal(null);
    fetchTrip(s.tripId).then((t) => {
      if (t) {
        setView("dashboard");
        setCreatorTab("overview");
        toast("Welcome back, creator.", "success");
        if (s.password) fetchPendingJoins(s.tripId, s.password);
      }
    });
  }

  function joinAsMember(tid: string, memberId: string) {
    const s: Session = { tripId: tid, memberId, role: "member" };
    saveSession(s);
    setJoinTrip(null);
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
    fetchTrip(tid).then((t) => {
      if (t) {
        setView("dashboard");
        setMemberTab("myview");
        toast(`Joined as ${t.members.find((m) => m.memberId === memberId)?.name}.`, "success");
      }
    });
  }

  async function submitJoinRequest(name: string, phone: string) {
    try {
      await api(`/api/trips/${joinTripId}/join-request`, {
        method: "POST",
        body: JSON.stringify({ name, phone }),
      });
      toast("Join request submitted! Ask the creator to approve.", "success");
      setModal(null);
    } catch (e: any) {
      toast(e.message || "Failed to submit request.", "error");
    }
  }

  /* ---------- generic mutation helper ---------- */
  async function mutate(path: string, method: string, body: any, successMsg?: string) {
    try {
      const data = await api<{ trip?: Trip; ok?: boolean }>(path, { method, body: JSON.stringify(body) });
      if (data.trip) setTrip(data.trip);
      if (successMsg) toast(successMsg, "success");
      return data;
    } catch (e: any) {
      toast(e.message || "Action failed.", "error");
      throw e;
    }
  }

  /* ---------- creator actions ---------- */
  async function approveExpense(e: Expense) {
    if (!session?.password) return;
    await mutate(`/api/trips/${trip!.tripId}/expenses/${e.expenseId}/approve`, "POST", { password: session.password }, "Expense approved.");
  }
  async function rejectExpense(e: Expense) {
    if (!session?.password) return;
    setModal({ type: "confirm", title: "Reject expense?", message: `"${e.description}" will be permanently deleted.`, confirmLabel: "Reject", danger: true, onConfirm: async () => { setModal(null); await mutate(`/api/trips/${trip!.tripId}/expenses/${e.expenseId}/reject`, "POST", { password: session.password }, "Expense rejected."); } });
  }
  async function deleteExpense(e: Expense) {
    setModal({ type: "confirm", title: "Delete expense?", message: `"${e.description}" will be removed and balances recalculated.`, confirmLabel: "Delete", danger: true, onConfirm: async () => { setModal(null); await mutate(`/api/trips/${trip!.tripId}/expenses/${e.expenseId}`, "DELETE", { memberId: session!.memberId }, "Expense deleted."); } });
  }
  async function deleteHandover(ho: Handover) {
    setModal({ type: "confirm", title: "Delete handover?", message: `${memberName(trip, ho.fromId)} → ${memberName(trip, ho.toId)}: ${formatINR(ho.amount)}`, confirmLabel: "Delete", danger: true, onConfirm: async () => { setModal(null); await mutate(`/api/trips/${trip!.tripId}/handovers/${ho.handoverId}`, "DELETE", { memberId: session!.memberId }, "Handover deleted."); } });
  }
  async function addMember(name: string, phone: string) {
    if (!session?.password) return;
    await mutate(`/api/trips/${trip!.tripId}/members`, "POST", { password: session.password, name, phone }, "Member added.");
    setModal(null);
  }
  async function removeMember(m: Member) {
    if (!session?.password) return;
    setModal({ type: "confirm", title: "Remove member?", message: `${m.name} (${m.phone}) will be removed from the trip. Members involved in expenses, handovers, or settlements can't be removed.`, confirmLabel: "Remove", danger: true, onConfirm: async () => { setModal(null); await mutate(`/api/trips/${trip!.tripId}/members/${m.memberId}`, "DELETE", { password: session.password }, `${m.name} removed.`); } });
  }
  async function approveJoin(p: PendingJoinRow) {
    if (!session?.password) return;
    await mutate(`/api/trips/${trip!.tripId}/pending/${p.id}/approve`, "POST", { password: session.password }, `${p.name} approved.`);
    if (session.password) fetchPendingJoins(trip!.tripId, session.password);
  }
  async function rejectJoin(p: PendingJoinRow) {
    if (!session?.password) return;
    setModal({ type: "confirm", title: "Reject join request?", message: `${p.name} (${p.phone}) will be removed.`, confirmLabel: "Reject", danger: true, onConfirm: async () => { setModal(null); await mutate(`/api/trips/${trip!.tripId}/pending/${p.id}`, "DELETE", { password: session.password }, "Request rejected."); if (session!.password) fetchPendingJoins(trip!.tripId, session!.password); } });
  }
  async function closeTrip() {
    if (!session?.password) return;
    setModal({ type: "confirm", title: "Close this trip?", message: "No new expenses, handovers, or members can be added. Settlements remain active.", confirmLabel: "Close Trip", danger: true, onConfirm: async () => { setModal(null); await mutate(`/api/trips/${trip!.tripId}/close`, "POST", { password: session.password }, "Trip closed."); } });
  }
  async function deleteTrip() {
    if (!session?.password) return;
    setModal({ type: "confirm", title: "Delete this trip?", message: "This permanently deletes the trip and ALL its data. This cannot be undone.", confirmLabel: "Delete Forever", danger: true, onConfirm: async () => { setModal(null); try { await api(`/api/trips/${trip!.tripId}`, { method: "DELETE", body: JSON.stringify({ password: session!.password }) }); toast("Trip deleted.", "success"); clearSession(); } catch (e:any) { toast(e.message, "error"); } } });
  }
  async function saveSettings(name: string, approvalMode: "auto" | "manual", customCategories: CustomCategory[]) {
    if (!session?.password) return;
    await mutate(`/api/trips/${trip!.tripId}`, "PATCH", { password: session.password, name, approvalMode, customCategories }, "Settings saved.");
    setModal(null);
  }
  async function recomputeSettlements() {
    if (!session?.password) return;
    await mutate(`/api/trips/${trip!.tripId}/settlements`, "POST", { password: session.password }, "Settlements recalculated.");
  }
  async function markPaid(s: Settlement) {
    await mutate(`/api/trips/${trip!.tripId}/settlements/${s.id}/pay`, "POST", { memberId: session!.memberId }, "Marked as paid. Awaiting confirmation.");
  }
  async function markReceived(s: Settlement) {
    await mutate(`/api/trips/${trip!.tripId}/settlements/${s.id}/receive`, "POST", { memberId: session!.memberId }, "Settlement completed.");
  }

  function shareLink() {
    const url = `${window.location.origin}/#join-${trip!.tripId}`;
    navigator.clipboard?.writeText(url).then(
      () => toast("Join link copied!", "success"),
      () => { setModal({ type: "share", url }); }
    );
  }

  /* ---------- derived ---------- */
  const balances = useMemo(() => (trip ? computeBalances(trip) : []), [trip]);
  const me = trip?.members.find((m) => m.memberId === session?.memberId);
  const pendingCount = (trip?.expenses.filter((e) => e.status === "pending").length || 0) + pendingJoins.length;

  /* ---------- loading ---------- */
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-primary" />
          <p className="text-sm">Loading SpliitUp…</p>
        </div>
      </div>
    );
  }

  /* ---------- toasts ---------- */
  const toastsEl = (
    <div className="pointer-events-none fixed right-3 top-3 z-[60] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-4 sm:top-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`spl-toast-in pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${
            t.type === "success"
              ? "border-primary/40 bg-primary/15 text-primary"
              : t.type === "error"
              ? "border-danger/40 bg-danger/15 text-danger"
              : "border-border bg-card text-foreground"
          }`}
        >
          <i className={`fa-solid mt-0.5 ${t.type === "success" ? "fa-circle-check" : t.type === "error" ? "fa-circle-exclamation" : "fa-circle-info"}`} />
          <span className="flex-1">{t.message}</span>
          <button onClick={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))} className="text-current/70 hover:text-current">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      ))}
    </div>
  );

  /* ---------- modals ---------- */
  function renderModal() {
    if (!modal) return null;
    if (modal.type === "create") {
      return (
        <Modal open onClose={() => setModal(null)} title="Create a New Trip" subtitle="Set up your trip and become its creator." icon={<i className="fa-solid fa-plus" />}>
          <CreateTripForm toast={toast} onSuccess={handleCreateSuccess} />
        </Modal>
      );
    }
    if (modal.type === "login") {
      return (
        <Modal open onClose={() => setModal(null)} title="Creator Login" subtitle="Access the creator dashboard with your Trip ID." icon={<i className="fa-solid fa-right-to-bracket" />}>
          <LoginForm toast={toast} onSuccess={handleLoginSuccess} />
        </Modal>
      );
    }
    if (modal.type === "addExpense") {
      return (
        <Modal open onClose={() => setModal(null)} title="Add Expense" subtitle={trip?.name} icon={<i className="fa-solid fa-receipt" />} size="lg">
          {trip && <ExpenseForm trip={trip} memberId={session!.memberId} toast={toast} onSuccess={(t) => { setTrip(t); setModal(null); }} onCancel={() => setModal(null)} />}
        </Modal>
      );
    }
    if (modal.type === "editExpense") {
      return (
        <Modal open onClose={() => setModal(null)} title="Edit Expense" subtitle={modal.expense.description} icon={<i className="fa-solid fa-pen" />} size="lg">
          {trip && <ExpenseForm trip={trip} memberId={session!.memberId} editing={modal.expense} toast={toast} onSuccess={(t) => { setTrip(t); setModal(null); }} onCancel={() => setModal(null)} />}
        </Modal>
      );
    }
    if (modal.type === "addHandover") {
      return (
        <Modal open onClose={() => setModal(null)} title="Record Handover" subtitle="Cash transfer between members" icon={<i className="fa-solid fa-hand-holding-dollar" />}>
          {trip && <HandoverForm trip={trip} memberId={session!.memberId} toast={toast} onSuccess={(t) => { setTrip(t); setModal(null); }} onCancel={() => setModal(null)} />}
        </Modal>
      );
    }
    if (modal.type === "addMember") {
      return <AddMemberModal onClose={() => setModal(null)} onAdd={addMember} />;
    }
    if (modal.type === "settings") {
      return trip && session?.password ? (
        <SettingsModal trip={trip} password={session.password} onClose={() => setModal(null)} onSave={saveSettings} onCloseTrip={closeTrip} onDeleteTrip={deleteTrip} onShare={shareLink} />
      ) : null;
    }
    if (modal.type === "joinRequest") {
      return <JoinRequestModal onClose={() => setModal(null)} onSubmit={submitJoinRequest} />;
    }
    if (modal.type === "share") {
      return (
        <Modal open onClose={() => setModal(null)} title="Share Trip Link" icon={<i className="fa-solid fa-share-nodes" />}>
          <p className="mb-2 text-sm text-muted-foreground">Send this link to your friends so they can join:</p>
          <div className="flex gap-2">
            <Inp readOnly value={modal.url} className="font-mono text-xs" />
            <Btn variant="primary" onClick={() => { navigator.clipboard?.writeText(modal.url); toast("Copied!", "success"); }}>
              <i className="fa-solid fa-copy" />
            </Btn>
          </div>
        </Modal>
      );
    }
    if (modal.type === "confirm") {
      return (
        <Modal open onClose={() => setModal(null)} title={modal.title} icon={<i className={`fa-solid ${modal.danger ? "fa-triangle-exclamation text-danger" : "fa-circle-question"}`} />} size="sm">
          <p className="text-sm text-muted-foreground">{modal.message}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant={modal.danger ? "danger" : "primary"} onClick={modal.onConfirm}>{modal.confirmLabel || "Confirm"}</Btn>
          </div>
        </Modal>
      );
    }
    return null;
  }

  /* =====================================================
     LANDING
     ===================================================== */
  function renderLanding() {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
        {/* glow */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px]" />
        </div>
        <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 py-16 text-center">
          <div className="spl-fade-in mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Trip expenses, fairly split
          </div>
          <div className="spl-fade-in flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="spl-fade-in mt-6 font-heading text-4xl font-bold leading-tight sm:text-6xl">
            Split trips.<br />
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">Settle smartly.</span>
          </h1>
          <p className="spl-fade-in mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Track shared expenses, record cash handovers, and let SpliitUp's auto-netting settle every rupee with the fewest transactions.
          </p>
          <div className="spl-fade-in mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Btn variant="primary" className="w-full sm:w-auto" onClick={() => setModal({ type: "create" })}>
              <i className="fa-solid fa-plus" /> Create a Trip
            </Btn>
            <Btn variant="outline" className="w-full sm:w-auto" onClick={() => { const tid = prompt("Enter Trip ID to join:"); if (tid) window.location.hash = `#join-${tid.trim().toUpperCase()}`; }}>
              <i className="fa-solid fa-right-to-bracket" /> Join a Trip
            </Btn>
            <Btn variant="ghost" className="w-full sm:w-auto" onClick={() => setModal({ type: "login" })}>
              <i className="fa-solid fa-lock" /> Creator Login
            </Btn>
          </div>

          <button
            onClick={() => setShowOnboarding(true)}
            className="spl-fade-in mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <i className="fa-solid fa-circle-question text-primary" />
            How it works — Splits, Handovers &amp; Settlements
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </button>

          <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: "fa-divide", title: "Smart Splits", desc: "Equal or custom, with paise-perfect rounding." },
              { icon: "fa-hand-holding-dollar", title: "Handovers", desc: "Track cash transfers that adjust balances." },
              { icon: "fa-arrow-right-arrow-left", title: "Auto-Netting", desc: "Minimum transactions to settle everything." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card/60 p-5 text-left">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <i className={`fa-solid ${f.icon}`} />
                </div>
                <h3 className="mt-3 font-heading font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </main>
        <footer className="relative z-10 border-t border-border py-5 text-center text-xs text-muted-foreground">
          SpliitUp — every paisa accounted for · Indian Rupee (₹)
        </footer>
      </div>
    );
  }

  /* =====================================================
     JOIN FLOW
     ===================================================== */
  function renderJoin() {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
          <button onClick={() => { history.replaceState(null, "", window.location.pathname); setView("landing"); }} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <i className="fa-solid fa-arrow-left" /> Back to home
          </button>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-center gap-3">
              <Logo size="sm" />
            </div>
            {joinLoading ? (
              <div className="py-10 text-center text-muted-foreground">
                <i className="fa-solid fa-spinner fa-spin text-xl text-primary" />
                <p className="mt-2 text-sm">Loading trip…</p>
                <p className="mt-1 text-xs text-muted-foreground/70">First load can take a few seconds while the server wakes up.</p>
              </div>
            ) : !joinTrip ? (
              <div className="py-6 text-center">
                <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${joinError === "notfound" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}>
                  <i className={`fa-solid ${joinError === "notfound" ? "fa-triangle-exclamation" : "fa-wifi"} text-xl`} />
                </div>
                <h2 className="mt-3 font-heading text-lg font-semibold">{joinError === "notfound" ? "Trip not found" : "Connection problem"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {joinError === "notfound" ? (
                    <>No trip exists with ID <span className="font-mono text-foreground">{joinTripId}</span>. Double-check the link with whoever shared it.</>
                  ) : (
                    <>We couldn't reach the server to load trip <span className="font-mono text-foreground">{joinTripId}</span>. Check your internet and try again.</>
                  )}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Btn variant="primary" onClick={() => loadJoinTrip(joinTripId)}>
                    <i className="fa-solid fa-rotate-right" /> Retry
                  </Btn>
                  <Btn variant="outline" onClick={() => { history.replaceState(null, "", window.location.pathname); setView("landing"); }}>
                    <i className="fa-solid fa-house" /> Go Home
                  </Btn>
                </div>
              </div>
            ) : joinTrip.isClosed ? (
              <div className="py-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning/10 text-warning">
                  <i className="fa-solid fa-lock text-xl" />
                </div>
                <h2 className="mt-3 font-heading text-lg font-semibold">Trip is closed</h2>
                <p className="mt-1 text-sm text-muted-foreground">"{joinTrip.name}" is no longer accepting new members.</p>
              </div>
            ) : (
              <>
                <h1 className="font-heading text-2xl font-bold">{joinTrip.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Trip ID <span className="font-mono text-foreground">{joinTrip.tripId}</span> · {joinTrip.members.length} member{joinTrip.members.length !== 1 ? "s" : ""}
                </p>

                <div className="mt-6">
                  <span className="mb-2 block text-xs font-medium text-muted-foreground">Select your name to continue</span>
                  <div className="spl-scroll max-h-64 space-y-2 overflow-y-auto pr-1">
                    {joinTrip.members.map((m) => (
                      <button
                        key={m.memberId}
                        onClick={() => joinAsMember(joinTrip.tripId, m.memberId)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                      >
                        <Avatar name={m.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{m.phone}</p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 border-t border-border pt-5">
                  <p className="text-sm text-muted-foreground">Not in the list?</p>
                  <Btn variant="outline" className="mt-2 w-full" onClick={() => setModal({ type: "joinRequest" })}>
                    <i className="fa-solid fa-user-plus" /> Request to Join
                  </Btn>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  /* =====================================================
     DASHBOARD
     ===================================================== */
  function renderDashboard() {
    if (!trip || !me) return null;
    // Called as plain functions (not JSX components): components defined inside Home
    // get a fresh identity every render, which made React remount the whole subtree
    // and wipe in-progress form state (e.g. when a toast auto-dismissed).
    return session?.role === "creator" ? CreatorDashboard() : MemberDashboard();
  }

  /* ---------- Creator Dashboard ---------- */
  function CreatorDashboard() {
    if (!trip || !me) return null;
    const nav = [
      { id: "overview", label: "Overview", icon: "fa-gauge-high" },
      { id: "members", label: "Members", icon: "fa-users" },
      { id: "expenses", label: "Expenses", icon: "fa-receipt" },
      { id: "handovers", label: "Handovers", icon: "fa-hand-holding-dollar" },
      { id: "settlements", label: "Settlements", icon: "fa-arrow-right-arrow-left" },
      { id: "pending", label: "Pending", icon: "fa-hourglass-half", badge: pendingCount },
      { id: "settings", label: "Settings", icon: "fa-gear" },
    ];

    const navEl = (
      <nav className="flex flex-col gap-1">
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => { setCreatorTab(n.id); setSidebarOpen(false); }}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              creatorTab === n.id ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-3">
              <i className={`fa-solid ${n.icon} w-4 text-center`} />
              {n.label}
            </span>
            {n.badge ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${creatorTab === n.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-danger text-white"}`}>{n.badge}</span> : null}
          </button>
        ))}
      </nav>
    );

    return (
      <div className="min-h-screen bg-background">
        {/* mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-foreground">
            <i className="fa-solid fa-bars" />
          </button>
          <Logo size="sm" />
          <button onClick={shareLink} className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-foreground">
            <i className="fa-solid fa-share-nodes" />
          </button>
        </div>

        <div className="flex">
          {/* sidebar desktop */}
          <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card/40 p-4 lg:flex">
            <div className="px-2 py-2">
              <Logo size="sm" />
            </div>
            <div className="mt-4 rounded-xl border border-border bg-background/40 px-3 py-2.5">
              <p className="truncate text-sm font-semibold">{trip.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="font-mono">{trip.tripId}</span>
                {trip.isClosed && <Badge tone="warning">Closed</Badge>}
                {trip.approvalMode === "manual" && <Badge tone="info">Manual</Badge>}
              </p>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto spl-scroll">{navEl}</div>
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Avatar name={me.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{me.name}</p>
                  <p className="text-[10px] text-primary">Creator</p>
                </div>
              </div>
              <button onClick={clearSession} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-danger/10 hover:text-danger">
                <i className="fa-solid fa-right-from-bracket w-4 text-center" /> Log out
              </button>
            </div>
          </aside>

          {/* sidebar mobile drawer */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
              <div className="absolute inset-0 bg-black/60" />
              <aside className="absolute left-0 top-0 h-full w-72 border-r border-border bg-card p-4 spl-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <Logo size="sm" />
                  <button onClick={() => setSidebarOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary">
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
                <div className="mt-4 rounded-xl border border-border bg-background/40 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold">{trip.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground font-mono">{trip.tripId}</p>
                </div>
                <div className="mt-4">{navEl}</div>
                <button onClick={clearSession} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-danger/10 hover:text-danger">
                  <i className="fa-solid fa-right-from-bracket w-4" /> Log out
                </button>
              </aside>
            </div>
          )}

          {/* content */}
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              {trip.isClosed && (
                <div className="mb-5 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
                  <i className="fa-solid fa-lock" /> This trip is closed. New expenses, handovers, and members are disabled. Settlements remain active.
                </div>
              )}
              {creatorTab === "overview" && OverviewTab()}
              {creatorTab === "members" && MembersTab()}
              {creatorTab === "expenses" && ExpensesTab()}
              {creatorTab === "handovers" && HandoversTab()}
              {creatorTab === "settlements" && SettlementsTab()}
              {creatorTab === "pending" && PendingTab()}
              {creatorTab === "settings" && (
                <SettingsInline trip={trip} password={session?.password || ""} onSave={saveSettings} onCloseTrip={closeTrip} onDeleteTrip={deleteTrip} onShare={shareLink} />
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* ---------- Member Dashboard ---------- */
  function MemberDashboard() {
    if (!trip || !me) return null;
    const tabs = [
      { id: "myview" as const, label: "My View", icon: "fa-gauge-high" },
      { id: "addexp" as const, label: "Add Expense", icon: "fa-receipt" },
      { id: "addhand" as const, label: "Add Handover", icon: "fa-hand-holding-dollar" },
      { id: "history" as const, label: "History", icon: "fa-clock-rotate-left" },
    ];
    const myBalance = balances.find((b) => b.memberId === me.memberId)?.net || 0;

    return (
      <div className="min-h-screen bg-background">
        {/* sticky header */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Logo size="sm" />
            <div className="flex items-center gap-2">
              <Badge tone={myBalance > 0.01 ? "primary" : myBalance < -0.01 ? "danger" : "muted"}>
                {myBalance > 0.01 ? `Get back ${formatINR(myBalance)}` : myBalance < -0.01 ? `Owe ${formatINR(-myBalance)}` : "All settled"}
              </Badge>
              <button onClick={clearSession} className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-muted-foreground hover:text-danger" title="Leave trip">
                <i className="fa-solid fa-right-from-bracket" />
              </button>
            </div>
          </div>
        </header>

        {/* trip name strip */}
        <div className="border-b border-border bg-card/40">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
            <i className="fa-solid fa-suitcase-rolling text-primary" />
            <span className="font-medium text-foreground">{trip.name}</span>
            <span className="font-mono">· {trip.tripId}</span>
            {trip.isClosed && <Badge tone="warning">Closed</Badge>}
          </div>
        </div>

        {/* sticky tabs */}
        <div className="sticky top-[57px] z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setMemberTab(t.id)}
                className={`relative flex flex-1 items-center justify-center gap-2 px-2 py-3 text-xs font-medium transition-colors sm:text-sm ${
                  memberTab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className={`fa-solid ${t.icon}`} />
                <span className="hidden sm:inline">{t.label}</span>
                {memberTab === t.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </div>

        <main className="mx-auto max-w-3xl px-4 py-6">
          {trip.isClosed && memberTab !== "myview" && memberTab !== "history" && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
              <i className="fa-solid fa-lock" /> This trip is closed. You can't add new entries.
            </div>
          )}
          {memberTab === "myview" && MyViewTab()}
          {memberTab === "addexp" && (
            trip.isClosed ? <Empty icon="fa-solid fa-lock" title="Trip is closed" message="New expenses can't be added." /> :
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 font-heading text-lg font-semibold">Add an Expense</h2>
              <ExpenseForm trip={trip} memberId={me.memberId} toast={toast} onSuccess={(t) => { setTrip(t); setMemberTab("history"); }} onCancel={() => setMemberTab("myview")} />
            </div>
          )}
          {memberTab === "addhand" && (
            trip.isClosed ? <Empty icon="fa-solid fa-lock" title="Trip is closed" message="New handovers can't be added." /> :
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 font-heading text-lg font-semibold">Record a Handover</h2>
              <HandoverForm trip={trip} memberId={me.memberId} toast={toast} onSuccess={(t) => { setTrip(t); setMemberTab("history"); }} onCancel={() => setMemberTab("myview")} />
            </div>
          )}
          {memberTab === "history" && HistoryTab()}
        </main>
      </div>
    );
  }

  /* =====================================================
     TABS
     ===================================================== */
  function OverviewTab() {
    if (!trip || !me) return null;
    const totalSpent = trip.expenses.filter((e) => e.status === "approved").reduce((a, e) => a + e.amount, 0);
    const myBalance = balances.find((b) => b.memberId === me.memberId)?.net || 0;
    const pendingExp = trip.expenses.filter((e) => e.status === "pending");
    const recent = [...trip.expenses, ...trip.handovers.map((h) => ({ _kind: "handover" as const, createdAt: h.createdAt, _ref: h }))]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 6);

    // category breakdown
    const catTotals: Record<string, number> = {};
    for (const e of trip.expenses) if (e.status === "approved") catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    const cats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

    return (
      <div className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Overview</h1>
            <p className="text-sm text-muted-foreground">Created {formatDate(trip.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <Btn variant="outline" onClick={shareLink}><i className="fa-solid fa-share-nodes" /> Share</Btn>
            <Btn variant="primary" onClick={() => setModal({ type: "addExpense" })} disabled={trip.isClosed}><i className="fa-solid fa-plus" /> Expense</Btn>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon="fa-indian-rupee-sign" tone="primary" label="Total Spent" value={formatINR(totalSpent)} />
          <StatCard icon="fa-users" tone="info" label="Members" value={String(trip.members.length)} />
          <StatCard icon="fa-receipt" tone="warning" label="Expenses" value={String(trip.expenses.length)} />
          <StatCard icon={myBalance >= 0 ? "fa-arrow-down" : "fa-arrow-up"} tone={myBalance > 0.01 ? "primary" : myBalance < -0.01 ? "danger" : "muted"} label="Your Balance" value={formatINR(myBalance)} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-heading font-semibold">Recent Activity</h3>
            {recent.length === 0 ? <Empty icon="fa-solid fa-inbox" title="No activity yet" /> : (
              <ul className="space-y-2">
                {recent.map((r, i) => {
                  if ("_kind" in r) {
                    const ho = r._ref;
                    return (
                      <li key={i} className="flex items-center gap-3 rounded-xl bg-background/40 px-3 py-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-warning/10 text-warning"><i className="fa-solid fa-hand-holding-dollar text-xs" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{memberName(trip, ho.fromId)} → {memberName(trip, ho.toId)}</p>
                          <p className="text-[11px] text-muted-foreground">{timeAgo(ho.createdAt)}</p>
                        </div>
                        <span className="text-sm font-semibold text-warning">{formatINR(ho.amount)}</span>
                      </li>
                    );
                  }
                  return (
                    <li key={i} className="flex items-center gap-3 rounded-xl bg-background/40 px-3 py-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${categoryMeta(r.category, trip).color}22`, color: categoryMeta(r.category, trip).color }}>
                        <i className={`fa-solid ${categoryMeta(r.category, trip).icon} text-xs`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{r.description}</p>
                        <p className="text-[11px] text-muted-foreground">{memberName(trip, r.paidBy)} · {timeAgo(r.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatINR(r.amount)}</p>
                        {r.status === "pending" && <Badge tone="warning">Pending</Badge>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-heading font-semibold">Spending by Category</h3>
            {cats.length === 0 ? <Empty icon="fa-solid fa-chart-pie" title="No expenses yet" /> : (
              <div className="space-y-3">
                {cats.map(([id, total]) => {
                  const c = categoryMeta(id, trip);
                  const pct = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
                  return (
                    <div key={id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><i className={`fa-solid ${c.icon}`} style={{ color: c.color }} /> {c.name}</span>
                        <span className="font-medium">{formatINR(total)} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {pendingExp.length > 0 && (
          <section className="rounded-2xl border border-warning/40 bg-warning/5 p-5">
            <h3 className="mb-3 flex items-center gap-2 font-heading font-semibold text-warning">
              <i className="fa-solid fa-hourglass-half" /> Pending Approval ({pendingExp.length})
            </h3>
            <div className="space-y-2">
              {pendingExp.map((e) => (
                <div key={e.expenseId} className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${categoryMeta(e.category, trip).color}22`, color: categoryMeta(e.category, trip).color }}>
                    <i className={`fa-solid ${categoryMeta(e.category, trip).icon} text-xs`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{e.description}</p>
                    <p className="text-[11px] text-muted-foreground">by {memberName(trip, e.createdBy)} · {timeAgo(e.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold">{formatINR(e.amount)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  function MembersTab() {
    if (!trip) return null;
    return (
      <div className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Members</h1>
            <p className="text-sm text-muted-foreground">{trip.members.length} member{trip.members.length !== 1 ? "s" : ""} in this trip</p>
          </div>
          <Btn variant="primary" onClick={() => setModal({ type: "addMember" })} disabled={trip.isClosed}><i className="fa-solid fa-user-plus" /> Add Member</Btn>
        </header>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {trip.members.map((m, i) => (
            <div key={m.memberId} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <Avatar name={m.name} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{m.name}</p>
                  {i === 0 && <Badge tone="primary"><i className="fa-solid fa-crown" /> Creator</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground"><i className="fa-solid fa-phone mr-1" />{m.phone}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Joined {timeAgo(m.joinedAt)}</p>
              </div>
              {session?.role === "creator" && i !== 0 && !trip.isClosed && (
                <IconBtn title="Remove member" tone="danger" onClick={() => removeMember(m)}><i className="fa-solid fa-user-minus" /></IconBtn>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function ExpensesTab() {
    if (!trip || !me) return null;
    const list = trip.expenses
      .filter((e) => expFilter === "all" || e.status === expFilter)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return (
      <div className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Expenses</h1>
            <p className="text-sm text-muted-foreground">{trip.expenses.length} total · {trip.expenses.filter((e) => e.status === "pending").length} pending</p>
          </div>
          <Btn variant="primary" onClick={() => setModal({ type: "addExpense" })} disabled={trip.isClosed}><i className="fa-solid fa-plus" /> Add Expense</Btn>
        </header>
        <div className="flex gap-2">
          {(["all", "approved", "pending"] as const).map((f) => (
            <button key={f} onClick={() => setExpFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${expFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {f}
            </button>
          ))}
        </div>
        {list.length === 0 ? <Empty icon="fa-solid fa-receipt" title="No expenses yet" message="Add the first expense to get started." action={!trip.isClosed && <Btn variant="primary" onClick={() => setModal({ type: "addExpense" })}><i className="fa-solid fa-plus" /> Add Expense</Btn>} /> : (
          <div className="space-y-2.5">
            {list.map((e) => (
              <ExpenseRow key={e.expenseId} e={e} />
            ))}
          </div>
        )}
      </div>
    );
  }

  function ExpenseRow({ e }: { e: Expense }) {
    if (!trip || !me) return null;
    const isOwner = e.createdBy === me.memberId;
    const c = categoryMeta(e.category, trip);
    return (
      <div className={`rounded-2xl border bg-card p-4 ${e.status === "pending" ? "border-warning/40" : "border-border"}`}>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${c.color}22`, color: c.color }}>
            <i className={`fa-solid ${c.icon}`} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{e.description}</p>
              {e.status === "pending" ? <Badge tone="warning"><i className="fa-solid fa-hourglass-half" /> Pending</Badge> : <Badge tone="primary">Approved</Badge>}
              <CategoryChip id={e.category} trip={trip} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Paid by <span className="text-foreground">{memberName(trip, e.paidBy)}</span> · added by <span className="text-foreground">{memberName(trip, e.createdBy)}</span> · {timeAgo(e.createdAt)} · {e.splitType === "equal" ? "equal split" : "custom split"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {e.splits.map((s) => (
                <span key={s.memberId} className={`rounded-md px-2 py-0.5 text-[11px] ${s.memberId === e.paidBy ? "bg-primary/10 text-primary" : "bg-secondary/60 text-muted-foreground"}`}>
                  {memberName(trip, s.memberId)}: {formatINR(s.amount)}
                  {s.memberId === e.paidBy && " (paid)"}
                  {s.note && <span className="italic opacity-80"> — {s.note}</span>}
                </span>
              ))}
            </div>
            {e.splitType === "equal" && new Set(e.splits.map((s) => s.amount)).size > 1 && (
              <p className="mt-1.5 text-[11px] text-muted-foreground"><i className="fa-solid fa-circle-info mr-1 text-primary" />Shares differ by ₹0.01 due to paise rounding — they add up to exactly {formatINR(e.amount)}.</p>
            )}
            {e.splitType === "equal" && e.reason && <p className="mt-2 text-xs text-muted-foreground"><i className="fa-solid fa-quote-left mr-1 opacity-50" />{e.reason}</p>}
            {e.splitType === "custom" && e.explanation && <p className="mt-2 text-xs text-muted-foreground"><i className="fa-solid fa-quote-left mr-1 opacity-50" />{e.explanation}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="font-heading text-lg font-bold">{formatINR(e.amount)}</span>
            <div className="flex gap-1">
              {e.status === "pending" && session?.role === "creator" ? (
                <>
                  <IconBtn title="Approve" tone="primary" onClick={() => approveExpense(e)}><i className="fa-solid fa-check" /></IconBtn>
                  <IconBtn title="Reject" tone="danger" onClick={() => rejectExpense(e)}><i className="fa-solid fa-xmark" /></IconBtn>
                </>
              ) : (
                <>
                  {isOwner && e.status === "approved" && !trip.isClosed && <IconBtn title="Edit" onClick={() => setModal({ type: "editExpense", expense: e })}><i className="fa-solid fa-pen" /></IconBtn>}
                  {isOwner && !trip.isClosed && <IconBtn title="Delete" tone="danger" onClick={() => deleteExpense(e)}><i className="fa-solid fa-trash" /></IconBtn>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function HandoversTab() {
    if (!trip || !me) return null;
    const list = [...trip.handovers].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return (
      <div className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Handovers</h1>
            <p className="text-sm text-muted-foreground">Cash transfers that adjust balances</p>
          </div>
          <Btn variant="warning" onClick={() => setModal({ type: "addHandover" })} disabled={trip.isClosed}><i className="fa-solid fa-plus" /> Add Handover</Btn>
        </header>
        {list.length === 0 ? <Empty icon="fa-solid fa-hand-holding-dollar" title="No handovers yet" message="Record a cash transfer between members." action={!trip.isClosed && <Btn variant="warning" onClick={() => setModal({ type: "addHandover" })}><i className="fa-solid fa-plus" /> Add Handover</Btn>} /> : (
          <div className="space-y-2.5">
            {list.map((ho) => {
              const isOwner = ho.createdBy === me.memberId;
              return (
                <div key={ho.handoverId} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/10 text-warning"><i className="fa-solid fa-hand-holding-dollar" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Avatar name={memberName(trip, ho.fromId)} size={24} />
                        <span className="text-sm font-medium">{memberName(trip, ho.fromId)}</span>
                        <i className="fa-solid fa-arrow-right text-muted-foreground" />
                        <Avatar name={memberName(trip, ho.toId)} size={24} />
                        <span className="text-sm font-medium">{memberName(trip, ho.toId)}</span>
                      </div>
                      {ho.note && <p className="mt-1.5 text-xs text-muted-foreground"><i className="fa-solid fa-quote-left mr-1 opacity-50" />{ho.note}</p>}
                      <p className="mt-1 text-[11px] text-muted-foreground">by {memberName(trip, ho.createdBy)} · {timeAgo(ho.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-heading text-lg font-bold text-warning">{formatINR(ho.amount)}</span>
                      {isOwner && !trip.isClosed && <IconBtn title="Delete" tone="danger" onClick={() => deleteHandover(ho)}><i className="fa-solid fa-trash" /></IconBtn>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function SettlementsTab() {
    if (!trip || !me) return null;
    const debtors = balances.filter((b) => b.net < -0.005).sort((a, b) => a.net - b.net);
    const creditors = balances.filter((b) => b.net > 0.005).sort((a, b) => b.net - a.net);
    const allEven = debtors.length === 0 && creditors.length === 0;
    const pending = trip.settlements.filter((s) => s.status === "pending");
    const paid = trip.settlements.filter((s) => s.status === "paid");
    const completed = trip.settlements.filter((s) => s.status === "completed");

    return (
      <div className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Settlements</h1>
            <p className="text-sm text-muted-foreground">Auto-netted for minimum transactions</p>
          </div>
          {session?.role === "creator" && <Btn variant="outline" onClick={recomputeSettlements}><i className="fa-solid fa-rotate" /> Recalculate</Btn>}
        </header>

        {/* balances */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-1 font-heading font-semibold">Net Balances</h3>
          <p className="mb-3 text-xs text-muted-foreground">Tap a member to see which expenses &amp; handovers make up their balance.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {trip.members.map((m) => {
              const b = balances.find((x) => x.memberId === m.memberId);
              const net = b?.net || 0;
              const paidExp = trip.expenses.filter((e) => e.status === "approved" && e.paidBy === m.memberId);
              const shares = trip.expenses
                .filter((e) => e.status === "approved")
                .map((e) => ({ e, amt: e.splits.find((s) => s.memberId === m.memberId)?.amount || 0 }))
                .filter((x) => x.amt > 0);
              const hos = trip.handovers.filter((h) => h.fromId === m.memberId || h.toId === m.memberId);
              const setts = trip.settlements.filter((s) => s.status !== "pending" && (s.fromId === m.memberId || s.toId === m.memberId));
              return (
                <details key={m.memberId} className="group rounded-xl bg-background/40">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                    <Avatar name={m.name} size={32} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</span>
                    <span className={`text-sm font-semibold ${net > 0.01 ? "text-primary" : net < -0.01 ? "text-danger" : "text-muted-foreground"}`}>
                      {net > 0.01 ? `+${formatINR(net)}` : net < -0.01 ? formatINR(net) : "settled"}
                    </span>
                    <i className="fa-solid fa-chevron-down text-xs text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-1.5 border-t border-border px-3 py-2.5 text-xs">
                    <div className="flex justify-between font-medium"><span>Paid for expenses</span><span className="text-primary">+{formatINR(b?.paid || 0)}</span></div>
                    {paidExp.map((e) => (
                      <div key={e.expenseId} className="flex justify-between pl-3 text-muted-foreground"><span className="truncate">{e.description}</span><span className="shrink-0">+{formatINR(e.amount)}</span></div>
                    ))}
                    <div className="flex justify-between font-medium"><span>Share of expenses</span><span className="text-danger">-{formatINR(b?.share || 0)}</span></div>
                    {shares.map(({ e, amt }) => (
                      <div key={e.expenseId} className="flex justify-between pl-3 text-muted-foreground"><span className="truncate">{e.description}</span><span className="shrink-0">-{formatINR(amt)}</span></div>
                    ))}
                    {hos.length > 0 && (
                      <>
                        <div className="flex justify-between font-medium"><span>Handovers</span><span>{formatINR((b?.handoverGiven || 0) - (b?.handoverReceived || 0))}</span></div>
                        {hos.map((h) => (
                          <div key={h.handoverId} className="flex justify-between pl-3 text-muted-foreground">
                            <span className="truncate">{memberName(trip, h.fromId)} → {memberName(trip, h.toId)}{h.note && ` (${h.note})`}</span>
                            <span className="shrink-0">{h.fromId === m.memberId ? "+" : "-"}{formatINR(h.amount)}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {setts.length > 0 && (
                      <>
                        <div className="flex justify-between font-medium"><span>Settlements (paid/completed)</span><span>{formatINR((b?.settlementGiven || 0) - (b?.settlementReceived || 0))}</span></div>
                        {setts.map((s) => (
                          <div key={s.id} className="flex justify-between pl-3 text-muted-foreground">
                            <span className="truncate">{memberName(trip, s.fromId)} → {memberName(trip, s.toId)}</span>
                            <span className="shrink-0">{s.fromId === m.memberId ? "+" : "-"}{formatINR(s.amount)}</span>
                          </div>
                        ))}
                      </>
                    )}
                    <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                      <span>Net</span>
                      <span className={net > 0.01 ? "text-primary" : net < -0.01 ? "text-danger" : ""}>{formatINR(net)}</span>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        {allEven && pending.length === 0 && paid.length === 0 ? (
          <Empty icon="fa-solid fa-circle-check" title="Everyone's settled up!" message="No outstanding balances." />
        ) : (
          <>
            {pending.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 flex items-center gap-2 font-heading font-semibold"><i className="fa-solid fa-clock text-muted-foreground" /> Suggested Payments</h3>
                <div className="space-y-2.5">
                  {pending.map((s) => <SettlementRow key={s.id} s={s} />)}
                </div>
              </section>
            )}
            {paid.length > 0 && (
              <section className="rounded-2xl border border-warning/40 bg-warning/5 p-5">
                <h3 className="mb-3 flex items-center gap-2 font-heading font-semibold text-warning"><i className="fa-solid fa-paper-plane" /> Awaiting Confirmation</h3>
                <div className="space-y-2.5">
                  {paid.map((s) => <SettlementRow key={s.id} s={s} />)}
                </div>
              </section>
            )}
            {completed.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 flex items-center gap-2 font-heading font-semibold text-primary"><i className="fa-solid fa-circle-check" /> Completed</h3>
                <div className="space-y-2.5">
                  {completed.map((s) => <SettlementRow key={s.id} s={s} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    );
  }

  function SettlementRow({ s }: { s: Settlement }) {
    if (!trip || !me) return null;
    const isPayer = s.fromId === me.memberId;
    const isReceiver = s.toId === me.memberId;
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-background/40 px-3 py-3">
        <Avatar name={memberName(trip, s.fromId)} size={32} />
        <span className="text-sm font-medium">{memberName(trip, s.fromId)}</span>
        <i className="fa-solid fa-arrow-right text-muted-foreground" />
        <Avatar name={memberName(trip, s.toId)} size={32} />
        <span className="text-sm font-medium">{memberName(trip, s.toId)}</span>
        <span className="ml-auto font-heading font-bold text-primary">{formatINR(s.amount)}</span>
        {s.status === "pending" && isPayer && <Btn variant="primary" className="px-3 py-1.5 text-xs" onClick={() => markPaid(s)}><i className="fa-solid fa-paper-plane" /> Mark Paid</Btn>}
        {s.status === "paid" && isReceiver && <Btn variant="primary" className="px-3 py-1.5 text-xs" onClick={() => markReceived(s)}><i className="fa-solid fa-circle-check" /> Mark Received</Btn>}
        {s.status === "pending" && <Badge tone="muted">Pending</Badge>}
        {s.status === "paid" && <Badge tone="warning">Paid</Badge>}
        {s.status === "completed" && <Badge tone="primary"><i className="fa-solid fa-check" /> Done</Badge>}
      </div>
    );
  }

  function PendingTab() {
    if (!trip) return null;
    const pendingExp = trip.expenses.filter((e) => e.status === "pending").sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return (
      <div className="space-y-5">
        <header>
          <h1 className="font-heading text-2xl font-bold">Pending</h1>
          <p className="text-sm text-muted-foreground">Join requests &amp; expenses awaiting approval</p>
        </header>
        <section>
          <h3 className="mb-2 font-heading font-semibold">Join Requests ({pendingJoins.length})</h3>
          {pendingJoins.length === 0 ? <Empty icon="fa-solid fa-user-plus" title="No join requests" /> : (
            <div className="space-y-2">
              {pendingJoins.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <Avatar name={p.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground"><i className="fa-solid fa-phone mr-1" />{p.phone} · {timeAgo(p.createdAt)}</p>
                  </div>
                  <IconBtn title="Approve" tone="primary" onClick={() => approveJoin(p)}><i className="fa-solid fa-check" /></IconBtn>
                  <IconBtn title="Reject" tone="danger" onClick={() => rejectJoin(p)}><i className="fa-solid fa-xmark" /></IconBtn>
                </div>
              ))}
            </div>
          )}
        </section>
        <section>
          <h3 className="mb-2 font-heading font-semibold">Expenses Awaiting Approval ({pendingExp.length})</h3>
          {pendingExp.length === 0 ? <Empty icon="fa-solid fa-receipt" title="No pending expenses" /> : (
            <div className="space-y-2.5">
              {pendingExp.map((e) => <ExpenseRow key={e.expenseId} e={e} />)}
            </div>
          )}
        </section>
      </div>
    );
  }

  /* ---------- Member tabs ---------- */
  function MyViewTab() {
    if (!trip || !me) return null;
    const b = balances.find((x) => x.memberId === me.memberId);
    const net = b?.net || 0;
    const myInvolved = trip.expenses
      .filter((e) => e.status === "approved" && (e.paidBy === me.memberId || e.splits.some((s) => s.memberId === me.memberId)))
      .sort((a, c) => +new Date(c.createdAt) - +new Date(a.createdAt));
    const myExpenses = trip.expenses.filter((e) => e.status === "approved" && e.paidBy === me.memberId);
    const myShare = trip.expenses.filter((e) => e.status === "approved").reduce((a, e) => a + (e.splits.find((s) => s.memberId === me.memberId)?.amount || 0), 0);
    const myPaid = myExpenses.reduce((a, e) => a + e.amount, 0);
    const handGiven = trip.handovers.filter((h) => h.fromId === me.memberId).reduce((a, h) => a + h.amount, 0);
    const handReceived = trip.handovers.filter((h) => h.toId === me.memberId).reduce((a, h) => a + h.amount, 0);

    // who I owe / who owes me (from pending settlements)
    const iOwe = trip.settlements.filter((s) => s.fromId === me.memberId && s.status !== "completed");
    const owesMe = trip.settlements.filter((s) => s.toId === me.memberId && s.status !== "completed");

    // Per-expense lines between me and one other member.
    // amt > 0 = adds to what I owe them; amt < 0 = adds to what they owe me.
    const pairLines = (otherId: string) => {
      const lines: { label: string; amt: number }[] = [];
      for (const e of trip.expenses) {
        if (e.status !== "approved") continue;
        const myShare = e.splits.find((s) => s.memberId === me.memberId)?.amount || 0;
        const theirShare = e.splits.find((s) => s.memberId === otherId)?.amount || 0;
        if (e.paidBy === otherId && myShare > 0) lines.push({ label: e.description, amt: myShare });
        if (e.paidBy === me.memberId && theirShare > 0) lines.push({ label: e.description, amt: -theirShare });
      }
      for (const h of trip.handovers) {
        if (h.fromId === me.memberId && h.toId === otherId) lines.push({ label: `Handover${h.note ? ` (${h.note})` : ""}`, amt: -h.amount });
        if (h.fromId === otherId && h.toId === me.memberId) lines.push({ label: `Handover${h.note ? ` (${h.note})` : ""}`, amt: h.amount });
      }
      return lines;
    };

    // sign: +1 when the row is "I pay them", -1 when the row is "they pay me"
    const settleBreakdown = (otherId: string, total: number, sign: 1 | -1) => {
      const lines = pairLines(otherId);
      const sum = round2(lines.reduce((a, l) => a + sign * l.amt, 0));
      const adjusted = Math.abs(sum - total) > 0.01;
      // When netting rerouted money, name the balances that got folded in: my direct
      // balances with members who have no settlement row with me of their own.
      const rerouted = adjusted
        ? trip.members
            .filter((m) => m.memberId !== me.memberId && m.memberId !== otherId)
            .filter((m) => !trip.settlements.some((st) => st.status !== "completed" && ((st.fromId === me.memberId && st.toId === m.memberId) || (st.fromId === m.memberId && st.toId === me.memberId))))
            .map((m) => ({ name: m.name, net: round2(pairLines(m.memberId).reduce((a, l) => a + l.amt, 0)) }))
            .filter((x) => Math.abs(x.net) > 0.01)
        : [];
      return (
        <div className="mt-1 space-y-1 border-t border-border pt-2 text-xs">
          {lines.length === 0 && !adjusted && (
            <p className="text-muted-foreground">No direct expenses between you two — this comes from smart netting across the group.</p>
          )}
          {lines.map((l, i) => {
            const v = sign * l.amt;
            return (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">{l.label}</span>
                <span className={`shrink-0 font-medium ${v >= 0 ? "" : "text-primary"}`}>
                  {v >= 0 ? formatINR(v) : `−${formatINR(-v)}`}
                </span>
              </div>
            );
          })}
          {adjusted && (
            <div className="pt-1">
              <p className="text-[11px] font-medium text-muted-foreground">
                <i className="fa-solid fa-shuffle mr-1 text-primary" />
                Smart netting: direct total between you two is {formatINR(Math.max(sum, 0))}; this payment is {formatINR(total)} because these balances were folded in:
              </p>
              <div className="mt-1 space-y-1">
                {rerouted.map((x) => (
                  <div key={x.name} className="flex items-center justify-between gap-2 pl-3">
                    <span className="truncate text-muted-foreground">
                      {x.net > 0 ? `You owe ${x.name} (direct)` : `${x.name} owes you (direct)`}
                    </span>
                    <span className={`shrink-0 font-medium ${x.net > 0 ? "" : "text-primary"}`}>{formatINR(Math.abs(x.net))}</span>
                  </div>
                ))}
                {rerouted.length === 0 && (
                  <p className="pl-3 text-muted-foreground">balances routed between other members of the group</p>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground/80">Everyone still ends up with the right amount — just in fewer transfers.</p>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/40 p-5">
          <p className="text-sm text-muted-foreground">Your net balance</p>
          <p className={`mt-1 font-heading text-4xl font-bold ${net > 0.01 ? "text-primary" : net < -0.01 ? "text-danger" : "text-foreground"}`}>
            {net > 0.01 ? `+${formatINR(net)}` : net < -0.01 ? formatINR(net) : formatINR(0)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {net > 0.01 ? "You're owed money overall." : net < -0.01 ? "You owe money overall." : "You're all settled up!"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="fa-arrow-up" tone="primary" label="You Paid" value={formatINR(myPaid)} />
          <StatCard icon="fa-arrow-down" tone="danger" label="Your Share" value={formatINR(myShare)} />
          <StatCard icon="fa-hand-holding-dollar" tone="warning" label="Handovers Given" value={formatINR(handGiven)} />
          <StatCard icon="fa-hand-holding-dollar" tone="info" label="Handovers Received" value={formatINR(handReceived)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-heading font-semibold text-danger"><i className="fa-solid fa-arrow-up" /> You Need to Pay</h3>
            {iOwe.length === 0 ? <p className="text-sm text-muted-foreground">Nothing pending. 🎉</p> : (
              <ul className="space-y-2">
                {iOwe.map((s) => (
                  <li key={s.id}>
                    <details className="group rounded-xl bg-background/40 px-3 py-2.5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-1.5 text-sm">
                          To <span className="font-medium">{memberName(trip, s.toId)}</span>
                          <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground transition-transform group-open:rotate-180" />
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-danger">{formatINR(s.amount)}</span>
                          {s.status === "pending" ? (
                            <Btn variant="primary" className="px-2.5 py-1 text-xs" onClick={(e) => { e.preventDefault(); e.stopPropagation(); markPaid(s); }}><i className="fa-solid fa-paper-plane" /> Mark Paid</Btn>
                          ) : (
                            <Badge tone="warning">Paid · awaiting</Badge>
                          )}
                        </span>
                      </summary>
                      {settleBreakdown(s.toId, s.amount, 1)}
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-heading font-semibold text-primary"><i className="fa-solid fa-arrow-down" /> You'll Receive</h3>
            {owesMe.length === 0 ? <p className="text-sm text-muted-foreground">Nothing pending.</p> : (
              <ul className="space-y-2">
                {owesMe.map((s) => (
                  <li key={s.id}>
                    <details className="group rounded-xl bg-background/40 px-3 py-2.5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-1.5 text-sm">
                          From <span className="font-medium">{memberName(trip, s.fromId)}</span>
                          <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground transition-transform group-open:rotate-180" />
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-primary">{formatINR(s.amount)}</span>
                          {s.status === "paid" ? (
                            <Btn variant="primary" className="px-2.5 py-1 text-xs" onClick={(e) => { e.preventDefault(); e.stopPropagation(); markReceived(s); }}><i className="fa-solid fa-circle-check" /> Mark Received</Btn>
                          ) : (
                            <Badge tone="muted">Waiting for payment</Badge>
                          )}
                        </span>
                      </summary>
                      {settleBreakdown(s.fromId, s.amount, -1)}
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Bug 4: per-expense breakdown — what each expense cost me and who owes what */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-heading font-semibold"><i className="fa-solid fa-list-ul text-primary" /> Your Expense Breakdown</h3>
          {myInvolved.length === 0 ? <p className="text-sm text-muted-foreground">No approved expenses involve you yet.</p> : (
            <div className="space-y-2">
              {myInvolved.map((e) => {
                const mine = e.splits.find((s) => s.memberId === me.memberId)?.amount || 0;
                return (
                  <details key={e.expenseId} className="group rounded-xl bg-background/40">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${categoryMeta(e.category, trip).color}22`, color: categoryMeta(e.category, trip).color }}>
                        <i className={`fa-solid ${categoryMeta(e.category, trip).icon} text-xs`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{e.description}</span>
                        <span className="block text-[11px] text-muted-foreground">Paid by {memberName(trip, e.paidBy)} · total {formatINR(e.amount)}</span>
                      </span>
                      <span className={`text-sm font-semibold ${e.paidBy === me.memberId ? "text-primary" : "text-danger"}`}>
                        {e.paidBy === me.memberId ? `+${formatINR(e.amount - mine)}` : `-${formatINR(mine)}`}
                      </span>
                      <i className="fa-solid fa-chevron-down text-xs text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-border px-3 py-2.5 text-xs">
                      <p className="text-muted-foreground">Your share: <span className="font-semibold text-foreground">{formatINR(mine)}</span>{e.paidBy === me.memberId && <> · You paid {formatINR(e.amount)}, so others owe you <span className="font-semibold text-primary">{formatINR(e.amount - mine)}</span></>}</p>
                      {(e.reason || e.explanation) && <p className="mt-1 text-muted-foreground"><i className="fa-solid fa-quote-left mr-1 opacity-50" />{e.splitType === "equal" ? e.reason : e.explanation}</p>}
                      <div className="mt-2 space-y-1">
                        {e.splits.map((s) => (
                          <div key={s.memberId} className="flex items-center justify-between gap-2">
                            <span className={s.memberId === me.memberId ? "font-medium text-foreground" : "text-muted-foreground"}>
                              {memberName(trip, s.memberId)}{s.memberId === me.memberId && " (you)"}
                              {s.note && <span className="ml-1.5 italic text-muted-foreground/80">— {s.note}</span>}
                            </span>
                            <span className="shrink-0">
                              {s.memberId === e.paidBy ? <span className="text-muted-foreground">own share {formatINR(s.amount)}</span> : <>owes {memberName(trip, e.paidBy)} <span className="font-medium text-foreground">{formatINR(s.amount)}</span></>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  function HistoryTab() {
    if (!trip || !me) return null;
    const myExp = trip.expenses.filter((e) => e.createdBy === me.memberId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const myHand = trip.handovers.filter((h) => h.createdBy === me.memberId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return (
      <div className="space-y-5">
        <header>
          <h1 className="font-heading text-2xl font-bold">Your History</h1>
          <p className="text-sm text-muted-foreground">Expenses &amp; handovers you created</p>
        </header>
        <section>
          <h3 className="mb-2 font-heading font-semibold">Your Expenses ({myExp.length})</h3>
          {myExp.length === 0 ? <Empty icon="fa-solid fa-receipt" title="No expenses yet" /> : (
            <div className="space-y-2.5">
              {myExp.map((e) => <ExpenseRow key={e.expenseId} e={e} />)}
            </div>
          )}
        </section>
        <section>
          <h3 className="mb-2 font-heading font-semibold">Your Handovers ({myHand.length})</h3>
          {myHand.length === 0 ? <Empty icon="fa-solid fa-hand-holding-dollar" title="No handovers yet" /> : (
            <div className="space-y-2.5">
              {myHand.map((ho) => {
                const isOwner = ho.createdBy === me.memberId;
                return (
                  <div key={ho.handoverId} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/10 text-warning"><i className="fa-solid fa-hand-holding-dollar" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{memberName(trip, ho.fromId)} → {memberName(trip, ho.toId)}</p>
                        {ho.note && <p className="mt-0.5 text-xs text-muted-foreground">{ho.note}</p>}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(ho.createdAt)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-heading font-bold text-warning">{formatINR(ho.amount)}</span>
                        {isOwner && !trip.isClosed && <IconBtn title="Delete" tone="danger" onClick={() => deleteHandover(ho)}><i className="fa-solid fa-trash" /></IconBtn>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  /* ---------- render ---------- */
  return (
    <div className="min-h-screen bg-background">
      {toastsEl}
      {view === "landing" && renderLanding()}
      {view === "join" && renderJoin()}
      {view === "dashboard" && renderDashboard()}
      {renderModal()}
      <OnboardingWizard key={showOnboarding ? "open" : "closed"} open={showOnboarding} onComplete={closeOnboarding} onSkip={closeOnboarding} />
    </div>
  );
}

/* =====================================================================
   Small shared components (outside main for reusability)
   ===================================================================== */
function StatCard({ icon, label, value, tone = "muted" }: { icon: string; label: string; value: string; tone?: "primary" | "warning" | "danger" | "muted" | "info" }) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    muted: "bg-secondary text-muted-foreground",
    info: "bg-sky-400/10 text-sky-300",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${tones[tone]}`}>
        <i className={`fa-solid ${icon} text-sm`} />
      </div>
      <p className="mt-2.5 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-heading text-xl font-bold">{value}</p>
    </div>
  );
}

function IconBtn({ children, title, tone = "muted", onClick }: { children: ReactNode; title: string; tone?: "primary" | "danger" | "muted"; onClick: () => void }) {
  const tones = {
    primary: "bg-primary/10 text-primary hover:bg-primary/20",
    danger: "bg-danger/10 text-danger hover:bg-danger/20",
    muted: "bg-secondary text-muted-foreground hover:text-foreground",
  };
  return (
    <button title={title} onClick={onClick} className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${tones[tone]}`}>
      {children}
    </button>
  );
}

/* =====================================================================
   Add Member Modal
   ===================================================================== */
function AddMemberModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string, phone: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  // ref guard: state updates are async, so a fast double-click could pass a
  // `busy` check twice before the re-render lands. The ref flips synchronously.
  const busyRef = useRef(false);
  async function submit() {
    if (!name.trim() || !phone.trim() || busyRef.current) return;
    busyRef.current = true;
    try {
      setBusy(true);
      await onAdd(name.trim(), phone.trim());
    } catch {
      // error already toasted by mutate(); keep the modal open for retry
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal open onClose={onClose} title="Add Member" subtitle="Add a person directly to the trip." icon={<i className="fa-solid fa-user-plus" />}>
      <div className="space-y-4">
        <Field label="Name" required>
          <Inp value={name} onChange={(e) => setName(e.target.value)} placeholder="Member name" autoFocus disabled={busy} />
        </Field>
        <Field label="Phone" required>
          <Inp value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone" disabled={busy} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={busy}>
            {busy ? <><i className="fa-solid fa-spinner fa-spin" /> Adding…</> : <><i className="fa-solid fa-plus" /> Add</>}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* =====================================================================
   Join Request Modal
   ===================================================================== */
function JoinRequestModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, phone: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  async function submit() {
    if (!name.trim() || !phone.trim() || busyRef.current) return;
    busyRef.current = true;
    try {
      setBusy(true);
      await onSubmit(name.trim(), phone.trim());
    } catch {
      // error already toasted; keep the modal open for retry
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal open onClose={onClose} title="Request to Join" subtitle="The trip creator will review your request." icon={<i className="fa-solid fa-user-plus" />}>
      <div className="space-y-4">
        <Field label="Your Name" required>
          <Inp value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" autoFocus disabled={busy} />
        </Field>
        <Field label="Your Phone" required>
          <Inp value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone" disabled={busy} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={busy}>
            {busy ? <><i className="fa-solid fa-spinner fa-spin" /> Submitting…</> : <><i className="fa-solid fa-paper-plane" /> Submit Request</>}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* =====================================================================
   Settings (Modal + Inline)
   ===================================================================== */
const ICON_CHOICES = [
  "fa-utensils", "fa-plane", "fa-bed", "fa-bag-shopping", "fa-film",
  "fa-kit-medical", "fa-mug-saucer", "fa-car", "fa-bus", "fa-train",
  "fa-gas-pump", "fa-ticket", "fa-camera", "fa-gift", "fa-paw",
];
const COLOR_CHOICES = ["#10b981", "#38bdf8", "#f59e0b", "#ec4899", "#a78bfa", "#ef4444", "#94a3b8", "#f97316", "#22d3ee", "#84cc16"];

function SettingsBody({
  trip, onSave, onCloseTrip, onDeleteTrip, onShare,
}: {
  trip: Trip;
  onSave: (name: string, mode: "auto" | "manual", cats: CustomCategory[]) => void;
  onCloseTrip: () => void;
  onDeleteTrip: () => void;
  onShare: () => void;
}) {
  const [name, setName] = useState(trip.name);
  const [mode, setMode] = useState<"auto" | "manual">(trip.approvalMode);
  const [cats, setCats] = useState<CustomCategory[]>(trip.customCategories || []);
  const [newCat, setNewCat] = useState({ name: "", icon: ICON_CHOICES[0], color: COLOR_CHOICES[0] });

  function addCat() {
    if (!newCat.name.trim()) return;
    setCats((c) => [...c, { id: `cat_${Date.now()}`, name: newCat.name.trim(), icon: newCat.icon, color: newCat.color }]);
    setNewCat({ name: "", icon: ICON_CHOICES[0], color: COLOR_CHOICES[0] });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h4 className="font-heading font-semibold">Trip Details</h4>
        <Field label="Trip Name">
          <Inp value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Approval Mode">
          <div className="grid grid-cols-2 gap-2">
            {(["auto", "manual"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-xl border px-3 py-2 text-sm ${mode === m ? "border-primary bg-primary/10" : "border-border"}`}>
                {m === "auto" ? "Auto Approve" : "Manual Approve"}
              </button>
            ))}
          </div>
        </Field>
      </section>

      <section className="space-y-3">
        <h4 className="font-heading font-semibold">Custom Categories</h4>
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{ background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}44` }}>
                <i className={`fa-solid ${c.icon}`} /> {c.name}
                <button onClick={() => setCats((prev) => prev.filter((x) => x.id !== c.id))} className="ml-0.5 hover:opacity-70"><i className="fa-solid fa-xmark" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="rounded-xl border border-border bg-background/40 p-3 space-y-3">
          <Inp placeholder="Category name" value={newCat.name} onChange={(e) => setNewCat((p) => ({ ...p, name: e.target.value }))} />
          <div>
            <p className="mb-1.5 text-[11px] text-muted-foreground">Icon</p>
            <div className="flex flex-wrap gap-1.5">
              {ICON_CHOICES.map((ic) => (
                <button key={ic} type="button" onClick={() => setNewCat((p) => ({ ...p, icon: ic }))} className={`grid h-8 w-8 place-items-center rounded-lg ${newCat.icon === ic ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  <i className={`fa-solid ${ic} text-xs`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] text-muted-foreground">Color</p>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_CHOICES.map((col) => (
                <button key={col} type="button" onClick={() => setNewCat((p) => ({ ...p, color: col }))} className={`h-7 w-7 rounded-full ${newCat.color === col ? "ring-2 ring-offset-2 ring-offset-card ring-white" : ""}`} style={{ background: col }} />
              ))}
            </div>
          </div>
          <Btn variant="outline" className="w-full" onClick={addCat}><i className="fa-solid fa-plus" /> Add Category</Btn>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="font-heading font-semibold">Share Trip</h4>
        <p className="text-xs text-muted-foreground">Anyone with this link can join as a member.</p>
        <Btn variant="outline" className="w-full" onClick={onShare}><i className="fa-solid fa-share-nodes" /> Copy Join Link</Btn>
      </section>

      <div className="flex justify-end">
        <Btn variant="primary" onClick={() => onSave(name, mode, cats)}><i className="fa-solid fa-floppy-disk" /> Save Settings</Btn>
      </div>

      <section className="space-y-3 border-t border-border pt-5">
        <h4 className="font-heading font-semibold text-danger">Danger Zone</h4>
        {!trip.isClosed && (
          <div className="flex items-center justify-between rounded-xl border border-warning/40 bg-warning/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Close Trip</p>
              <p className="text-xs text-muted-foreground">Lock new entries. Settlements stay active.</p>
            </div>
            <Btn variant="warning" onClick={onCloseTrip}><i className="fa-solid fa-lock" /> Close</Btn>
          </div>
        )}
        <div className="flex items-center justify-between rounded-xl border border-danger/40 bg-danger/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Delete Trip</p>
            <p className="text-xs text-muted-foreground">Permanently delete all data.</p>
          </div>
          <Btn variant="danger" onClick={onDeleteTrip}><i className="fa-solid fa-trash" /> Delete</Btn>
        </div>
      </section>
    </div>
  );
}

function SettingsModal({
  trip, onClose, onSave, onCloseTrip, onDeleteTrip, onShare,
}: {
  trip: Trip;
  password: string;
  onClose: () => void;
  onSave: (name: string, mode: "auto" | "manual", cats: CustomCategory[]) => void;
  onCloseTrip: () => void;
  onDeleteTrip: () => void;
  onShare: () => void;
}) {
  return (
    <Modal open onClose={onClose} title="Trip Settings" subtitle={`ID: ${trip.tripId}`} icon={<i className="fa-solid fa-gear" />} size="lg">
      <SettingsBody trip={trip} onSave={onSave} onCloseTrip={onCloseTrip} onDeleteTrip={onDeleteTrip} onShare={onShare} />
    </Modal>
  );
}

function SettingsInline({
  trip, onSave, onCloseTrip, onDeleteTrip, onShare,
}: {
  trip: Trip;
  password: string;
  onSave: (name: string, mode: "auto" | "manual", cats: CustomCategory[]) => void;
  onCloseTrip: () => void;
  onDeleteTrip: () => void;
  onShare: () => void;
}) {
  return (
    <div>
      <h1 className="mb-4 font-heading text-2xl font-bold">Settings</h1>
      <div className="rounded-2xl border border-border bg-card p-5">
        <SettingsBody trip={trip} onSave={onSave} onCloseTrip={onCloseTrip} onDeleteTrip={onDeleteTrip} onShare={onShare} />
      </div>
    </div>
  );
}
