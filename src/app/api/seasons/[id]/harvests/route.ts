import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { harvests, seasons, farms } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const harvestSchema = z.object({
  quantity: z.number().positive(),
  unit: z.enum(["quintal", "kg", "ton"]),
  pricePerUnit: z.number().positive(),
  date: z.string().optional(),
  buyerName: z.string().optional(),
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

    const harvestList = await db
      .select()
      .from(harvests)
      .where(eq(harvests.seasonId, seasonId))
      .orderBy(desc(harvests.date));

    return NextResponse.json(successResponse(harvestList));
  } catch (error) {
    console.error("Get harvests error:", error);
    return NextResponse.json(errorResponse("Failed to get harvests"), { status: 500 });
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
    const data = harvestSchema.parse(body);

    const totalIncome = data.quantity * data.pricePerUnit;

    const [harvest] = await db.insert(harvests).values({
      seasonId,
      quantity: data.quantity,
      unit: data.unit,
      pricePerUnit: data.pricePerUnit,
      totalIncome,
      date: data.date ? new Date(data.date) : new Date(),
      buyerName: data.buyerName,
    }).returning();

    return NextResponse.json(successResponse(harvest, "Harvest logged"), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues;
      return NextResponse.json(errorResponse(issues[0]?.message ?? "Validation error"), { status: 400 });
    }
    console.error("Create harvest error:", error);
    return NextResponse.json(errorResponse("Failed to log harvest"), { status: 500 });
  }
}
