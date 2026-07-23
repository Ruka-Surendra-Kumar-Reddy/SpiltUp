import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genId, shapeTrip } from "@/lib/spliitup";

/** POST /api/trips/[tripId]/pending/[joinId]/approve — approve join (creator only). */
export async function POST(req: Request, { params }: { params: Promise<{ tripId: string; joinId: string }> }) {
  try {
    const { tripId, joinId } = await params;
    const body = await req.json().catch(() => ({}));
    const trip = await db.trip.findUnique({ where: { tripId } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.password !== String(body.password || "")) {
      return NextResponse.json({ error: "Invalid creator password." }, { status: 403 });
    }
    const pending = await db.pendingJoin.findFirst({ where: { id: joinId, tripId } });
    if (!pending) return NextResponse.json({ error: "Join request not found." }, { status: 404 });

    const memberId = genId("mem");
    const updated = await db.trip.update({
      where: { tripId },
      data: {
        members: { create: [{ memberId, name: pending.name, phone: pending.phone }] },
      },
      include: { members: true, expenses: true, handovers: true, settlements: true },
    });
    await db.pendingJoin.delete({ where: { id: joinId } });
    return NextResponse.json({ trip: shapeTrip(updated), memberId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
