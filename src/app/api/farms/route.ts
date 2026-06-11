import { NextRequest, NextResponse } from "next/server";
import { db, hasDatabase } from "@/db";
import { farms, seasons } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import {
  localCreateFarm,
  localFindLatestSeasonByFarmId,
  localListFarms,
} from "@/lib/local-auth-store";

const farmSchema = z.object({
  name: z.string().min(1).max(100),
  sizeAcre: z.number().positive(),
  location: z.string().min(1).max(200),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    if (!hasDatabase || !db) {
      const userFarms = await localListFarms(user.id);
      const farmsWithSeasons = await Promise.all(
        userFarms
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(async (farm) => ({
            ...farm,
            activeSeason: await localFindLatestSeasonByFarmId(farm.id),
          }))
      );

      return NextResponse.json(successResponse(farmsWithSeasons));
    }

    const userFarms = await db
      .select()
      .from(farms)
      .where(eq(farms.userId, user.id))
      .orderBy(desc(farms.createdAt));

    // Get active seasons for each farm
    const farmsWithSeasons = await Promise.all(
      userFarms.map(async (farm) => {
        const activeSeasons = await db
          .select()
          .from(seasons)
          .where(eq(seasons.farmId, farm.id))
          .orderBy(desc(seasons.createdAt))
          .limit(1);
        return { ...farm, activeSeason: activeSeasons[0] || null };
      })
    );

    return NextResponse.json(successResponse(farmsWithSeasons));
  } catch (error) {
    console.error("Get farms error:", error);
    return NextResponse.json(errorResponse("Failed to get farms"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const body = await request.json();
    const data = farmSchema.parse(body);

    if (!hasDatabase || !db) {
      const farm = await localCreateFarm({
        userId: user.id,
        ...data,
      });
      return NextResponse.json(
        successResponse({ ...farm, activeSeason: null }, "Farm created successfully"),
        { status: 201 }
      );
    }

    const [farm] = await db.insert(farms).values({
      userId: user.id,
      ...data,
    }).returning();

    return NextResponse.json(successResponse(farm, "Farm created successfully"), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues;
      return NextResponse.json(errorResponse(issues[0]?.message ?? "Validation error"), { status: 400 });
    }
    console.error("Create farm error:", error);
    return NextResponse.json(errorResponse("Failed to create farm"), { status: 500 });
  }
}
