import { NextRequest, NextResponse } from "next/server";
import { db, hasDatabase } from "@/db";
import { farms } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  localDeleteFarm,
  localFindFarmById,
  localUpdateFarm,
} from "@/lib/local-auth-store";

const farmSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sizeAcre: z.number().positive().optional(),
  location: z.string().min(1).max(200).optional(),
});

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
    const body = await request.json();
    const data = farmSchema.parse(body);

    if (!hasDatabase || !db) {
      const updated = await localUpdateFarm(id, user.id, data);
      if (!updated) {
        return NextResponse.json(errorResponse("Farm not found"), { status: 404 });
      }
      return NextResponse.json(successResponse({ ...updated, activeSeason: null }, "Farm updated"));
    }

    const [updated] = await db
      .update(farms)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(farms.id, id), eq(farms.userId, user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json(errorResponse("Farm not found"), { status: 404 });
    }

    return NextResponse.json(successResponse(updated, "Farm updated"));
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues;
      return NextResponse.json(errorResponse(issues[0]?.message ?? "Validation error"), { status: 400 });
    }
    console.error("Update farm error:", error);
    return NextResponse.json(errorResponse("Failed to update farm"), { status: 500 });
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

    if (!hasDatabase || !db) {
      const deleted = await localDeleteFarm(id, user.id);
      if (!deleted) {
        return NextResponse.json(errorResponse("Farm not found"), { status: 404 });
      }
      return NextResponse.json(successResponse(null, "Farm deleted"));
    }

    const [deleted] = await db
      .delete(farms)
      .where(and(eq(farms.id, id), eq(farms.userId, user.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json(errorResponse("Farm not found"), { status: 404 });
    }

    return NextResponse.json(successResponse(null, "Farm deleted"));
  } catch (error) {
    console.error("Delete farm error:", error);
    return NextResponse.json(errorResponse("Failed to delete farm"), { status: 500 });
  }
}
