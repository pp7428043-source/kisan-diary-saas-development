import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { seasons, farms } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  cropName: z.string().min(1).max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
  notes: z.string().optional(),
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const { id } = await params;
    const season = await verifySeasonOwnership(id, user.id);
    if (!season) {
      return NextResponse.json(errorResponse("Season not found"), { status: 404 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    const [updated] = await db
      .update(seasons)
      .set(updateData)
      .where(eq(seasons.id, id))
      .returning();

    return NextResponse.json(successResponse(updated, "Season updated"));
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues;
      return NextResponse.json(errorResponse(issues[0]?.message ?? "Validation error"), { status: 400 });
    }
    console.error("Update season error:", error);
    return NextResponse.json(errorResponse("Failed to update season"), { status: 500 });
  }
}

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
    const season = await verifySeasonOwnership(id, user.id);
    if (!season) {
      return NextResponse.json(errorResponse("Season not found"), { status: 404 });
    }

    await db.delete(seasons).where(eq(seasons.id, id));
    return NextResponse.json(successResponse(null, "Season deleted"));
  } catch (error) {
    console.error("Delete season error:", error);
    return NextResponse.json(errorResponse("Failed to delete season"), { status: 500 });
  }
}
