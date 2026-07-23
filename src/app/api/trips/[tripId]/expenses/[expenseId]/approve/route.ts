import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recomputeSettlements, shapeTrip } from "@/lib/spliitup";

/** POST /api/trips/[tripId]/expenses/[expenseId]/approve — approve pending (creator only). */
export async function POST(req: Request, { params }: { params: Promise<{ tripId: string; expenseId: string }> }) {
  try {
    const { tripId, expenseId } = await params;
    const body = await req.json().catch(() => ({}));
    const trip = await db.trip.findUnique({ where: { tripId }, include: { expenses: true } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.password !== String(body.password || "")) {
      return NextResponse.json({ error: "Invalid creator password." }, { status: 403 });
    }
    const exp = trip.expenses.find((e) => e.expenseId === expenseId);
    if (!exp) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    if (exp.status !== "pending") {
      return NextResponse.json({ error: "Expense is not pending." }, { status: 400 });
    }
    await db.expense.update({ where: { id: exp.id }, data: { status: "approved" } });
    await recomputeSettlements(tripId);
    const refreshed = await db.trip.findUnique({
      where: { tripId },
      include: { members: true, expenses: true, handovers: true, settlements: true },
    });
    return NextResponse.json({ trip: shapeTrip(refreshed!) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
