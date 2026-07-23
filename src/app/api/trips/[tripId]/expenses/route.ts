import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genId, computeEqualSplits, round2, recomputeSettlements, shapeTrip } from "@/lib/spliitup";

/**
 * POST /api/trips/[tripId]/expenses — add an expense.
 * Body:
 *   memberId      — creator of the expense (must be a trip member)
 *   description, amount, category, paidBy
 *   splitType     — "equal" | "custom"
 *   reason        — required for equal
 *   explanation   — required for custom
 *   participants  — [memberId...] involved in the split
 *   customAmounts — { [memberId]: number } for custom split
 */
export async function POST(req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const body = await req.json();
    const trip = await db.trip.findUnique({ where: { tripId }, include: { members: true } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.isClosed) {
      return NextResponse.json({ error: "Trip is closed. Cannot add expenses." }, { status: 403 });
    }

    const memberId = String(body.memberId || "");
    const member = trip.members.find((m) => m.memberId === memberId);
    if (!member) return NextResponse.json({ error: "Invalid member." }, { status: 403 });

    const description = String(body.description || "").trim();
    const amount = Number(body.amount);
    const category = String(body.category || "misc");
    const paidBy = String(body.paidBy || "");
    const splitType = body.splitType === "custom" ? "custom" : "equal";
    const reason = String(body.reason || "").trim();
    const explanation = String(body.explanation || "").trim();
    const participants: string[] = Array.isArray(body.participants) ? body.participants.filter(Boolean) : [];
    const customAmounts: Record<string, number> = body.customAmounts || {};

    if (!description) return NextResponse.json({ error: "Description is required." }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
    if (!trip.members.find((m) => m.memberId === paidBy)) return NextResponse.json({ error: "Invalid payer." }, { status: 400 });
    if (participants.length === 0) return NextResponse.json({ error: "Select at least one participant." }, { status: 400 });

    // validate participants are members
    for (const p of participants) {
      if (!trip.members.find((m) => m.memberId === p)) {
        return NextResponse.json({ error: "Invalid participant: " + p }, { status: 400 });
      }
    }

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

    const expenseId = genId("exp");
    const status = trip.approvalMode === "manual" ? "pending" : "approved";
    const updated = await db.trip.update({
      where: { tripId },
      data: {
        expenses: {
          create: [
            {
              expenseId,
              description,
              amount: round2(amount),
              category,
              paidBy,
              splits,
              reason,
              splitType,
              explanation,
              status,
              createdBy: memberId,
            },
          ],
        },
      },
      include: { members: true, expenses: true, handovers: true, settlements: true },
    });

    if (status === "approved") await recomputeSettlements(tripId);
    const refreshed = await db.trip.findUnique({
      where: { tripId },
      include: { members: true, expenses: true, handovers: true, settlements: true },
    });
    return NextResponse.json({ trip: shapeTrip(refreshed || updated) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
