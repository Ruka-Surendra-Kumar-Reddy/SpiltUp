import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recomputeSettlements, shapeTrip } from "@/lib/spliitup";

/** DELETE /api/trips/[tripId]/handovers/[HandoverId] — delete a handover (owner only). */
export async function DELETE(req: Request, { params }: { params: Promise<{ tripId: string; HandoverId: string }> }) {
  try {
    const { tripId, HandoverId } = await params;
    const body = await req.json().catch(() => ({}));
    const trip = await db.trip.findUnique({ where: { tripId }, include: { handovers: true } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.isClosed) return NextResponse.json({ error: "Trip is closed." }, { status: 403 });

    const h = trip.handovers.find((x) => x.handoverId === HandoverId);
    if (!h) return NextResponse.json({ error: "Handover not found." }, { status: 404 });
    if (h.createdBy !== String(body.memberId || "")) {
      return NextResponse.json({ error: "Only the creator can delete this handover." }, { status: 403 });
    }

    await db.handover.delete({ where: { id: h.id } });
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
