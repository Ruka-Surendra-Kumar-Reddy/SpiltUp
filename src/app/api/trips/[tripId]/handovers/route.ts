import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genId, round2, recomputeSettlements, shapeTrip } from "@/lib/spliitup";

/**
 * POST /api/trips/[tripId]/handovers — add a handover (cash transfer).
 * Body: memberId (creator of handover), fromId, toId, amount, note
 */
export async function POST(req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const body = await req.json();
    const trip = await db.trip.findUnique({ where: { tripId }, include: { members: true } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.isClosed) {
      return NextResponse.json({ error: "Trip is closed. Cannot add handovers." }, { status: 403 });
    }

    const memberId = String(body.memberId || "");
    if (!trip.members.find((m) => m.memberId === memberId)) {
      return NextResponse.json({ error: "Invalid member." }, { status: 403 });
    }
    const fromId = String(body.fromId || "");
    const toId = String(body.toId || "");
    const amount = Number(body.amount);
    const note = String(body.note || "").trim();

    if (!trip.members.find((m) => m.memberId === fromId)) return NextResponse.json({ error: "Invalid sender." }, { status: 400 });
    if (!trip.members.find((m) => m.memberId === toId)) return NextResponse.json({ error: "Invalid receiver." }, { status: 400 });
    if (fromId === toId) return NextResponse.json({ error: "Sender and receiver must differ." }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Amount must be positive." }, { status: 400 });

    const handoverId = genId("hnd");
    await db.trip.update({
      where: { tripId },
      data: {
        handovers: {
          create: [{ handoverId, fromId, toId, amount: round2(amount), note, createdBy: memberId }],
        },
      },
    });
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
