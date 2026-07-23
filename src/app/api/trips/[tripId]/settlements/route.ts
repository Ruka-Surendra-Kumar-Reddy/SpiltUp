import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recomputeSettlements, shapeTrip, computeBalances } from "@/lib/spliitup";

/** GET /api/trips/[tripId]/settlements — list settlements + live balances. */
export async function GET(_req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const trip = await db.trip.findUnique({
      where: { tripId },
      include: { members: true, expenses: true, handovers: true, settlements: true },
    });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    const balances = computeBalances({
      members: trip.members,
      expenses: trip.expenses,
      handovers: trip.handovers,
      settlements: trip.settlements,
    });
    return NextResponse.json({
      trip: shapeTrip(trip),
      balances: balances.map((b) => ({
        memberId: b.memberId,
        paid: b.paid,
        share: b.share,
        handoverGiven: b.handoverGiven,
        handoverReceived: b.handoverReceived,
        settlementGiven: b.settlementGiven,
        settlementReceived: b.settlementReceived,
        net: b.net,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

/** POST /api/trips/[tripId]/settlements — recompute settlements (creator only). */
export async function POST(req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const body = await req.json().catch(() => ({}));
    const trip = await db.trip.findUnique({ where: { tripId } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.password !== String(body.password || "")) {
      return NextResponse.json({ error: "Invalid creator password." }, { status: 403 });
    }
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
