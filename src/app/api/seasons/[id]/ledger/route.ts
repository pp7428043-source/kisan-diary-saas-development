import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, harvests, seasons, farms } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";

async function verifySeasonOwnership(seasonId: string, userId: string) {
  const result = await db
    .select({ season: seasons, farm: farms })
    .from(seasons)
    .innerJoin(farms, eq(seasons.farmId, farms.id))
    .where(eq(seasons.id, seasonId))
    .limit(1);

  if (!result.length || result[0].farm.userId !== userId) return null;
  return { season: result[0].season, farm: result[0].farm };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const { id: seasonId } = await params;
    const result = await verifySeasonOwnership(seasonId, user.id);
    if (!result) {
      return NextResponse.json(errorResponse("Season not found"), { status: 404 });
    }

    const [expenseList, harvestList] = await Promise.all([
      db.select().from(expenses).where(eq(expenses.seasonId, seasonId)),
      db.select().from(harvests).where(eq(harvests.seasonId, seasonId)),
    ]);

    const ledgerEntries = [
      ...expenseList.map(e => ({
        id: e.id,
        type: 'expense' as const,
        amount: e.amount,
        title: e.description || e.category,
        category: e.category,
        date: new Date(e.date).toISOString(),
        sourceId: e.id
      })),
      ...harvestList.map(h => ({
        id: h.id,
        type: 'income' as const,
        amount: h.totalIncome,
        title: h.buyerName || 'Fasal Bikri / Harvest Sale',
        unit: h.unit,
        category: 'harvest',
        quantity: h.quantity,
        date: new Date(h.date).toISOString(),
        sourceId: h.id
      }))
    ];

    ledgerEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(successResponse(ledgerEntries));
  } catch (error) {
    console.error("Ledger GET error:", error);
    return NextResponse.json(errorResponse("Failed to fetch ledger"), { status: 500 });
  }
}
