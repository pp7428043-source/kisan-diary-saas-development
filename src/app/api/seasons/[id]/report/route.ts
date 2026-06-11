import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, expenses, harvests, seasons, farms } from "@/db/schema";
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

    const { season, farm } = result;

    // Get all data
    const [logs, expenseList, harvestList] = await Promise.all([
      db.select().from(activityLogs).where(eq(activityLogs.seasonId, seasonId)),
      db.select().from(expenses).where(eq(expenses.seasonId, seasonId)),
      db.select().from(harvests).where(eq(harvests.seasonId, seasonId)),
    ]);

    // Calculate expense summary by category
    const expenseSummary = expenseList.reduce((acc, exp) => {
      const cat = exp.category;
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += exp.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalExpense = expenseList.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = harvestList.reduce((sum, h) => sum + h.totalIncome, 0);
    const netProfitLoss = totalIncome - totalExpense;

    // Activity type breakdown
    const activitySummary = logs.reduce((acc, log) => {
      const type = log.activityType;
      if (!acc[type]) acc[type] = 0;
      acc[type]++;
      return acc;
    }, {} as Record<string, number>);

    // Weekly activity chart data
    const weeklyData: Record<string, number> = {};
    logs.forEach((log) => {
      const date = new Date(log.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split("T")[0];
      if (!weeklyData[key]) weeklyData[key] = 0;
      weeklyData[key]++;
    });

    const weeklyChartData = Object.entries(weeklyData)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Unique working days
    const workingDays = new Set(
      logs.map((l) => new Date(l.date).toISOString().split("T")[0])
    ).size;

    // Expense pie chart data
    const expensePieData = Object.entries(expenseSummary).map(([name, value]) => ({
      name,
      value,
    }));

    return NextResponse.json(
      successResponse({
        season,
        farm,
        summary: {
          totalExpense,
          totalIncome,
          netProfitLoss,
          isProfit: netProfitLoss >= 0,
          workingDays,
          totalLogs: logs.length,
          totalHarvests: harvestList.length,
        },
        expenseSummary,
        expensePieData,
        activitySummary,
        weeklyChartData,
        logs,
        expenses: expenseList,
        harvests: harvestList,
      })
    );
  } catch (error) {
    console.error("Get report error:", error);
    return NextResponse.json(errorResponse("Failed to generate report"), { status: 500 });
  }
}
