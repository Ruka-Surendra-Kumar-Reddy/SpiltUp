import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genTripId, genId, shapeTrip } from "@/lib/spliitup";

/** POST /api/trips — create a trip (creator is the first member). */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const password = String(body.password || "").trim();
    const creatorName = String(body.creatorName || "").trim();
    const creatorPhone = String(body.creatorPhone || "").trim();
    const approvalMode = body.approvalMode === "manual" ? "manual" : "auto";

    if (!name || !password || !creatorName || !creatorPhone) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });
    }

    let tripId = genTripId();
    while (await db.trip.findUnique({ where: { tripId } })) tripId = genTripId();

    const creatorMemberId = genId("mem");
    const trip = await db.trip.create({
      data: {
        tripId,
        name,
        password,
        approvalMode,
        customCategories: [],
        members: {
          create: [{ memberId: creatorMemberId, name: creatorName, phone: creatorPhone }],
        },
      },
      include: { members: true, expenses: true, handovers: true, settlements: true },
    });

    return NextResponse.json({ trip: shapeTrip(trip), memberId: creatorMemberId, role: "creator" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
