import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genId, shapeTrip } from "@/lib/spliitup";

/** POST /api/trips/[tripId]/members — add a member directly (creator only). */
export async function POST(req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const body = await req.json();
    const trip = await db.trip.findUnique({ where: { tripId }, include: { members: true } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.password !== String(body.password || "")) {
      return NextResponse.json({ error: "Invalid creator password." }, { status: 403 });
    }
    if (trip.isClosed) {
      return NextResponse.json({ error: "Trip is closed. Cannot add members." }, { status: 403 });
    }
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
    }
    // Guard against double-submits (e.g. clicking Add twice during a slow request).
    if (trip.members.some((m) => m.name.toLowerCase() === name.toLowerCase() && m.phone === phone)) {
      return NextResponse.json({ error: `${name} (${phone}) is already a member of this trip.` }, { status: 409 });
    }
    const memberId = genId("mem");
    const updated = await db.trip.update({
      where: { tripId },
      data: { members: { create: [{ memberId, name, phone }] } },
      include: { members: true, expenses: true, handovers: true, settlements: true },
    });
    return NextResponse.json({ trip: shapeTrip(updated), memberId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
