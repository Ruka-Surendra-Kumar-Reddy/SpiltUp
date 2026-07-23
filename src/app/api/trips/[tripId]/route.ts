import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shapeTrip } from "@/lib/spliitup";

/** GET /api/trips/[tripId] — fetch full trip (public read; join flow uses it). */
export async function GET(_req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const trip = await db.trip.findUnique({
      where: { tripId },
      include: { members: true, expenses: true, handovers: true, settlements: true },
    });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    return NextResponse.json({ trip: shapeTrip(trip) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

/** PATCH /api/trips/[tripId] — update settings (creator only). */
export async function PATCH(req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const body = await req.json();
    const trip = await db.trip.findUnique({ where: { tripId } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.password !== String(body.password || "")) {
      return NextResponse.json({ error: "Invalid creator password." }, { status: 403 });
    }

    const data: any = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (body.approvalMode === "auto" || body.approvalMode === "manual") data.approvalMode = body.approvalMode;
    if (Array.isArray(body.customCategories)) data.customCategories = body.customCategories;

    const updated = await db.trip.update({
      where: { tripId },
      data,
      include: { members: true, expenses: true, handovers: true, settlements: true },
    });
    return NextResponse.json({ trip: shapeTrip(updated) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

/** DELETE /api/trips/[tripId] — delete trip (creator only). */
export async function DELETE(req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const body = await req.json().catch(() => ({}));
    const trip = await db.trip.findUnique({ where: { tripId } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.password !== String(body.password || "")) {
      return NextResponse.json({ error: "Invalid creator password." }, { status: 403 });
    }
    await db.trip.delete({ where: { tripId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
