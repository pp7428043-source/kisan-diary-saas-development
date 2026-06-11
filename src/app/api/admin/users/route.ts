import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, farms, activityLogs, seasons } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { eq, ilike, desc, count, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const state = url.searchParams.get("state") || "";
    const language = url.searchParams.get("language") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(ilike(users.name, `%${search}%`));
    }
    if (state) {
      conditions.push(eq(users.state, state));
    }

    const query = conditions.length > 0 ? and(...conditions) : undefined;

    const userList = await db
      .select()
      .from(users)
      .where(query)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ count: count() }).from(users).where(query);

    // Get farm counts for each user
    const usersWithStats = await Promise.all(
      userList.map(async (u) => {
        const [farmCount] = await db
          .select({ count: count() })
          .from(farms)
          .where(eq(farms.userId, u.id));

        const [logCount] = await db
          .select({ count: count() })
          .from(activityLogs)
          .innerJoin(seasons, eq(activityLogs.seasonId, seasons.id))
          .innerJoin(farms, eq(seasons.farmId, farms.id))
          .where(eq(farms.userId, u.id));

        return {
          ...u,
          farmCount: farmCount.count,
          logCount: logCount.count,
        };
      })
    );

    void language;

    return NextResponse.json(
      successResponse({
        users: usersWithStats,
        pagination: {
          total: total.count,
          page,
          limit,
          totalPages: Math.ceil(total.count / limit),
        },
      })
    );
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(errorResponse("Failed to get users"), { status: 500 });
  }
}
