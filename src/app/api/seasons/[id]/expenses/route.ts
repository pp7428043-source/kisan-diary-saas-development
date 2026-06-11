import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, seasons, farms } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { eq, desc, sum } from "drizzle-orm";
import { z } from "zod";

const expenseSchema = z.object({
  category: z.enum(["beej", "khad", "dawai", "majdoor", "machinary", "other"]),
  amount: z.number().positive(),
  date: z.string().optional(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
});

async function verifySeasonOwnership(seasonId: string, userId: string) {
  const result = await db
    .select({ season: seasons, farm: farms })
    .from(seasons)
    .innerJoin(farms, eq(seasons.farmId, farms.id))
    .where(eq(seasons.id, seasonId))
    .limit(1);

  if (!result.length || result[0].farm.userId !== userId) return null;
  return result[0].season;
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
    const season = await verifySeasonOwnership(seasonId, user.id);
    if (!season) {
      return NextResponse.json(errorResponse("Season not found"), { status: 404 });
    }

    const url = new URL(request.url);
    const isSummary = url.searchParams.get("summary") === "true";

    if (isSummary) {
      // Get summary by category
      const allExpenses = await db
        .select()
        .from(expenses)
        .where(eq(expenses.seasonId, seasonId));

      const summary = allExpenses.reduce((acc, exp) => {
        const cat = exp.category;
        if (!acc[cat]) acc[cat] = 0;
        acc[cat] += exp.amount;
        return acc;
      }, {} as Record<string, number>);

      const total = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      return NextResponse.json(successResponse({ summary, total, count: allExpenses.length }));
    }

    const expenseList = await db
      .select()
      .from(expenses)
      .where(eq(expenses.seasonId, seasonId))
      .orderBy(desc(expenses.date));

    void sum;
    return NextResponse.json(successResponse(expenseList));
  } catch (error) {
    console.error("Get expenses error:", error);
    return NextResponse.json(errorResponse("Failed to get expenses"), { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const { id: seasonId } = await params;
    const season = await verifySeasonOwnership(seasonId, user.id);
    if (!season) {
      return NextResponse.json(errorResponse("Season not found"), { status: 404 });
    }

    const body = await request.json();
    const data = expenseSchema.parse(body);

    const [expense] = await db.insert(expenses).values({
      seasonId,
      category: data.category,
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
      description: data.description,
      receiptUrl: data.receiptUrl,
    }).returning();

    return NextResponse.json(successResponse(expense, "Expense added"), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues;
      return NextResponse.json(errorResponse(issues[0]?.message ?? "Validation error"), { status: 400 });
    }
    console.error("Create expense error:", error);
    return NextResponse.json(errorResponse("Failed to add expense"), { status: 500 });
  }
}
