import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, seasons, farms } from "@/db/schema";
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

    // Verify ownership through join
    const log = await db
      .select({ log: activityLogs, season: seasons, farm: farms })
      .from(activityLogs)
      .innerJoin(seasons, eq(activityLogs.seasonId, seasons.id))
      .innerJoin(farms, eq(seasons.farmId, farms.id))
      .where(eq(activityLogs.id, id))
      .limit(1);

    if (!log.length || log[0].farm.userId !== user.id) {
      return NextResponse.json(errorResponse("Log not found"), { status: 404 });
    }

    await db.delete(activityLogs).where(eq(activityLogs.id, id));
    return NextResponse.json(successResponse(null, "Log deleted"));
  } catch (error) {
    console.error("Delete log error:", error);
    return NextResponse.json(errorResponse("Failed to delete log"), { status: 500 });
  }
}
