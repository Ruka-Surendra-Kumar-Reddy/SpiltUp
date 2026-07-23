import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** DELETE /api/trips/[tripId]/pending/[joinId] — reject a join request (creator only). */
export async function DELETE(req: Request, { params }: { params: Promise<{ tripId: string; joinId: string }> }) {
  try {
    const { tripId, joinId } = await params;
    const body = await req.json().catch(() => ({}));
    const trip = await db.trip.findUnique({ where: { tripId } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.password !== String(body.password || "")) {
      return NextResponse.json({ error: "Invalid creator password." }, { status: 403 });
    }
    await db.pendingJoin.deleteMany({ where: { id: joinId, tripId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
