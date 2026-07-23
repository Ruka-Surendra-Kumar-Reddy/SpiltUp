import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shapeTrip } from "@/lib/spliitup";

/** DELETE /api/trips/[tripId]/members/[memberId] — remove a member (creator only). */
export async function DELETE(req: Request, { params }: { params: Promise<{ tripId: string; memberId: string }> }) {
  try {
    const { tripId, memberId } = await params;
    const body = await req.json().catch(() => ({}));
    const trip = await db.trip.findUnique({
      where: { tripId },
      include: {
        members: { orderBy: { joinedAt: "asc" } },
        expenses: true,
        handovers: true,
        settlements: true,
      },
    });
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    if (trip.password !== String(body.password || "")) {
      return NextResponse.json({ error: "Only the creator can remove members." }, { status: 403 });
    }
    if (trip.isClosed) return NextResponse.json({ error: "Trip is closed." }, { status: 403 });

    const member = trip.members.find((m) => m.memberId === memberId);
    if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });
    if (trip.members[0].memberId === memberId) {
      return NextResponse.json({ error: "The trip creator cannot be removed." }, { status: 400 });
    }

    // Removing a member who's part of any money movement would corrupt balances.
    const involved =
      trip.expenses.some(
        (e: any) => e.paidBy === memberId || e.createdBy === memberId || (e.splits ?? []).some((s: any) => s.memberId === memberId)
      ) ||
      trip.handovers.some((h) => h.fromId === memberId || h.toId === memberId || h.createdBy === memberId) ||
      trip.settlements.some((s) => s.fromId === memberId || s.toId === memberId);
    if (involved) {
      return NextResponse.json(
        { error: `${member.name} is part of expenses, handovers, or settlements. Remove those entries first.` },
        { status: 400 }
      );
    }

    await db.member.delete({ where: { id: member.id } });
    const refreshed = await db.trip.findUnique({
      where: { tripId },
      include: { members: true, expenses: true, handovers: true, settlements: true },
    });
    return NextResponse.json({ trip: shapeTrip(refreshed) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
