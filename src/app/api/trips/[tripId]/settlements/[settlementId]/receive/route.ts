import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recomputeSettlements, shapeTrip } from "@/lib/spliitup";

/** POST /api/trips/[tripId]/settlements/[settlementId]/receive — receiver marks received → completed. */
export async function POST(req: Request, { params }: { params: Promise<{ tripId: string; settlementId: string }> }) {
  try {
    const { tripId, settlementId } = await params;
    const body = await req.json().catch(() => ({}));
    const memberId = String(body.memberId || "");
    const trip = await db.trip.findUnique({ where: { tripId }, include: { settlements: true } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

    const s = trip.settlements.find((x) => x.id === settlementId);
    if (!s) return NextResponse.json({ error: "Settlement not found." }, { status: 404 });
    if (s.toId !== memberId) {
      return NextResponse.json({ error: "Only the receiver can mark this as received." }, { status: 403 });
    }
    if (s.status !== "paid") {
      return NextResponse.json({ error: "Settlement must be marked paid first." }, { status: 400 });
    }
    await db.settlement.update({ where: { id: s.id }, data: { status: "completed" } });
    // completed settlements change balances → recompute pending suggestions
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
