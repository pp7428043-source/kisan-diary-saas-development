import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { farms, seasons } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const seasonSchema = z.object({
  cropName: z.string().min(1).max(100),
  startDate: z.string(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const { id: farmId } = await params;

    // Verify farm ownership
    const farm = await db.select().from(farms)
      .where(and(eq(farms.id, farmId), eq(farms.userId, user.id)))
      .limit(1);

    if (!farm.length) {
      return NextResponse.json(errorResponse("Farm not found"), { status: 404 });
    }

    const farmSeasons = await db.select().from(seasons)
      .where(eq(seasons.farmId, farmId))
      .orderBy(desc(seasons.createdAt));

    return NextResponse.json(successResponse(farmSeasons));
  } catch (error) {
    console.error("Get seasons error:", error);
    return NextResponse.json(errorResponse("Failed to get seasons"), { status: 500 });
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

    const { id: farmId } = await params;

    // Verify farm ownership
    const farm = await db.select().from(farms)
      .where(and(eq(farms.id, farmId), eq(farms.userId, user.id)))
      .limit(1);

    if (!farm.length) {
      return NextResponse.json(errorResponse("Farm not found"), { status: 404 });
    }

    const body = await request.json();
    const data = seasonSchema.parse(body);

    const [season] = await db.insert(seasons).values({
      farmId,
      cropName: data.cropName,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      notes: data.notes,
      status: "active",
    }).returning();

    return NextResponse.json(successResponse(season, "Season started"), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues;
      return NextResponse.json(errorResponse(issues[0]?.message ?? "Validation error"), { status: 400 });
    }
    console.error("Create season error:", error);
    return NextResponse.json(errorResponse("Failed to create season"), { status: 500 });
  }
}
