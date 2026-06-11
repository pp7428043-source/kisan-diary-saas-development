import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, seasons, farms } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const { id } = await params;

    const expense = await db
      .select({ expense: expenses, season: seasons, farm: farms })
      .from(expenses)
      .innerJoin(seasons, eq(expenses.seasonId, seasons.id))
      .innerJoin(farms, eq(seasons.farmId, farms.id))
      .where(eq(expenses.id, id))
      .limit(1);

    if (!expense.length || expense[0].farm.userId !== user.id) {
      return NextResponse.json(errorResponse("Expense not found"), { status: 404 });
    }

    await db.delete(expenses).where(eq(expenses.id, id));
    return NextResponse.json(successResponse(null, "Expense deleted"));
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json(errorResponse("Failed to delete expense"), { status: 500 });
  }
}
