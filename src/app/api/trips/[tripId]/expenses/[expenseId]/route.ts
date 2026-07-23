import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeEqualSplits, round2, recomputeSettlements, shapeTrip } from "@/lib/spliitup";

async function refresh(tripId: string) {
  const t = await db.trip.findUnique({
    where: { tripId },
    include: { members: true, expenses: true, handovers: true, settlements: true },
  });
  return t ? shapeTrip(t) : null;
}

/** PATCH /api/trips/[tripId]/expenses/[expenseId] — edit (owner only). */
export async function PATCH(req: Request, { params }: { params: Promise<{ tripId: string; expenseId: string }> }) {
  try {
    const { tripId, expenseId } = await params;
    const body = await req.json();
    const trip = await db.trip.findUnique({ where: { tripId }, include: { members: true, expenses: true } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.isClosed) return NextResponse.json({ error: "Trip is closed." }, { status: 403 });

    const exp = trip.expenses.find((e) => e.expenseId === expenseId);
    if (!exp) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    if (exp.createdBy !== String(body.memberId || "")) {
      return NextResponse.json({ error: "Only the creator can edit this expense." }, { status: 403 });
    }
    if (exp.status !== "approved") {
      return NextResponse.json({ error: "Only approved expenses can be edited." }, { status: 400 });
    }

    const description = String(body.description || exp.description).trim();
    const amount = Number(body.amount ?? exp.amount);
    const category = String(body.category || exp.category);
    const paidBy = String(body.paidBy || exp.paidBy);
    const splitType = body.splitType === "custom" ? "custom" : "equal";
    const reason = String(body.reason ?? exp.reason).trim();
    const explanation = String(body.explanation ?? exp.explanation).trim();
    const participants: string[] = Array.isArray(body.participants) ? body.participants.filter(Boolean) : exp.splits.map((s: any) => s.memberId);
    const customAmounts: Record<string, number> = body.customAmounts || {};

    if (!description) return NextResponse.json({ error: "Description is required." }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Amount must be positive." }, { status: 400 });
    if (!trip.members.find((m) => m.memberId === paidBy)) return NextResponse.json({ error: "Invalid payer." }, { status: 400 });
    if (participants.length === 0) return NextResponse.json({ error: "Select at least one participant." }, { status: 400 });

    let splits: { memberId: string; amount: number }[] = [];
    if (splitType === "equal") {
      if (!reason) return NextResponse.json({ error: "Reason is required for equal split." }, { status: 400 });
      splits = computeEqualSplits(amount, participants);
    } else {
      if (!explanation) return NextResponse.json({ error: "Explanation is required for custom split." }, { status: 400 });
      splits = participants.map((p) => ({ memberId: p, amount: round2(Number(customAmounts[p] || 0)) }));
      const sum = round2(splits.reduce((a, s) => a + s.amount, 0));
      if (Math.abs(sum - round2(amount)) > 0.01) {
        return NextResponse.json({ error: `Custom amounts (₹${sum}) must equal the total (₹${round2(amount)}).` }, { status: 400 });
      }
    }

    await db.expense.update({
      where: { id: exp.id },
      data: { description, amount: round2(amount), category, paidBy, splits, reason, splitType, explanation },
    });
    await recomputeSettlements(tripId);
    return NextResponse.json({ trip: await refresh(tripId) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

/** DELETE /api/trips/[tripId]/expenses/[expenseId] — delete (owner only). */
export async function DELETE(req: Request, { params }: { params: Promise<{ tripId: string; expenseId: string }> }) {
  try {
    const { tripId, expenseId } = await params;
    const body = await req.json().catch(() => ({}));
    const trip = await db.trip.findUnique({ where: { tripId }, include: { expenses: true } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.isClosed) return NextResponse.json({ error: "Trip is closed." }, { status: 403 });

    const exp = trip.expenses.find((e) => e.expenseId === expenseId);
    if (!exp) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    if (exp.createdBy !== String(body.memberId || "")) {
      return NextResponse.json({ error: "Only the creator can delete this expense." }, { status: 403 });
    }

    await db.expense.delete({ where: { id: exp.id } });
    if (exp.status === "approved") await recomputeSettlements(tripId);
    return NextResponse.json({ trip: await refresh(tripId) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
