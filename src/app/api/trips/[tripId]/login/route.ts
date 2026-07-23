import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** POST /api/trips/[tripId]/login — creator login with password. */
export async function POST(req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const body = await req.json();
    const password = String(body.password || "");
    const trip = await db.trip.findUnique({ where: { tripId }, include: { members: true } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.password !== password) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
    }
    const creator = trip.members[0];
    return NextResponse.json({ memberId: creator.memberId, role: "creator" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
