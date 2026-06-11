import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, seasons, farms, expenses } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const logSchema = z.object({
  activityType: z.enum(["paani", "dawai", "beej", "majdoor", "other"]),
  date: z.string().optional(),
  note: z.string().optional(),
  photoUrl: z.string().optional(),
  workers: z.number().int().positive().optional(),
  amount: z.number().positive().optional(),
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
    const activityType = url.searchParams.get("type");

    const query = db.select().from(activityLogs).where(eq(activityLogs.seasonId, seasonId));

    const logs = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.seasonId, seasonId))
      .orderBy(desc(activityLogs.date));

    const filteredLogs = activityType
      ? logs.filter((l) => l.activityType === activityType)
      : logs;

    void query;
    return NextResponse.json(successResponse(filteredLogs));
  } catch (error) {
    console.error("Get logs error:", error);
    return NextResponse.json(errorResponse("Failed to get logs"), { status: 500 });
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
    const data = logSchema.parse(body);

    const [log] = await db.insert(activityLogs).values({
      seasonId,
      activityType: data.activityType,
      date: data.date ? new Date(data.date) : new Date(),
      note: data.note,
      photoUrl: data.photoUrl,
      workers: data.workers,
    }).returning();

    if (data.amount) {
      let expenseCategory: "beej" | "khad" | "dawai" | "majdoor" | "machinary" | "other" = "other";
      if (data.activityType === "beej") expenseCategory = "beej";
      else if (data.activityType === "dawai") expenseCategory = "dawai";
      else if (data.activityType === "majdoor") expenseCategory = "majdoor";

      await db.insert(expenses).values({
        seasonId,
        date: data.date ? new Date(data.date) : new Date(),
        category: expenseCategory,
        amount: data.amount,
        description: data.note ? `${data.activityType} - ${data.note}` : `Auto-added from ${data.activityType} log`,
      });
    }

    return NextResponse.json(successResponse(log, "Activity logged"), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues;
      return NextResponse.json(errorResponse(issues[0]?.message ?? "Validation error"), { status: 400 });
    }
    console.error("Create log error:", error);
    return NextResponse.json(errorResponse("Failed to log activity"), { status: 500 });
  }
}
