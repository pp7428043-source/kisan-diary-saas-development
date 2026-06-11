import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, seasons, farms } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateLogSchema = z.object({
  activityType: z.enum(["paani", "dawai", "beej", "majdoor", "other"]).optional(),
  date: z.string().optional(),
  note: z.string().optional(),
  photoUrl: z.string().optional(),
  workers: z.number().int().positive().optional(),
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
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const { id: seasonId, logId } = await params;
    const season = await verifySeasonOwnership(seasonId, user.id);
    if (!season) {
      return NextResponse.json(errorResponse("Season not found"), { status: 404 });
    }

    // Verify log exists and belongs to season
    const existingLogs = await db
      .select()
      .from(activityLogs)
      .where(and(eq(activityLogs.id, logId), eq(activityLogs.seasonId, seasonId)))
      .limit(1);

    if (!existingLogs.length) {
      return NextResponse.json(errorResponse("Log not found"), { status: 404 });
    }

    const body = await request.json();
    const data = updateLogSchema.parse(body);

    const updateData: any = {};
    if (data.activityType !== undefined) updateData.activityType = data.activityType;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.note !== undefined) updateData.note = data.note;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.workers !== undefined) updateData.workers = data.workers;

    const [updatedLog] = await db
      .update(activityLogs)
      .set(updateData)
      .where(eq(activityLogs.id, logId))
      .returning();

    return NextResponse.json(successResponse(updatedLog, "Activity log updated"), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues;
      return NextResponse.json(errorResponse(issues[0]?.message ?? "Validation error"), { status: 400 });
    }
    console.error("Update log error:", error);
    return NextResponse.json(errorResponse("Failed to update log"), { status: 500 });
  }
}
