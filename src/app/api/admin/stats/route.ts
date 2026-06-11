import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, activityLogs, farms, seasons } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { count, gte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [newToday] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, oneDayAgo));
    const [newThisWeek] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, sevenDaysAgo));
    const [totalFarms] = await db.select({ count: count() }).from(farms);
    const [totalSeasons] = await db.select({ count: count() }).from(seasons);
    const [totalLogs] = await db.select({ count: count() }).from(activityLogs);

    // DAU: users who logged activity in last 24h (approximate)
    const dauQuery = await db
      .selectDistinct({ userId: activityLogs.seasonId })
      .from(activityLogs)
      .where(gte(activityLogs.createdAt, oneDayAgo));

    // MAU: users who logged activity in last 30 days
    const mauQuery = await db
      .selectDistinct({ userId: activityLogs.seasonId })
      .from(activityLogs)
      .where(gte(activityLogs.createdAt, thirtyDaysAgo));

    // State distribution
    const stateDistribution = await db
      .select({
        state: users.state,
        count: count(),
      })
      .from(users)
      .groupBy(users.state)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    // Language distribution
    const languageDistribution = await db
      .select({
        language: users.language,
        count: count(),
      })
      .from(users)
      .groupBy(users.language);

    // New users by day (last 30 days)
    const userGrowth = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        count: count(),
      })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    return NextResponse.json(
      successResponse({
        overview: {
          totalUsers: totalUsers.count,
          newToday: newToday.count,
          newThisWeek: newThisWeek.count,
          dau: dauQuery.length,
          mau: mauQuery.length,
          totalFarms: totalFarms.count,
          totalSeasons: totalSeasons.count,
          totalLogs: totalLogs.count,
        },
        stateDistribution,
        languageDistribution,
        userGrowth,
      })
    );
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(errorResponse("Failed to get stats"), { status: 500 });
  }
}
