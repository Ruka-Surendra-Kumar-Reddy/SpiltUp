import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** POST /api/trips/[tripId]/join-request — submit a join request (member flow). */
export async function POST(req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const body = await req.json();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
    }
    const trip = await db.trip.findUnique({ where: { tripId } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.isClosed) {
      return NextResponse.json({ error: "Trip is closed. Cannot join." }, { status: 403 });
    }
    const pending = await db.pendingJoin.create({
      data: { tripId, name, phone },
    });
    return NextResponse.json({ ok: true, joinId: pending.id, message: "Join request submitted. Wait for the creator to approve." });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
