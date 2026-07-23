import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/trips/[tripId]/pending — list pending join requests (creator only). */
export async function GET(req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";
    const trip = await db.trip.findUnique({ where: { tripId } });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.password !== password) {
      return NextResponse.json({ error: "Invalid creator password." }, { status: 403 });
    }
    const pending = await db.pendingJoin.findMany({ where: { tripId }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ pending });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
