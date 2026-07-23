import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shapeTrip } from "@/lib/spliitup";

/** POST /api/trips/[tripId]/close — close the trip (creator only). */
export async function POST(req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const body = await req.json().catch(() => ({}));
    const trip = await db.trip.findUnique({ where: { tripId } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.password !== String(body.password || "")) {
      return NextResponse.json({ error: "Invalid creator password." }, { status: 403 });
    }
    const updated = await db.trip.update({
      where: { tripId },
      data: { isClosed: true },
      include: { members: true, expenses: true, handovers: true, settlements: true },
    });
    return NextResponse.json({ trip: shapeTrip(updated) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
